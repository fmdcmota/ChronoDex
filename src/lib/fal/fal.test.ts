/**
 * Unit tests for src/lib/fal: runFal's queue handling, the model registry, the voice catalogue and
 * the three public functions. Owner: Agent 2 (Studio). Task A2-07. No test calls fal: runFal takes a
 * fake queue, and the public functions are tested on their input checks and mock mode only.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MODELS } from './models';
import { runFal, FalStageError, type FalQueueLike } from './run';
import { synthesizeSpeech, transcribe, uploadToFal, MAX_TTS_CHARACTERS, MOCK_TRANSCRIPT_TEXT, resetMockWarning, warnIfMocksShadowKey } from './index';
import { VOICE_CATALOG, getVoice } from './voices';

/** Build a fake queue that reports the given statuses in order, then returns `data`. */
function fakeQueue(statuses: string[], data: unknown = { ok: true }): FalQueueLike & { calls: string[] } {
  const calls: string[] = [];
  let i = 0;
  return {
    calls,
    async submit() {
      calls.push('submit');
      return { request_id: 'req-1' };
    },
    async status() {
      calls.push('status');
      return { status: statuses[Math.min(i++, statuses.length - 1)] };
    },
    async result() {
      calls.push('result');
      return { data };
    },
  };
}

describe('runFal', () => {
  it('submits, saves the request id before polling, then returns the data', async () => {
    const queue = fakeQueue(['IN_QUEUE', 'IN_PROGRESS', 'COMPLETED'], { images: [] });
    const saved: string[] = [];
    const result = await runFal('some/endpoint', { prompt: 'x' }, {
      queue,
      pollIntervalMs: 0,
      onRequestId: (id) => {
        saved.push(id);
        // The id must be saved before the first status check.
        expect(queue.calls).toEqual(['submit']);
      },
    });
    expect(saved).toEqual(['req-1']);
    expect(result).toMatchObject({ data: { images: [] }, requestId: 'req-1', endpoint: 'some/endpoint' });
    expect(queue.calls).toEqual(['submit', 'status', 'status', 'status', 'result']);
  });

  it('resumes a saved request id without submitting again', async () => {
    const queue = fakeQueue(['COMPLETED']);
    const onRequestId = vi.fn();
    const result = await runFal('e', {}, { queue, resumeRequestId: 'saved-9', onRequestId, pollIntervalMs: 0 });
    expect(result.requestId).toBe('saved-9');
    expect(queue.calls).toEqual(['status', 'result']);
    expect(onRequestId).not.toHaveBeenCalled();
  });

  it('calls onPoll after every status check', async () => {
    const onPoll = vi.fn();
    await runFal('e', {}, { queue: fakeQueue(['IN_PROGRESS', 'IN_PROGRESS', 'COMPLETED']), onPoll, pollIntervalMs: 0 });
    expect(onPoll).toHaveBeenCalledTimes(3);
  });

  it('wraps a submit failure with the endpoint, status and body', async () => {
    const queue: FalQueueLike = {
      async submit() {
        throw Object.assign(new Error('Unprocessable'), { status: 422, body: { detail: 'bad field' } });
      },
      async status() {
        throw new Error('not reached');
      },
      async result() {
        throw new Error('not reached');
      },
    };
    const error = await runFal('bad/endpoint', {}, { queue }).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(FalStageError);
    expect(error).toMatchObject({ endpoint: 'bad/endpoint', requestId: null, status: 422, body: { detail: 'bad field' } });
    expect((error as Error).message).toContain('bad field');
  });

  it('keeps the request id when the result call fails', async () => {
    const queue = fakeQueue(['COMPLETED']);
    queue.result = async () => {
      throw Object.assign(new Error('Generation failed'), { status: 500 });
    };
    const error = await runFal('e', {}, { queue, pollIntervalMs: 0 }).catch((e: unknown) => e);
    expect(error).toMatchObject({ name: 'FalStageError', requestId: 'req-1', status: 500 });
  });

  it('times out with the request id so it can be resumed or looked up', async () => {
    const error = await runFal('e', {}, { queue: fakeQueue(['IN_PROGRESS']), pollIntervalMs: 1, timeoutMs: 20 }).catch((e: unknown) => e);
    expect(error).toMatchObject({ name: 'FalStageError', requestId: 'req-1' });
    expect((error as Error).message).toContain('did not finish');
  });

  it('refuses to run without FAL_KEY when using the real client', async () => {
    const saved = process.env.FAL_KEY;
    delete process.env.FAL_KEY;
    try {
      await expect(runFal('e', {})).rejects.toThrow(/FAL_KEY is not set/);
    } finally {
      if (saved !== undefined) process.env.FAL_KEY = saved;
    }
  });
});

describe('MODELS registry', () => {
  it('names a primary endpoint for every stage and never lists the same endpoint as its own fallback', () => {
    for (const [stage, choice] of Object.entries(MODELS)) {
      expect(choice.endpoint, stage).toMatch(/^[a-z0-9-]+\/[a-z0-9_./-]+$/i);
      expect(choice.fallback, stage).not.toBe(choice.endpoint);
    }
  });

  it('is the only file in src/ that spells out a fal endpoint id', () => {
    const endpoints = new Set<string>();
    for (const choice of Object.values(MODELS)) {
      endpoints.add(choice.endpoint);
      if (choice.fallback) endpoints.add(choice.fallback);
    }
    const srcDir = path.resolve(__dirname, '..', '..');
    const offenders: string[] = [];
    const visit = (dir: string): void => {
      for (const name of readdirSync(dir)) {
        const full = path.join(dir, name);
        if (statSync(full).isDirectory()) visit(full);
        else if (/\.(ts|tsx)$/.test(name) && name !== 'models.ts' && !name.endsWith('.test.ts')) {
          const text = readFileSync(full, 'utf8');
          for (const endpoint of endpoints) {
            // Comments may name endpoints in prose; flag only string literals.
            if (text.includes(`'${endpoint}'`) || text.includes(`"${endpoint}"`)) offenders.push(`${path.relative(srcDir, full)}: ${endpoint}`);
          }
        }
      }
    };
    visit(srcDir);
    expect(offenders).toEqual([]);
  });
});

describe('voice catalogue', () => {
  it('gives every voice a description for the Historian and a provider voice name', () => {
    expect(Object.keys(VOICE_CATALOG).length).toBeGreaterThanOrEqual(4);
    for (const [key, voice] of Object.entries(VOICE_CATALOG)) {
      expect(voice.description.length, key).toBeGreaterThan(10);
      expect(voice.voiceName, key).toBeTruthy();
      expect(voice.stability, key).toBeGreaterThanOrEqual(0);
      expect(voice.stability, key).toBeLessThanOrEqual(1);
    }
  });

  it('getVoice names the valid keys when the key is unknown', () => {
    expect(getVoice('eleven-lily').voiceName).toBe('Lily');
    expect(() => getVoice('nope')).toThrow(/Valid keys: .*eleven-lily/);
  });
});

describe('public functions', () => {
  afterEach(() => vi.unstubAllEnvs());

  it('synthesizeSpeech rejects an unknown voice, empty text and text over the limit', async () => {
    await expect(synthesizeSpeech('hello', 'nope')).rejects.toThrow(/Unknown voice key/);
    await expect(synthesizeSpeech('   ', 'eleven-lily')).rejects.toThrow(/empty/);
    await expect(synthesizeSpeech('a'.repeat(MAX_TTS_CHARACTERS + 1), 'eleven-lily')).rejects.toThrow(/limit/);
  });

  it('answers from fixtures without calling fal when mocks are on', async () => {
    vi.stubEnv('NEXT_PUBLIC_USE_MOCKS', '1');
    vi.stubEnv('FAL_KEY', '');
    expect(await synthesizeSpeech('hello', 'eleven-lily')).toMatch(/\S/);
    expect(await transcribe('https://example.com/a.mp3')).toMatch(/\?$/);
    expect(await uploadToFal(new Blob(['x']))).toMatch(/\S/);
  });

  it('refuses to upload without FAL_KEY when mocks are off', async () => {
    vi.stubEnv('NEXT_PUBLIC_USE_MOCKS', '');
    vi.stubEnv('FAL_KEY', '');
    await expect(uploadToFal(new Blob(['x']))).rejects.toThrow(/FAL_KEY is not set/);
  });

  it('names fal\'s own reason when an upload is refused with an empty message (a locked account)', async () => {
    vi.stubEnv('NEXT_PUBLIC_USE_MOCKS', '');
    vi.stubEnv('FAL_KEY', 'test-key');
    const { fal } = await import('@fal-ai/client');
    const refused = Object.assign(new Error(''), { status: 403, body: { detail: 'User is locked. Reason: Exhausted balance.' } });
    const spy = vi.spyOn(fal.storage, 'upload').mockRejectedValue(refused);
    const error = await uploadToFal(new Blob(['x'])).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(FalStageError);
    expect((error as Error).message).toBe('fal upload failed (HTTP 403): User is locked. Reason: Exhausted balance.');
    expect((error as FalStageError).status).toBe(403);
    spy.mockRestore();
  });
});

describe('mock mode is impossible to mistake', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
    resetMockWarning();
  });

  it('the mock transcript says it is a mock', async () => {
    vi.stubEnv('NEXT_PUBLIC_USE_MOCKS', '1');
    expect(await transcribe('https://example.com/a.mp3')).toBe(MOCK_TRANSCRIPT_TEXT);
    expect(MOCK_TRANSCRIPT_TEXT).toMatch(/^\[mock transcript\]/);
  });

  it('warns once when mocks are on and a real key is set, and only then', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    vi.stubEnv('NEXT_PUBLIC_USE_MOCKS', '1');
    vi.stubEnv('FAL_KEY', 'some-real-looking-key');
    expect(warnIfMocksShadowKey()).toBe(true);
    expect(warnIfMocksShadowKey()).toBe(false);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(String(warn.mock.calls[0][0])).toContain('FIXTURES');
    expect(String(warn.mock.calls[0][0])).not.toContain('some-real-looking-key');
  });

  it('stays quiet when mocks are off, or when there is no key', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    vi.stubEnv('NEXT_PUBLIC_USE_MOCKS', '');
    vi.stubEnv('FAL_KEY', 'some-real-looking-key');
    expect(warnIfMocksShadowKey()).toBe(false);
    vi.stubEnv('NEXT_PUBLIC_USE_MOCKS', '1');
    vi.stubEnv('FAL_KEY', '');
    expect(warnIfMocksShadowKey()).toBe(false);
    expect(warn).not.toHaveBeenCalled();
  });
});

describe('the human\'s voice picks (HUMAN_TASKS 2.2)', () => {
  afterEach(() => vi.unstubAllEnvs());

  it('offers exactly the five London picks plus the accent voices, and retires Alice, Lily and George', async () => {
    const { selectableVoices } = await import('./voices');
    const offered = Object.keys(selectableVoices());
    for (const key of ['eleven-charlotte', 'eleven-daniel', 'gemini-kore', 'gemini-aoede', 'gemini-iapetus']) expect(offered).toContain(key);
    for (const key of ['eleven-alice', 'eleven-lily', 'eleven-george']) {
      expect(offered).not.toContain(key);
      // Still resolvable, because stored eras use them.
      expect(getVoice(key).retired).toBe(true);
    }
  });

  it('speaks a Gemini voice through the Gemini model with its Cockney style, for narration and for chat alike', async () => {
    vi.stubEnv('NEXT_PUBLIC_USE_MOCKS', '');
    for (const fast of [false, true]) {
      const submitted: { endpoint: string; input: Record<string, unknown> }[] = [];
      const queue: FalQueueLike = {
        async submit(endpoint, options) {
          submitted.push({ endpoint, input: options.input });
          return { request_id: 'g1' };
        },
        async status() {
          return { status: 'COMPLETED' };
        },
        async result() {
          return { data: { audio: { url: 'https://cdn/kore.wav' } } };
        },
      };
      expect(await synthesizeSpeech('Hello, dearie!', 'gemini-kore', { fast }, { queue, pollIntervalMs: 0 })).toBe('https://cdn/kore.wav');
      expect(submitted[0].endpoint).toBe(MODELS.gemini_speech.endpoint);
      expect(submitted[0].input).toMatchObject({ prompt: 'Hello, dearie!', voice: 'Kore' });
      expect(String(submitted[0].input.style_instructions)).toMatch(/Cockney/);
      expect(submitted[0].input).not.toHaveProperty('text');
    }
  });

  it('still speaks an ElevenLabs pick through ElevenLabs, with the cheaper model for chat', async () => {
    vi.stubEnv('NEXT_PUBLIC_USE_MOCKS', '');
    const seen: string[] = [];
    const queue: FalQueueLike = {
      async submit(endpoint) {
        seen.push(endpoint);
        return { request_id: 'e1' };
      },
      async status() {
        return { status: 'COMPLETED' };
      },
      async result() {
        return { data: { audio: { url: 'https://cdn/c.mp3' } } };
      },
    };
    await synthesizeSpeech('Hi', 'eleven-charlotte', { fast: false }, { queue, pollIntervalMs: 0 });
    await synthesizeSpeech('Hi', 'eleven-charlotte', { fast: true }, { queue, pollIntervalMs: 0 });
    expect(seen).toEqual([MODELS.narration.endpoint, MODELS.chat_speech.endpoint]);
  });
});
