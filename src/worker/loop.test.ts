/**
 * Tests for the worker's claim loop with fake claim and run functions, plus one end-to-end run on the
 * in-memory queue in dry-run mode. Owner: Agent 2 (Studio). Task A2-10. Nothing here spends money.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { eraIdOf, type Job } from '@/lib/contracts';
import { getEra, resetMemoryDb } from '@/lib/db';
import { claimNextJob, getJob, requestEraGeneration, resetMemoryJobs } from '@/lib/jobs';
import { runEraJob } from '@/lib/pipeline';
import { runWorker } from './loop';

/** A bare job with the given id. */
function fakeJob(id: string): Job {
  return { id, eraId: 'x_1', includeVideo: false, state: 'running', stages: [], createdAt: '', updatedAt: '' };
}

/** A claim function that hands out the given jobs once each, then null. */
function queueOf(...ids: string[]): (workerId: string) => Promise<Job | null> {
  const pending = ids.map(fakeJob);
  return async () => pending.shift() ?? null;
}

const quiet = (): void => undefined;

beforeEach(() => {
  delete process.env.MONGODB_URI;
  resetMemoryDb();
  resetMemoryJobs();
});
afterEach(() => vi.unstubAllEnvs());

describe('runWorker', () => {
  it('runs every queued job in order, then idles until told to stop', async () => {
    const controller = new AbortController();
    const ran: string[] = [];
    const summary = await runWorker({
      workerId: 'w',
      claim: queueOf('a', 'b', 'c'),
      run: async (job) => {
        ran.push(job.id);
        if (ran.length === 3) controller.abort();
      },
      signal: controller.signal,
      pollIntervalMs: 1,
      log: quiet,
    });
    expect(ran).toEqual(['a', 'b', 'c']);
    expect(summary).toEqual({ jobsRun: 3, errors: 0 });
  });

  it('never runs more jobs at once than the concurrency allows', async () => {
    const controller = new AbortController();
    let running = 0;
    let peak = 0;
    let done = 0;
    await runWorker({
      workerId: 'w',
      claim: queueOf('1', '2', '3', '4', '5'),
      run: async () => {
        running++;
        peak = Math.max(peak, running);
        await new Promise((resolve) => setTimeout(resolve, 5));
        running--;
        if (++done === 5) controller.abort();
      },
      signal: controller.signal,
      concurrency: 2,
      pollIntervalMs: 1,
      log: quiet,
    });
    expect(peak).toBe(2);
  });

  it('stops claiming when aborted but lets the running job finish', async () => {
    const controller = new AbortController();
    const claim = vi.fn(queueOf('a', 'b'));
    let finished = false;
    const summary = await runWorker({
      workerId: 'w',
      claim,
      run: async () => {
        controller.abort();
        await new Promise((resolve) => setTimeout(resolve, 10));
        finished = true;
      },
      signal: controller.signal,
      pollIntervalMs: 1,
      log: quiet,
    });
    expect(finished).toBe(true);
    expect(claim).toHaveBeenCalledTimes(1);
    expect(summary.jobsRun).toBe(1);
  });

  it('wakes a sleeping slot as soon as it is aborted, without waiting out the poll interval', async () => {
    const controller = new AbortController();
    const started = Date.now();
    const finishing = runWorker({ workerId: 'w', claim: queueOf(), run: async () => undefined, signal: controller.signal, pollIntervalMs: 60_000, log: quiet });
    setTimeout(() => controller.abort(), 20);
    await finishing;
    expect(Date.now() - started).toBeLessThan(2000);
  });

  it('does not claim anything when the signal is already aborted', async () => {
    const controller = new AbortController();
    controller.abort();
    const claim = vi.fn(queueOf('a'));
    await runWorker({ workerId: 'w', claim, run: async () => undefined, signal: controller.signal, log: quiet });
    expect(claim).not.toHaveBeenCalled();
  });

  it('survives a failing claim and a crashing run, counts them, and carries on', async () => {
    const controller = new AbortController();
    let claims = 0;
    const ran: string[] = [];
    const lines: string[] = [];
    const summary = await runWorker({
      workerId: 'w',
      claim: async () => {
        claims++;
        if (claims === 1) throw new Error('database blip');
        return claims === 2 ? fakeJob('bad') : claims === 3 ? fakeJob('good') : null;
      },
      run: async (job) => {
        ran.push(job.id);
        if (job.id === 'bad') throw new Error('boom');
        controller.abort();
      },
      signal: controller.signal,
      pollIntervalMs: 1,
      log: (line) => lines.push(line),
    });
    expect(ran).toEqual(['bad', 'good']);
    expect(summary).toEqual({ jobsRun: 1, errors: 2 });
    expect(lines.join('\n')).toContain('database blip');
    expect(lines.join('\n')).toContain('boom');
  });

  it('gives each slot its own name when claiming, for debugging', async () => {
    const controller = new AbortController();
    const names: string[] = [];
    await runWorker({
      workerId: 'w',
      claim: async (name) => {
        names.push(name);
        if (names.length >= 2) controller.abort();
        return null;
      },
      run: async () => undefined,
      signal: controller.signal,
      concurrency: 2,
      pollIntervalMs: 1,
      log: quiet,
    });
    expect(names.sort()).toEqual(['w#1', 'w#2']);
  });
});

describe('worker with the real queue', () => {
  it('claims a queued job and runs it through runEraJob in dry-run mode', async () => {
    vi.stubEnv('NEXT_PUBLIC_USE_MOCKS', '1');
    process.env.VIDEO_GENERATION = 'on';
    const eraId = eraIdOf('natural-history-museum', 1862);
    process.env.VIDEO_ERAS = eraId;
    const outcome = await requestEraGeneration(eraId, true);
    const jobId = outcome.ok ? outcome.response.job?.id : undefined;
    expect(jobId).toBeTruthy();

    const controller = new AbortController();
    await runWorker({
      workerId: 'w',
      claim: claimNextJob,
      run: async (job) => {
        await runEraJob(job);
        controller.abort();
      },
      signal: controller.signal,
      pollIntervalMs: 1,
      log: quiet,
    });
    delete process.env.VIDEO_GENERATION;
    delete process.env.VIDEO_ERAS;

    expect(await getEra(eraId)).toMatchObject({ state: 'ready', videoState: 'ready' });
    expect((await getJob(jobId as string))?.state).toBe('succeeded');
  });
});
