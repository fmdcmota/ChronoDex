/**
 * Unit tests for the guide chat: prompt, message conversion, the DeepSeek stream parser, and
 * failure handling. Owner: Agent 1. Uses a fake fetch: no network calls.
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { ChatStreamEvent, Era, Guide } from '@/lib/contracts';
import { HERO_ERA_ID, eras, landmarks } from '@fixtures/index';
import { ChatInputError, buildGuideSystemPrompt, pickNextLandmark, streamGuideReply, toChatTurns } from './index';
import { DEEPSEEK_CHAT_URL, DeepSeekError, collectUrls, completeDeepSeek, streamDeepSeek } from './deepseek';
import { fakeFetch, sse } from './test-fakes';

const hero = eras.find((e) => e.id === HERO_ERA_ID) as Era & { guide: Guide };
const queensTower = landmarks.find((l) => l.id === 'queens-tower')!;

/** Collect every event of a stream. */
async function collect<T>(stream: AsyncGenerator<T>): Promise<T[]> {
  const out: T[] = [];
  for await (const e of stream) out.push(e);
  return out;
}

describe('toChatTurns', () => {
  it('drops the leading greeting and maps roles', () => {
    expect(
      toChatTurns([
        { role: 'guide', text: 'Hello!' },
        { role: 'player', text: 'Hi' },
        { role: 'guide', text: 'How can I help?' },
        { role: 'player', text: 'Tell me more' },
      ]),
    ).toEqual([
      { role: 'user', content: 'Hi' },
      { role: 'assistant', content: 'How can I help?' },
      { role: 'user', content: 'Tell me more' },
    ]);
  });

  it('rejects a history with no player message or ending with the guide', () => {
    expect(() => toChatTurns([{ role: 'guide', text: 'Hello' }])).toThrow(ChatInputError);
    expect(() => toChatTurns([{ role: 'player', text: 'Hi' }, { role: 'guide', text: 'Yes?' }])).toThrow(ChatInputError);
    expect(() => toChatTurns([{ role: 'player', text: 'Hi' }, { role: 'player', text: '  ' }])).not.toThrow();
  });
});

describe('prompt and suggestion', () => {
  it('suggests the nearest uncollected landmark, never the current one', () => {
    const next = pickNextLandmark(queensTower, landmarks, new Set(['royal-albert-hall']));
    expect(next).not.toBeNull();
    expect(next!.name).not.toBe(queensTower.name);
    expect(next!.name).not.toBe('Royal Albert Hall');
    expect(pickNextLandmark(queensTower, landmarks, new Set(landmarks.map((l) => l.id)))).toBeNull();
  });

  it('builds a prompt with the persona, the facts, the suggestion and the greeting', () => {
    const prompt = buildGuideSystemPrompt({ era: hero, landmark: queensTower, suggestion: { name: 'Royal Albert Hall', distanceM: 187 } });
    expect(prompt).toContain('Albert Finch');
    expect(prompt).toContain('1893');
    expect(prompt).toContain(hero.funFacts[0]);
    expect(prompt).toContain('Royal Albert Hall, about 200 m');
    expect(prompt).toContain(hero.guide.greeting);
    expect(prompt).toMatch(/not a real historical figure/);
  });
});

describe('streamDeepSeek', () => {
  it('reassembles text split across chunks and reports the finish reason', async () => {
    for (const size of [1, 3, 7, 1000]) {
      const fetch = fakeFetch(sse(['Good ', 'day, ', 'sir!'], 'stop', size));
      const events = await collect(streamDeepSeek({ model: 'm', messages: [], maxTokens: 10, reasoningEffort: 'none', apiKey: 'k', fetchImpl: fetch.impl }));
      expect(events).toEqual([
        { type: 'text', text: 'Good ' },
        { type: 'text', text: 'day, ' },
        { type: 'text', text: 'sir!' },
        { type: 'finish', reason: 'stop' },
      ]);
    }
  });

  it('throws DeepSeekError with the status on an error response', async () => {
    const fetch = fakeFetch({ status: 401, text: '{"error":{"message":"bad key"}}' });
    await expect(
      collect(streamDeepSeek({ model: 'm', messages: [], maxTokens: 10, reasoningEffort: 'none', apiKey: 'k', fetchImpl: fetch.impl })),
    ).rejects.toMatchObject({ name: 'DeepSeekError', status: 401 });
    expect(new DeepSeekError(500, 'x')).toBeInstanceOf(Error);
  });
});

describe('DeepSeek web-tool streams', () => {
  const req = { model: 'm', messages: [], maxTokens: 10, reasoningEffort: 'high' as const, apiKey: 'k' };
  const toolCalls = [{ calls: [{ sources: [{ url: 'https://a.example/one', title: 'One' }], page: { url: 'https://b.example/two' } }] }];
  const annotations = [{ type: 'url_citation', url_citation: { url: 'https://c.example/three', title: 'Three' } }];

  it('sends tools and JSON mode only when asked, and reports the URLs DeepSeek found', async () => {
    const fetch = fakeFetch(sse(['notes'], 'stop', 5, { annotations, serverToolCalls: toolCalls }));
    const done = await completeDeepSeek({ ...req, tools: [{ type: 'deepseek_web_search' }], fetchImpl: fetch.impl });
    expect(done).toMatchObject({ text: 'notes', finishReason: 'stop' });
    expect(done.urls.sort()).toEqual(['https://a.example/one', 'https://b.example/two', 'https://c.example/three']);
    expect(fetch.calls[0].body.tools).toEqual([{ type: 'deepseek_web_search' }]);
    expect(fetch.calls[0].body).not.toHaveProperty('response_format');

    const json = fakeFetch(sse(['{}']));
    await completeDeepSeek({ ...req, json: true, fetchImpl: json.impl });
    expect(json.calls[0].body.response_format).toEqual({ type: 'json_object' });
    expect(json.calls[0].body).not.toHaveProperty('tools');
  });

  it('throws a retryable error when DeepSeek fails inside the stream', async () => {
    const fetch = fakeFetch(sse(['partial'], 'stop', 1000, { error: 'The model failed to generate a complete response. Please retry.' }));
    await expect(completeDeepSeek({ ...req, fetchImpl: fetch.impl })).rejects.toMatchObject({ name: 'DeepSeekError', retryable: true });
    const other = fakeFetch(sse([], 'stop', 1000, { error: 'Content blocked' }));
    await expect(completeDeepSeek({ ...req, fetchImpl: other.impl })).rejects.toMatchObject({ retryable: false });
  });

  it('collects URLs at any depth, only under a key named url, only http(s)', () => {
    expect(collectUrls({ a: [{ url: 'https://x.example/1' }, { b: { url: 'ftp://nope' } }], url: 'not a url', c: { url: 'http://y.example/2' }, title: 'https://z.example/ignored' }).sort()).toEqual(['http://y.example/2', 'https://x.example/1']);
  });
});

describe('streamGuideReply', () => {
  const base = { era: hero, landmark: queensTower, suggestion: null, messages: [{ role: 'player' as const, text: 'Hello' }] };
  beforeEach(() => {
    process.env.DEEPSEEK_API_KEY = 'test-key';
  });
  afterEach(() => {
    delete process.env.DEEPSEEK_API_KEY;
    delete process.env.CHAT_MODEL;
  });

  it('streams deltas then done, sending the system prompt first, thinking off, and the key', async () => {
    const fetch = fakeFetch(sse(['Good ', 'day!']));
    const events = await collect<ChatStreamEvent>(streamGuideReply({ ...base, fetchImpl: fetch.impl }));
    expect(events).toEqual([
      { type: 'delta', text: 'Good ' },
      { type: 'delta', text: 'day!' },
      { type: 'done', text: 'Good day!' },
    ]);
    const { url, init } = fetch.calls[0];
    expect(url).toBe(DEEPSEEK_CHAT_URL);
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer test-key');
    const body = JSON.parse(String(init.body));
    expect(body).toMatchObject({ model: 'deepseek-flash', stream: true, reasoning_effort: 'none' });
    expect(body.messages[0].role).toBe('system');
    expect(body.messages[0].content).toContain('Albert Finch');
    expect(body.messages.slice(1)).toEqual([{ role: 'user', content: 'Hello' }]);
  });

  it('honours another DeepSeek model in CHAT_MODEL and ignores anything else', async () => {
    const modelFor = async (value: string | undefined): Promise<unknown> => {
      if (value === undefined) delete process.env.CHAT_MODEL;
      else process.env.CHAT_MODEL = value;
      const fetch = fakeFetch(sse(['x']));
      await collect(streamGuideReply({ ...base, fetchImpl: fetch.impl }));
      return fetch.calls[0].body.model;
    };
    expect(await modelFor(undefined)).toBe('deepseek-flash');
    expect(await modelFor('deepseek-v4-pro')).toBe('deepseek-v4-pro');
    expect(await modelFor('claude-haiku-5-5')).toBe('deepseek-flash');
  });

  it('ends with an error event on a content filter, an API error, or a missing key, never throwing', async () => {
    const filtered = await collect<ChatStreamEvent>(streamGuideReply({ ...base, fetchImpl: fakeFetch(sse(['Hm'], 'content_filter')).impl }));
    expect(filtered.at(-1)?.type).toBe('error');
    const failed = await collect<ChatStreamEvent>(streamGuideReply({ ...base, fetchImpl: fakeFetch({ status: 500, text: 'down' }).impl }));
    expect(failed).toEqual([{ type: 'error', message: expect.any(String) }]);
    delete process.env.DEEPSEEK_API_KEY;
    const fetch = fakeFetch(sse(['x']));
    const noKey = await collect<ChatStreamEvent>(streamGuideReply({ ...base, fetchImpl: fetch.impl }));
    expect(noKey).toEqual([{ type: 'error', message: expect.any(String) }]);
    expect(fetch.calls).toHaveLength(0);
  });
});
