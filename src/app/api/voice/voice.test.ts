/**
 * Tests for the two voice routes and their spend guards, on the in-memory database. Owner: Agent 2
 * (Studio). Task A2-11. Mock mode makes the fal functions return fixtures, so nothing here spends money.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { NextRequest } from 'next/server';
import { eraIdOf } from '@/lib/contracts';
import { resetMemoryDb } from '@/lib/db';
import { MOCK_TRANSCRIPT_TEXT, createRateLimiter, createSpeechCache } from '@/lib/fal';
import { MOCK_AUDIO_URL } from '@fixtures/index';
import { POST as stt } from './stt/route';
import { POST as tts } from './tts/route';
import { MIN_RECORDING_BYTES, isAcceptableAudioType, TTS_PER_MINUTE } from './_lib/voice';

const HERO_ERA = eraIdOf('queens-tower', 1893);
const EMPTY_ERA = eraIdOf('natural-history-museum', 1862);
let callerCounter = 0;

/** A JSON POST from a fresh caller, so tests never share a rate-limit bucket. */
function postJson(body: unknown, caller = `10.0.0.${++callerCounter}`): NextRequest {
  return new Request('http://test.local/api/voice/tts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-forwarded-for': caller },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  }) as NextRequest;
}

/** A multipart POST with an optional `file` field. */
function postFile(file: Blob | null, caller = `10.1.0.${++callerCounter}`): NextRequest {
  const form = new FormData();
  if (file) form.append('file', file, 'speech.webm');
  return new Request('http://test.local/api/voice/stt', { method: 'POST', headers: { 'x-forwarded-for': caller }, body: form }) as NextRequest;
}

beforeEach(() => {
  delete process.env.MONGODB_URI;
  resetMemoryDb();
  vi.stubEnv('NEXT_PUBLIC_USE_MOCKS', '1');
});
afterEach(() => vi.unstubAllEnvs());

describe('POST /api/voice/tts', () => {
  it('answers { audioUrl } for an era with a guide', async () => {
    const res = await tts(postJson({ eraId: HERO_ERA, text: 'Hello there!' }));
    expect(res.status).toBe(200);
    expect(res.headers.get('cache-control')).toBe('no-store');
    expect(await res.json()).toEqual({ audioUrl: MOCK_AUDIO_URL });
  });

  it('404s an unknown era, 409s an era with no guide yet, 400s bad input', async () => {
    expect((await tts(postJson({ eraId: eraIdOf('queens-tower', 1999), text: 'hi' }))).status).toBe(404);
    const noGuide = await tts(postJson({ eraId: EMPTY_ERA, text: 'hi' }));
    expect(noGuide.status).toBe(409);
    expect((await noGuide.json()).error.code).toBe('era_not_ready');
    expect((await tts(postJson({ eraId: HERO_ERA, text: '' }))).status).toBe(400);
    expect((await tts(postJson({ eraId: HERO_ERA, text: '   ' }))).status).toBe(400);
    expect((await tts(postJson({ eraId: HERO_ERA, text: 'x'.repeat(1501) }))).status).toBe(400);
    expect((await tts(postJson('not json'))).status).toBe(400);
  });

  it('503s when there is no fal key and mocks are off, but still 404s a bad era first', async () => {
    vi.stubEnv('NEXT_PUBLIC_USE_MOCKS', '');
    vi.stubEnv('FAL_KEY', '');
    const res = await tts(postJson({ eraId: HERO_ERA, text: 'Hello' }));
    expect(res.status).toBe(503);
    expect((await res.json()).error.code).toBe('voice_unavailable');
    expect((await tts(postJson({ eraId: eraIdOf('queens-tower', 1999), text: 'hi' }))).status).toBe(404);
  });

  it('rate limits one caller after TTS_PER_MINUTE requests and leaves other callers alone', async () => {
    const caller = 'rate-limited-caller';
    for (let i = 0; i < TTS_PER_MINUTE; i++) expect((await tts(postJson({ eraId: HERO_ERA, text: 'hi' }, caller))).status).toBe(200);
    const blocked = await tts(postJson({ eraId: HERO_ERA, text: 'hi' }, caller));
    expect(blocked.status).toBe(429);
    expect(Number(blocked.headers.get('retry-after'))).toBeGreaterThan(0);
    expect((await tts(postJson({ eraId: HERO_ERA, text: 'hi' }, 'someone-else'))).status).toBe(200);
  });
});

/** A recording of the given size, comfortably over the 1 KB minimum by default. */
function recording(bytes = 2048, type = 'audio/webm;codecs=opus'): Blob {
  return new Blob([new Uint8Array(bytes)], { type });
}

describe('POST /api/voice/stt', () => {
  it('answers a clearly tagged mock transcript in mock mode', async () => {
    const res = await stt(postFile(recording()));
    expect(res.status).toBe(200);
    const { text } = await res.json();
    expect(text).toBe(MOCK_TRANSCRIPT_TEXT);
    expect(text.startsWith('[mock transcript]')).toBe(true);
  });

  it('refuses a recording under 1 KB with empty_recording before anything is sent to fal', async () => {
    for (const bytes of [0, 5, MIN_RECORDING_BYTES - 1]) {
      const res = await stt(postFile(recording(bytes)));
      expect(res.status, `${bytes} bytes`).toBe(400);
      expect((await res.json()).error.code).toBe('empty_recording');
    }
    expect((await stt(postFile(recording(MIN_RECORDING_BYTES)))).status).toBe(200);
  });

  it('refuses a tiny recording even when fal is not configured, because it checks size first', async () => {
    vi.stubEnv('NEXT_PUBLIC_USE_MOCKS', '');
    vi.stubEnv('FAL_KEY', '');
    expect((await (await stt(postFile(recording(5)))).json()).error.code).toBe('empty_recording');
  });

  it('400s a missing file, 413s a big one, 415s a non-audio one', async () => {
    expect((await stt(postFile(null))).status).toBe(400);
    expect((await stt(postFile(recording(4 * 1024 * 1024 + 1)))).status).toBe(413);
    const wrong = await stt(postFile(recording(2048, 'image/jpeg')));
    expect(wrong.status).toBe(415);
    expect((await wrong.json()).error.code).toBe('unsupported_type');
    const notForm = new Request('http://test.local/api/voice/stt', { method: 'POST', body: 'plain', headers: { 'Content-Type': 'text/plain' } });
    expect((await stt(notForm as NextRequest)).status).toBe(400);
  });

  it('503s when there is no fal key and mocks are off', async () => {
    vi.stubEnv('NEXT_PUBLIC_USE_MOCKS', '');
    vi.stubEnv('FAL_KEY', '');
    expect((await stt(postFile(recording(2048, 'audio/mp4')))).status).toBe(503);
  });

  it('accepts what phones send: WebM, MP4 (even labelled video), OGG, and no type at all', () => {
    for (const type of ['audio/webm;codecs=opus', 'audio/mp4', 'video/mp4', 'video/webm', 'audio/ogg', '', 'application/octet-stream']) {
      expect(isAcceptableAudioType(type), type).toBe(true);
    }
    for (const type of ['image/jpeg', 'text/plain', 'application/json']) expect(isAcceptableAudioType(type), type).toBe(false);
  });
});

describe('spend guards', () => {
  it('the limiter allows `limit` calls per window, then waits, then resets', () => {
    let nowMs = 1_000;
    const limiter = createRateLimiter(2, 60_000, () => nowMs);
    expect(limiter.check('a').ok).toBe(true);
    expect(limiter.check('a').ok).toBe(true);
    expect(limiter.check('a')).toEqual({ ok: false, retryAfterS: 60 });
    expect(limiter.check('b').ok).toBe(true);
    nowMs += 30_000;
    expect(limiter.check('a')).toEqual({ ok: false, retryAfterS: 30 });
    nowMs += 30_000;
    expect(limiter.check('a').ok).toBe(true);
  });

  it('the speech cache remembers per voice and text, and drops the oldest when full', () => {
    const cache = createSpeechCache(2);
    cache.set('v1', 'hello', 'url1');
    cache.set('v2', 'hello', 'url2');
    expect(cache.get('v1', 'hello')).toBe('url1');
    expect(cache.get('v1', 'other')).toBeUndefined();
    cache.set('v1', 'third', 'url3');
    expect(cache.get('v1', 'hello')).toBeUndefined();
    expect(cache.get('v2', 'hello')).toBe('url2');
  });
});
