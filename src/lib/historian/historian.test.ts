/**
 * Unit tests for the Historian: prompts, checks, the research pause_turn loop, and the
 * corrective retry. Owner: Agent 1. Uses a fake client: no API calls.
 */
import { describe, expect, it } from 'vitest';
import type { EraBrief } from '@/lib/contracts';
import { VOICE_CATALOG } from '@/lib/fal/voices';
import { heroBrief, landmarks } from '@fixtures/index';
import { fakeAnthropic } from '@/lib/chat/test-fakes';
import {
  HistorianError,
  buildResearchPrompt,
  buildWritingPrompt,
  countWords,
  isGoogleUrl,
  stripDisallowedImages,
  validateBrief,
  viewingDirection,
  writeEraBrief,
} from './index';

const queensTower = landmarks.find((l) => l.id === 'queens-tower')!;
const voiceKeys = Object.keys(VOICE_CATALOG);

describe('prompts', () => {
  it('describes the viewing direction from photo spot to subject', () => {
    // The fixture subject is due north of the photo spot.
    expect(viewingDirection(queensTower)).toMatch(/^north \(bearing \d+°\)$/);
  });

  it('research prompt asks for sourced facts and forbids Google imagery', () => {
    const { system, user } = buildResearchPrompt(queensTower, 1893);
    expect(user).toContain('1893');
    expect(user).toContain('GAPS');
    expect(system).toMatch(/Google/);
  });

  it('writing prompt lists the voice keys and the script length', () => {
    const { user } = buildWritingPrompt(queensTower, 1893, 'NOTES', VOICE_CATALOG);
    for (const key of voiceKeys) expect(user).toContain(key);
    expect(user).toContain('105 to 120 words');
    expect(user).toContain('NOTES');
  });
});

describe('validateBrief', () => {
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
    const problems = validateBrief(bad, voiceKeys);
    expect(problems.join(' ')).toMatch(/words/);
    expect(problems.join(' ')).toMatch(/by name/);
    expect(problems.join(' ')).toMatch(/voiceKey/);
    expect(problems.join(' ')).toMatch(/sources is empty/);
    expect(problems.join(' ')).toMatch(/funFacts/);
    expect(problems.join(' ')).toMatch(/greeting/);
  });

  it('counts words and strips Google and non-web reference images', () => {
    expect(countWords('  one two\nthree ')).toBe(3);
    expect(isGoogleUrl('https://lh3.googleusercontent.com/x.jpg')).toBe(true);
    expect(isGoogleUrl('https://maps.google.co.uk/x')).toBe(true);
    expect(isGoogleUrl('https://upload.wikimedia.org/x.jpg')).toBe(false);
    const stripped = stripDisallowedImages({
      ...heroBrief,
      sceneBrief: { ...heroBrief.sceneBrief, referenceImageUrls: ['https://upload.wikimedia.org/a.jpg', 'https://streetviewpixels-pa.googleapis.com/x', 'ftp://x'] },
    });
    expect(stripped.sceneBrief.referenceImageUrls).toEqual(['https://upload.wikimedia.org/a.jpg']);
  });
});

describe('writeEraBrief', () => {
  it('resumes a paused research turn, then writes and returns a valid brief', async () => {
    const pausedContent = [{ type: 'text', text: 'FACTS part one. ' }, { type: 'server_tool_use', id: 's1', name: 'web_search', input: {} }];
    const fake = fakeAnthropic([
      { stop_reason: 'pause_turn', content: pausedContent },
      { text: ['FACTS part two.'] },
      { parsed_output: heroBrief },
    ]);
    const brief = await writeEraBrief(queensTower, 1893, { client: fake.client });
    expect(brief).toEqual(heroBrief);

    const [first, resumed, writing] = fake.requests;
    expect(first.model).toBe('claude-opus-5-5');
    expect(first.fallbacks).toBe('default');
    expect(first.betas).toEqual(['server-side-fallback-2026-07-01']);
    expect((first.tools as Array<{ type: string }>)[0].type).toBe('web_search_20260209');
    expect(first.output_config).toEqual({ effort: 'high' });
    // The paused turn is sent back unchanged, with no extra user message.
    const resumedMessages = resumed.messages as Array<{ role: string }>;
    expect(resumedMessages.map((m) => m.role)).toEqual(['user', 'assistant']);
    // Notes from both research turns reach the writer; the writer has no tools.
    const writingUser = (writing.messages as Array<{ content: string }>)[0].content;
    expect(writingUser).toContain('FACTS part one.');
    expect(writingUser).toContain('FACTS part two.');
    expect(writing.tools).toBeUndefined();
    expect((writing.output_config as { effort: string }).effort).toBe('medium');
    expect(writing).not.toHaveProperty('thinking');
  });

  it('corrects once when a check fails, then gives up', async () => {
    const shortScript = { ...heroBrief, guide: { ...heroBrief.guide, script: 'My name is Albert Finch. Hello.' } };
    const fixed = await writeEraBrief(queensTower, 1893, {
      client: fakeAnthropic([{ text: ['notes'] }, { parsed_output: shortScript }, { parsed_output: heroBrief }]).client,
    });
    expect(fixed).toEqual(heroBrief);

    const fake = fakeAnthropic([{ text: ['notes'] }, { parsed_output: shortScript }, { parsed_output: shortScript }]);
    await expect(writeEraBrief(queensTower, 1893, { client: fake.client })).rejects.toBeInstanceOf(HistorianError);
    const retry = fake.requests[2].messages as Array<{ role: string; content: unknown }>;
    expect(retry.map((m) => m.role)).toEqual(['user', 'assistant', 'user']);
    expect(String(retry[2].content)).toMatch(/words/);
  });

  it('fails clearly on refusal or truncation', async () => {
    await expect(writeEraBrief(queensTower, 1893, { client: fakeAnthropic([{ stop_reason: 'refusal' }]).client })).rejects.toThrow(/declined/);
    await expect(
      writeEraBrief(queensTower, 1893, { client: fakeAnthropic([{ text: ['n'] }, { stop_reason: 'max_tokens' }]).client }),
    ).rejects.toThrow(/tokens/);
  });
});
