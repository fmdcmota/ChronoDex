/** Unit tests for stageSeconds in ProgressSheet.tsx. Owner: Agent 4 (A4-05). */
import { describe, expect, it } from 'vitest';
import { stageSeconds } from './ProgressSheet';

describe('stageSeconds', () => {
  it('is null before the stage starts', () => {
    expect(stageSeconds({ startedAt: null, finishedAt: null }, 0)).toBeNull();
  });
  it('measures a finished stage', () => {
    expect(stageSeconds({ startedAt: '2026-11-14T16:00:00Z', finishedAt: '2026-11-14T16:00:12.4Z' }, 0)).toBe(12);
  });
  it('measures a running stage against now', () => {
    expect(stageSeconds({ startedAt: '2026-11-14T16:00:00Z', finishedAt: null }, Date.parse('2026-11-14T16:00:05Z'))).toBe(5);
  });
  it('is null for an unparseable time', () => {
    expect(stageSeconds({ startedAt: 'nope', finishedAt: null }, 0)).toBeNull();
  });
});
