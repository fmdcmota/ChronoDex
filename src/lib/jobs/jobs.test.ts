/**
 * Tests for src/lib/jobs and src/lib/db on the in-memory backend, including the pipeline stub run
 * end to end as the worker will run it. Owner: Agent 1.
 *
 * The MongoDB backend is not covered here: it needs a live server. See the db README.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { eraIdOf } from '@/lib/contracts';
import { getEra, insertCapture, listCaptures, patchEra, resetMemoryDb } from '@/lib/db';
import { runEraJob } from '@/lib/pipeline';
import {
  JOB_LEASE_MS,
  claimNextJob,
  enqueueEraJob,
  finishJob,
  getActiveJob,
  heartbeatJob,
  patchStage,
  requestEraGeneration,
  resetMemoryJobs,
} from './index';

beforeEach(() => {
  delete process.env.MONGODB_URI;
  resetMemoryDb();
  resetMemoryJobs();
});
afterEach(() => {
  vi.useRealTimers();
  delete process.env.VIDEO_GENERATION;
});

describe('job queue', () => {
  it('keeps one active job per era, claims it once, and frees it when finished', async () => {
    const eraId = eraIdOf('exhibition-road', 1862);
    const a = await enqueueEraJob(eraId, false);
    expect((await enqueueEraJob(eraId, true)).id).toBe(a.id);

    const claimed = await claimNextJob('w1');
    expect(claimed).toMatchObject({ id: a.id, state: 'running' });
    expect(await claimNextJob('w2')).toBeNull();

    const patched = await patchStage(a.id, 'brief', { state: 'done', falRequestId: 'r1' });
    expect(patched.stages[0]).toMatchObject({ key: 'brief', state: 'done', falRequestId: 'r1' });
    await expect(patchStage(a.id, 'talk', { state: 'done' })).rejects.toThrow(/no stage/);
    await expect(patchStage('nope', 'brief', {})).rejects.toThrow(/No job/);

    await finishJob(a.id, 'failed');
    expect(await getActiveJob(eraId)).toBeNull();
    expect((await enqueueEraJob(eraId, false)).id).not.toBe(a.id);
  });

  it('claims the oldest queued job first', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-14T17:00:00Z'));
    const first = await enqueueEraJob(eraIdOf('v-and-a', 1941), false);
    vi.setSystemTime(new Date('2026-11-14T17:00:01Z'));
    await enqueueEraJob(eraIdOf('royal-albert-hall', 1871), false);
    expect((await claimNextJob('w'))?.id).toBe(first.id);
  });

  it('hands a running job to another worker once its lease expires, unless renewed', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-14T17:00:00Z'));
    const job = await enqueueEraJob(eraIdOf('v-and-a', 1941), false);
    await claimNextJob('w1');

    vi.advanceTimersByTime(JOB_LEASE_MS - 1000);
    await heartbeatJob(job.id);
    vi.advanceTimersByTime(JOB_LEASE_MS - 1000);
    expect(await claimNextJob('w2')).toBeNull();

    vi.advanceTimersByTime(2000);
    const reclaimed = await claimNextJob('w2');
    expect(reclaimed?.id).toBe(job.id);
  });
});

describe('requestEraGeneration', () => {
  it('404s an unknown era', async () => {
    expect(await requestEraGeneration('nowhere_1900', false)).toMatchObject({ ok: false, status: 404 });
  });

  it('enqueues once, marks the era queued, and returns the same job when asked again', async () => {
    const eraId = eraIdOf('royal-albert-hall', 1871);
    const first = await requestEraGeneration(eraId, false);
    if (!first.ok) throw new Error('expected ok');
    expect(first.response.job?.state).toBe('queued');
    expect(first.response.era.state).toBe('queued');
    expect(first.response.era.videoState).toBe('missing');
    const second = await requestEraGeneration(eraId, false);
    expect(second.ok && second.response.job?.id).toBe(first.response.job?.id);
  });

  it('refuses video when VIDEO_GENERATION is not on, and allows it when on', async () => {
    const eraId = eraIdOf('royal-albert-hall', 1871);
    expect(await requestEraGeneration(eraId, true)).toMatchObject({ ok: false, status: 403, code: 'video_disabled' });
    process.env.VIDEO_GENERATION = 'on';
    const ok = await requestEraGeneration(eraId, true);
    expect(ok.ok && ok.response.era.videoState).toBe('queued');
  });

  it('returns job null when nothing is missing', async () => {
    // The in-memory store seeds the hero era fully populated.
    const outcome = await requestEraGeneration(eraIdOf('queens-tower', 1893), false);
    expect(outcome).toMatchObject({ ok: true, response: { job: null } });
  });
});

describe('pipeline stub, end to end', () => {
  it('runs a whole job and fills the era', async () => {
    const eraId = eraIdOf('natural-history-museum', 1862);
    process.env.VIDEO_GENERATION = 'on';
    await requestEraGeneration(eraId, true);
    const job = await claimNextJob('w');
    expect(job?.eraId).toBe(eraId);
    await runEraJob(job!);
    const era = await getEra(eraId);
    expect(era).toMatchObject({ state: 'ready', videoState: 'ready' });
    expect(await getActiveJob(eraId)).toBeNull();
  });
});

describe('db', () => {
  it('patchEra never changes identity fields and ignores undefined', async () => {
    const eraId = eraIdOf('huxley-building', 1885);
    const era = await patchEra(eraId, { id: 'evil_1', year: 1, title: 'x', summary: undefined });
    expect(era).toMatchObject({ id: eraId, year: 1885, title: 'x', summary: null });
    await expect(patchEra('nowhere_1', { title: 'x' })).rejects.toThrow();
  });

  it('keeps the first capture per player and landmark', async () => {
    const base = { playerId: 'p', landmarkId: 'v-and-a', photoUrl: 'https://x/1.jpg', location: { lat: 0, lng: 0 }, accuracyM: 5, distanceM: 3 };
    const first = await insertCapture({ ...base, id: 'c1', capturedAt: '2026-11-14T17:00:00.000Z' });
    const again = await insertCapture({ ...base, id: 'c2', capturedAt: '2026-11-14T17:05:00.000Z' });
    expect(first.alreadyCollected).toBe(false);
    expect(again).toMatchObject({ alreadyCollected: true, capture: { id: 'c1' } });
    expect((await listCaptures('p')).map((c) => c.id)).toEqual(['c1']);
  });

  it('refuses to fall back to memory on Vercel', async () => {
    process.env.VERCEL = '1';
    try {
      await expect(getEra(eraIdOf('v-and-a', 1941))).rejects.toThrow(/MONGODB_URI/);
    } finally {
      delete process.env.VERCEL;
    }
  });
});
