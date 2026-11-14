/** Unit tests for stageSeconds and queueNote in ProgressSheet.tsx. Owner: Agent 4 (A4-05). */
import { describe, expect, it } from 'vitest';
import { QUEUE_SLOW_S, queueNote, stageSeconds } from './ProgressSheet';

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

describe('queueNote', () => {
  const createdAt = '2026-11-14T20:00:00Z';
  const t0 = Date.parse(createdAt);
  it('is null once the worker has claimed the job', () => {
    expect(queueNote({ state: 'running', createdAt }, t0)).toBeNull();
    expect(queueNote({ state: 'succeeded', createdAt }, t0)).toBeNull();
  });
  it('says the job is waiting in line at first', () => {
    expect(queueNote({ state: 'queued', createdAt }, t0 + 5000)).toMatch(/waiting in line/i);
  });
  it('warns the studio may be offline after QUEUE_SLOW_S', () => {
    expect(queueNote({ state: 'queued', createdAt }, t0 + QUEUE_SLOW_S * 1000)).toMatch(/offline/);
  });
  it('does not claim offline for an unparseable time', () => {
    expect(queueNote({ state: 'queued', createdAt: 'nope' }, t0)).toMatch(/waiting in line/i);
  });
});
