/**
 * Unit tests for the Historian: prompts, checks, the research request, the source check, the
 * corrective retry, and DeepSeek failures. Owner: Agent 1. Uses a fake fetch: no network calls.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { EraBrief } from '@/lib/contracts';
import { VOICE_CATALOG } from '@/lib/fal/voices';
import { fakeFetch, sse } from '@/lib/chat/test-fakes';
import { heroBrief, landmarks } from '@fixtures/index';
import {
  HistorianError,
  buildResearchPrompt,
  buildWritingPrompt,
  countWords,
  historianModel,
  isGoogleUrl,
  keepFoundUrls,
  normalizeUrl,
  parseBrief,
  stripDisallowedImages,
  validateBrief,
  viewingDirection,
  writeEraBrief,
} from './index';

const queensTower = landmarks.find((l) => l.id === 'queens-tower')!;
const voiceKeys = Object.keys(VOICE_CATALOG);

/** The hero brief's source URLs: what the fake research "found". */
const FOUND = heroBrief.sources.map((s) => s.url);
/** A research answer: notes, and the tools reporting the found URLs. */
const researchAnswer = (notes = 'FACTS: notes') =>
  sse([notes], 'stop', 50, { serverToolCalls: [{ calls: [{ sources: FOUND.map((url) => ({ url, title: 't' })) }] }] });
/** A writing answer: the brief as JSON text. */
const writingAnswer = (brief: unknown) => sse([JSON.stringify(brief)], 'stop', 200);

beforeEach(() => {
  process.env.DEEPSEEK_API_KEY = 'test-key';
});
afterEach(() => {
  delete process.env.DEEPSEEK_API_KEY;
  delete process.env.HISTORIAN_MODEL;
  vi.restoreAllMocks();
});

describe('prompts', () => {
  it('describes the viewing direction from photo spot to subject', () => {
    expect(viewingDirection(queensTower)).toMatch(/^north \(bearing \d+°\)$/);
  });

  it('research prompt asks for sourced facts and forbids Google imagery', () => {
    const { system, user } = buildResearchPrompt(queensTower, 1893);
    expect(user).toContain('1893');
    expect(user).toContain('GAPS');
    expect(system).toMatch(/Google/);
  });

  it('writing prompt has the notes, the voice keys, the allowed URLs, a json example and the script length', () => {
    const { system, user } = buildWritingPrompt(queensTower, 1893, 'NOTES', VOICE_CATALOG, ['https://found.example/page']);
    for (const key of voiceKeys) expect(user).toContain(key);
    expect(user).toContain('105 to 120 words');
    expect(user).toContain('NOTES');
    expect(user).toContain('- https://found.example/page');
    expect(user).toContain('"sceneBrief"');
    // DeepSeek's JSON mode needs the word "json" in the prompt.
    expect(`${system} ${user}`.toLowerCase()).toContain('json');
  });
});

describe('validateBrief and URL checks', () => {
  it('passes the hero fixture', () => {
    expect(validateBrief(heroBrief, voiceKeys)).toEqual([]);
  });

  it('reports each broken rule', () => {
    const bad: EraBrief = {
      ...heroBrief,
      funFacts: ['one'],
      sources: [],
      guide: { ...heroBrief.guide, script: 'Too short.', voiceKey: 'nope', greeting: ' ' },
    };
    const problems = validateBrief(bad, voiceKeys).join(' ');
    for (const re of [/words/, /by name/, /voiceKey/, /sources is empty/, /funFacts/, /greeting/]) expect(problems).toMatch(re);
  });

  it('counts words, spots Google hosts, strips Google and non-web images', () => {
    expect(countWords('  one two\nthree ')).toBe(3);
    expect(isGoogleUrl('https://lh3.googleusercontent.com/x.jpg')).toBe(true);
    expect(isGoogleUrl('https://upload.wikimedia.org/x.jpg')).toBe(false);
    const stripped = stripDisallowedImages({
      ...heroBrief,
      sceneBrief: { ...heroBrief.sceneBrief, referenceImageUrls: ['https://upload.wikimedia.org/a.jpg', 'https://streetviewpixels-pa.googleapis.com/x', 'ftp://x'] },
    });
    expect(stripped.sceneBrief.referenceImageUrls).toEqual(['https://upload.wikimedia.org/a.jpg']);
  });

  it('normalises URLs across scheme, www, fragment, trailing slash and host case', () => {
    expect(normalizeUrl('HTTP://www.Example.com/a/b/#frag')).toBe(normalizeUrl('https://example.com/a/b'));
    expect(normalizeUrl('https://example.com/a?x=1')).not.toBe(normalizeUrl('https://example.com/a'));
  });

  it('keeps only sources and images the research found, and reports what it dropped', () => {
    const brief: EraBrief = {
      ...heroBrief,
      sources: [...heroBrief.sources, { title: 'Invented', url: 'https://invented.example/page' }],
      sceneBrief: { ...heroBrief.sceneBrief, referenceImageUrls: [`${FOUND[0]}/`, 'https://invented.example/img.jpg'] },
    };
    const { brief: kept, dropped } = keepFoundUrls(brief, FOUND);
    expect(kept.sources).toEqual(heroBrief.sources);
    expect(kept.sceneBrief.referenceImageUrls).toEqual([`${FOUND[0]}/`]);
    expect(dropped).toEqual(['https://invented.example/page', 'https://invented.example/img.jpg']);
  });
});

describe('parseBrief', () => {
  it('parses plain, fenced and padded JSON', () => {
    const text = JSON.stringify(heroBrief);
    for (const input of [text, '```json\n' + text + '\n```', `Here you go: ${text} Done.`]) {
      expect(parseBrief(input)).toMatchObject({ ok: true });
    }
  });

  it('explains an empty reply, bad JSON and a wrong shape', () => {
    expect(parseBrief('')).toMatchObject({ ok: false, problem: expect.stringMatching(/empty/) });
    expect(parseBrief('{not json')).toMatchObject({ ok: false, problem: expect.stringMatching(/not valid json/) });
    expect(parseBrief('{"title":"x"}')).toMatchObject({ ok: false, problem: expect.stringMatching(/required shape/) });
  });
});

describe('historianModel', () => {
  it('defaults to flash and accepts only DeepSeek models', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(historianModel()).toBe('deepseek-flash');
    process.env.HISTORIAN_MODEL = 'deepseek-v4-pro';
    expect(historianModel()).toBe('deepseek-v4-pro');
    process.env.HISTORIAN_MODEL = 'claude-opus-5-5';
    expect(historianModel()).toBe('deepseek-flash');
  });
});

describe('writeEraBrief', () => {
  const run = (fetch: ReturnType<typeof fakeFetch>) => writeEraBrief(queensTower, 1893, { fetchImpl: fetch.impl, retryDelayMs: 0 });

  it('researches with web tools, then writes in JSON mode with no tools, and returns the brief', async () => {
    const fetch = fakeFetch(researchAnswer('NOTES-ABOUT-1893'), writingAnswer(heroBrief));
    expect(await run(fetch)).toEqual(heroBrief);

    const [research, writing] = fetch.calls.map((c) => c.body);
    expect(research.model).toBe('deepseek-flash');
    expect(research.tools).toEqual([{ type: 'deepseek_web_search' }, { type: 'deepseek_read_url' }]);
    expect(research.reasoning_effort).toBe('high');
    expect(research).not.toHaveProperty('response_format');

    expect(writing.response_format).toEqual({ type: 'json_object' });
    expect(writing.reasoning_effort).toBe('none');
    expect(writing).not.toHaveProperty('tools');
    const writingPrompt = writing.messages.map((m) => m.content).join('\n');
    expect(writingPrompt).toContain('NOTES-ABOUT-1893');
    for (const url of FOUND) expect(writingPrompt).toContain(url);
    expect((fetch.calls[0].init.headers as Record<string, string>).Authorization).toBe('Bearer test-key');
  });

  it('researches a second time when the first used no web tools, and only then', async () => {
    const fetch = fakeFetch(sse(['guess'], 'stop', 50, {}), researchAnswer('NOTES-SECOND'), writingAnswer(heroBrief));
    expect(await run(fetch)).toEqual(heroBrief);
    expect(fetch.calls).toHaveLength(3);
    expect(fetch.calls[1].body.tools).toBeDefined();
  });

  it('drops invented sources silently when enough real ones remain', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const withInvented = { ...heroBrief, sources: [...heroBrief.sources, { title: 'Invented', url: 'https://invented.example/x' }] };
    const fetch = fakeFetch(researchAnswer(), writingAnswer(withInvented));
    expect((await run(fetch)).sources).toEqual(heroBrief.sources);
    expect(fetch.calls).toHaveLength(2);
  });

  it('corrects once when a check fails, then gives up', async () => {
    const shortScript = { ...heroBrief, guide: { ...heroBrief.guide, script: 'My name is Albert Finch. Hello.' } };
    const fixed = fakeFetch(researchAnswer(), writingAnswer(shortScript), writingAnswer(heroBrief));
    expect(await run(fixed)).toEqual(heroBrief);
    const retry = fixed.calls[2].body.messages;
    expect(retry.map((m) => m.role)).toEqual(['system', 'user', 'assistant', 'user']);
    expect(retry[3].content).toMatch(/words/);

    const hopeless = fakeFetch(researchAnswer(), writingAnswer(shortScript), writingAnswer(shortScript));
    await expect(run(hopeless)).rejects.toBeInstanceOf(HistorianError);
  });

  it('treats an empty or broken writing reply as a failed attempt and retries', async () => {
    const fetch = fakeFetch(researchAnswer(), sse([]), writingAnswer(heroBrief));
    expect(await run(fetch)).toEqual(heroBrief);
    expect(fetch.calls[2].body.messages.at(-1)?.content).toMatch(/empty/);
  });

  it('retries a mid-stream "please retry" and a 503, then succeeds', async () => {
    const midStream = sse([], 'stop', 1000, { error: 'The model failed to generate a complete response. Please retry.' });
    const fetch = fakeFetch(midStream, { status: 503, text: 'busy' }, researchAnswer(), writingAnswer(heroBrief));
    expect(await run(fetch)).toEqual(heroBrief);
    expect(fetch.calls).toHaveLength(4);
  });

  it('gives up after the retries, and does not retry a 401', async () => {
    const busy = { status: 503, text: 'busy' };
    await expect(run(fakeFetch(busy, busy, busy))).rejects.toMatchObject({ name: 'DeepSeekError', status: 503 });
    const unauthorised = fakeFetch({ status: 401, text: 'bad key' });
    await expect(run(unauthorised)).rejects.toMatchObject({ status: 401 });
    expect(unauthorised.calls).toHaveLength(1);
  });

  it('fails clearly with no key, no sources, empty notes, truncation or a content filter', async () => {
    delete process.env.DEEPSEEK_API_KEY;
    await expect(run(fakeFetch())).rejects.toThrow(/DEEPSEEK_API_KEY/);
    process.env.DEEPSEEK_API_KEY = 'test-key';

    const noSources = () => sse(['notes'], 'stop', 50, {});
    await expect(run(fakeFetch(noSources(), noSources(), noSources()))).rejects.toThrow(/no sources/);
    await expect(run(fakeFetch(sse([], 'stop', 50, { serverToolCalls: [{ sources: [{ url: 'https://a.example/' }] }] })))).rejects.toThrow(/no notes/);
    await expect(run(fakeFetch(sse(['n'], 'length')))).rejects.toThrow(/tokens/);
    await expect(run(fakeFetch(sse(['n'], 'content_filter')))).rejects.toThrow(/declined/);
    await expect(run(fakeFetch(researchAnswer(), sse(['{}'], 'length')))).rejects.toThrow(/tokens/);
  });
});
