/**
 * The worker's claim loop: take jobs from the queue and run them, with a clean shutdown.
 *
 * Owner: Agent 2 (Studio). Implements MASTER.md section 2 (the worker process) and 4.4, task A2-10.
 * Kept free of process and environment handling so it can be tested; the entry point is ./index.ts.
 *
 * Shutdown: when the signal aborts, no new job is claimed and sleeping slots wake at once. A job already
 * running is left to finish. If the caller gives up waiting and exits, the job stays `running` with its
 * fal request ids saved, and the next worker re-claims it once its lease runs out (jobs/README: 10
 * minutes) and resumes from those ids instead of paying twice.
 */
import type { Job } from '@/lib/contracts';

/** How long an idle slot waits before asking the queue again. */
export const DEFAULT_POLL_INTERVAL_MS = 2000;

/** What the loop needs. Everything but `workerId` and `signal` has a sensible default in index.ts. */
export interface WorkerOptions {
  /** Name stored on claimed jobs, for debugging. */
  workerId: string;
  /** Takes the next job, or null when the queue is empty. Production: claimNextJob. */
  claim: (workerId: string) => Promise<Job | null>;
  /** Runs one claimed job to the end. Production: runEraJob. */
  run: (job: Job) => Promise<void>;
  /** Aborting this stops claiming. Running jobs are not interrupted. */
  signal: AbortSignal;
  /** Jobs run at the same time. Each one mostly waits on fal, so a few is cheap. Default 1. */
  concurrency?: number;
  /** Milliseconds an idle slot sleeps. Default DEFAULT_POLL_INTERVAL_MS. */
  pollIntervalMs?: number;
  /** Where progress lines go. Default console.log. */
  log?: (message: string) => void;
}

/** Counts of what the loop did, returned when it stops. */
export interface WorkerSummary {
  /** Jobs claimed and run to the end (whether they succeeded or failed). */
  jobsRun: number;
  /** Times the claim or the run threw, which the loop survives. */
  errors: number;
}

/** Sleep for a while, waking early when the signal aborts. */
function sleep(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    if (signal.aborted) return resolve();
    const timer = setTimeout(resolve, ms);
    signal.addEventListener(
      'abort',
      () => {
        clearTimeout(timer);
        resolve();
      },
      { once: true },
    );
  });
}

/**
 * Run the claim loop until the signal aborts and every running job has finished.
 *
 * Side effects: claims and runs jobs, which call fal and the Historian and write to the database.
 * Never throws: a failed claim or run is logged, counted and the loop carries on after a pause.
 *
 * @param options - The queue functions, the abort signal and tuning. See WorkerOptions.
 * @returns How many jobs ran and how many errors were survived.
 */
export async function runWorker(options: WorkerOptions): Promise<WorkerSummary> {
  const { workerId, claim, run, signal } = options;
  const concurrency = Math.max(1, options.concurrency ?? 1);
  const pollIntervalMs = options.pollIntervalMs ?? DEFAULT_POLL_INTERVAL_MS;
  const log = options.log ?? ((message: string) => console.log(message));
  const summary: WorkerSummary = { jobsRun: 0, errors: 0 };

  /** One slot: claim, run, repeat. */
  async function slot(index: number): Promise<void> {
    const name = `${workerId}#${index + 1}`;
    while (!signal.aborted) {
      let job: Job | null = null;
      try {
        job = await claim(name);
      } catch (err) {
        summary.errors++;
        log(`[${name}] could not claim a job: ${err instanceof Error ? err.message : String(err)}`);
        await sleep(pollIntervalMs, signal);
        continue;
      }
      if (!job) {
        await sleep(pollIntervalMs, signal);
        continue;
      }
      log(`[${name}] running ${job.id} for ${job.eraId} (${job.includeVideo ? 'core and video' : 'core only'})`);
      const startMs = Date.now();
      try {
        await run(job);
        summary.jobsRun++;
        log(`[${name}] finished ${job.id} in ${Math.round((Date.now() - startMs) / 1000)} s`);
      } catch (err) {
        // runEraJob never throws, so this is a bug or an injected run. Keep the worker alive.
        summary.errors++;
        log(`[${name}] ${job.id} crashed the runner: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
  }

  await Promise.all(Array.from({ length: concurrency }, (_, index) => slot(index)));
  return summary;
}
