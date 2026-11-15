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
  countFailedJobs,
  enqueueEraJob,
  finishJob,
  getActiveJob,
  heartbeatJob,
  patchStage,
  releaseJob,
  requestEraGeneration,
  resetMemoryJobs,
} from './index';

beforeEach(() => {
  delete process.env.MONGODB_URI;
  resetMemoryDb();
  resetMemoryJobs();
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.useRealTimers();
  delete process.env.VIDEO_GENERATION;
  delete process.env.VIDEO_ERAS;
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

  it('releases a running job so the next worker takes it at once, with its stages and request ids', async () => {
    const eraId = eraIdOf('v-and-a', 1941);
    const job = await enqueueEraJob(eraId, false);
    await claimNextJob('w1');
    await patchStage(job.id, 'scene', { state: 'running', falRequestId: 'fal-123' });

    const released = await releaseJob(job.id);
    expect(released?.state).toBe('queued');
    expect(released?.stages.find((s) => s.key === 'scene')).toMatchObject({ state: 'running', falRequestId: 'fal-123' });
    // Still the era's active job, so nobody can queue a second one in the gap.
    expect((await getActiveJob(eraId))?.id).toBe(job.id);
    expect((await enqueueEraJob(eraId, true)).id).toBe(job.id);

    const resumed = await claimNextJob('w2');
    expect(resumed?.id).toBe(job.id);
    expect(resumed?.stages.find((s) => s.key === 'scene')?.falRequestId).toBe('fal-123');
  });

  it('leaves jobs that are not running alone', async () => {
    const job = await enqueueEraJob(eraIdOf('royal-albert-hall', 1871), false);
    expect(await releaseJob(job.id)).toBeNull(); // still queued
    await claimNextJob('w');
    await finishJob(job.id, 'succeeded');
    expect(await releaseJob(job.id)).toBeNull(); // finished
    expect((await getActiveJob(job.eraId))).toBeNull();
    expect(await releaseJob('nope')).toBeNull();
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
    process.env.VIDEO_ERAS = eraId;
    const ok = await requestEraGeneration(eraId, true);
    expect(ok.ok && ok.response.era.videoState).toBe('queued');
  });

  it('refuses video for an era that is not in VIDEO_ERAS even when video is on', async () => {
    const eraId = eraIdOf('royal-albert-hall', 1871);
    process.env.VIDEO_GENERATION = 'on';
    expect(await requestEraGeneration(eraId, true)).toMatchObject({ ok: false, status: 403, code: 'video_disabled' });
    process.env.VIDEO_ERAS = ' queens-tower_1893 , other_1900 ';
    expect(await requestEraGeneration(eraId, true)).toMatchObject({ ok: false, status: 403 });
    // The core tier is never blocked by the list.
    expect((await requestEraGeneration(eraId, false)).ok).toBe(true);
  });

  /** Queue, claim and fail one job for the era, as a worker that keeps failing would. */
  const failOnce = async (eraId: string) => {
    const queued = await requestEraGeneration(eraId, false, { force: true });
    if (!queued.ok || !queued.response.job) throw new Error('expected a job');
    await claimNextJob('w');
    await finishJob(queued.response.job.id, 'failed');
  };

  it('stops queueing an era after 2 failed jobs, counts them, and lets force through', async () => {
    const eraId = eraIdOf('royal-albert-hall', 1871);
    await failOnce(eraId);
    expect(await countFailedJobs(eraId)).toBe(1);
    const second = await requestEraGeneration(eraId, false);
    expect(second.ok).toBe(true);
    await claimNextJob('w');
    if (second.ok && second.response.job) await finishJob(second.response.job.id, 'failed');
    expect(await countFailedJobs(eraId)).toBe(2);

    const refused = await requestEraGeneration(eraId, false);
    expect(refused).toMatchObject({ ok: false, status: 429, code: 'retry_limit' });
    expect(await getActiveJob(eraId)).toBeNull();
    const forced = await requestEraGeneration(eraId, false, { force: true });
    expect(forced.ok && forced.response.job?.state).toBe('queued');
  });

  it('reads the limit from MAX_FAILED_JOBS_PER_ERA, ignoring nonsense values', async () => {
    vi.stubEnv('MAX_FAILED_JOBS_PER_ERA', '1');
    const eraId = eraIdOf('royal-albert-hall', 1871);
    await failOnce(eraId);
    expect(await requestEraGeneration(eraId, false)).toMatchObject({ ok: false, code: 'retry_limit' });
    vi.stubEnv('MAX_FAILED_JOBS_PER_ERA', 'lots');
    expect((await requestEraGeneration(eraId, false)).ok).toBe(true);
  });

  it('does not count failures against another era, or when the era is already done', async () => {
    await failOnce(eraIdOf('royal-albert-hall', 1871));
    await failOnce(eraIdOf('royal-albert-hall', 1871));
    expect((await requestEraGeneration(eraIdOf('v-and-a', 1941), false)).ok).toBe(true);
    expect(await requestEraGeneration(eraIdOf('queens-tower', 1893), false)).toMatchObject({ ok: true, response: { job: null } });
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
    // The real pipeline (Agent 2) calls Claude and fal; mocks switch it to its no-spend dry run.
    vi.stubEnv('NEXT_PUBLIC_USE_MOCKS', '1');
    process.env.VIDEO_GENERATION = 'on';
    process.env.VIDEO_ERAS = eraId;
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
