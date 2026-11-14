/**
 * Unit tests for the guide chat: prompt, message conversion, streaming and failure handling.
 * Owner: Agent 1. Uses a fake client: no API calls.
 */
import { describe, expect, it } from 'vitest';
import type { ChatStreamEvent, Era, Guide } from '@/lib/contracts';
import { HERO_ERA_ID, eras, landmarks } from '@fixtures/index';
import { ChatInputError, buildGuideSystemPrompt, pickNextLandmark, streamGuideReply, toClaudeMessages } from './index';
import { fakeAnthropic } from './test-fakes';

const hero = eras.find((e) => e.id === HERO_ERA_ID) as Era & { guide: Guide };
const queensTower = landmarks.find((l) => l.id === 'queens-tower')!;

/** Collect every event of a stream. */
async function collect(stream: AsyncGenerator<ChatStreamEvent>): Promise<ChatStreamEvent[]> {
  const out: ChatStreamEvent[] = [];
  for await (const e of stream) out.push(e);
  return out;
}

describe('toClaudeMessages', () => {
  it('drops the leading greeting and maps roles', () => {
    expect(
      toClaudeMessages([
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
    expect(() => toClaudeMessages([{ role: 'guide', text: 'Hello' }])).toThrow(ChatInputError);
    expect(() => toClaudeMessages([{ role: 'player', text: 'Hi' }, { role: 'guide', text: 'Yes?' }])).toThrow(ChatInputError);
    expect(() => toClaudeMessages([{ role: 'player', text: 'Hi' }, { role: 'player', text: '  ' }])).not.toThrow();
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

describe('streamGuideReply', () => {
  const base = { era: hero, landmark: queensTower, suggestion: null, messages: [{ role: 'player' as const, text: 'Hello' }] };

  it('streams deltas then done, with the chat model, low effort and a cached system prompt', async () => {
    const fake = fakeAnthropic([{ text: ['Good ', 'day!'] }]);
    const events = await collect(streamGuideReply({ ...base, client: fake.client }));
    expect(events).toEqual([
      { type: 'delta', text: 'Good ' },
      { type: 'delta', text: 'day!' },
      { type: 'done', text: 'Good day!' },
    ]);
    const req = fake.requests[0];
    expect(req.model).toBe('claude-haiku-5-5');
    expect(req.output_config).toEqual({ effort: 'low' });
    expect((req.system as Array<{ cache_control: unknown }>)[0].cache_control).toEqual({ type: 'ephemeral' });
    expect(req).not.toHaveProperty('thinking');
  });

  it('honours CHAT_MODEL', async () => {
    process.env.CHAT_MODEL = 'claude-sonnet-5-5';
    try {
      const fake = fakeAnthropic([{ text: ['x'] }]);
      await collect(streamGuideReply({ ...base, client: fake.client }));
      expect(fake.requests[0].model).toBe('claude-sonnet-5-5');
    } finally {
      delete process.env.CHAT_MODEL;
    }
  });

  it('ends with an error event on refusal or API failure, never throwing', async () => {
    const refused = await collect(streamGuideReply({ ...base, client: fakeAnthropic([{ text: ['Hm'], stop_reason: 'refusal' }]).client }));
    expect(refused.at(-1)?.type).toBe('error');
    const failed = await collect(streamGuideReply({ ...base, client: fakeAnthropic([{ error: new Error('boom') }]).client }));
    expect(failed).toEqual([{ type: 'error', message: expect.any(String) }]);
  });
});
