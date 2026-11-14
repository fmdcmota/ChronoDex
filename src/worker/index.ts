/**
 * `npm run worker`: the process that generates eras.
 *
 * Owner: Agent 2 (Studio). Implements MASTER.md section 2 and 4.4, task A2-10.
 *
 * Usage:
 *   npm run worker                   run until Ctrl+C
 *   WORKER_CONCURRENCY=2 npm run worker   run two jobs at once (default 1)
 *
 * It reads .env.local (the npm script passes --env-file-if-exists). It claims jobs that the API queued
 * in MongoDB, runs each with runEraJob and writes the results back. The API and this process only see
 * each other through MongoDB, so both must use the same MONGODB_URI and MONGODB_DB.
 *
 * Startup checks, so a misconfigured worker stops at once instead of failing every job:
 * - MONGODB_URI is required (set WORKER_ALLOW_MEMORY=1 to run on a private in-memory queue, which only
 *   makes sense for trying the loop itself).
 * - Unless NEXT_PUBLIC_USE_MOCKS=1 (a free dry run on fixtures), FAL_KEY and DEEPSEEK_API_KEY are required.
 *
 * Ctrl+C (SIGINT) or SIGTERM: stop claiming, give a running job SHUTDOWN_GRACE_MS to finish, then exit.
 * A job left behind keeps its saved fal request ids and is picked up by the next worker when its
 * lease runs out (10 minutes), resuming without paying twice. A second Ctrl+C exits at once.
 * Where it runs: a team laptop or a small VM (MASTER Q5). If it is down, finished eras still load.
 */
import os from 'node:os';
import { mongoConfigured, closeMongo } from '@/lib/db';
import { claimNextJob } from '@/lib/jobs';
import { runEraJob } from '@/lib/pipeline';
import { runWorker } from './loop';

/** How long a running job gets to finish after a shutdown request before the process exits anyway. */
const SHUTDOWN_GRACE_MS = 20_000;

/** Print a line with the time, so a log shows when things happened. */
function log(message: string): void {
  console.log(`${new Date().toISOString().slice(11, 19)} ${message}`);
}

/**
 * Check the environment. Returns what is wrong, one problem per entry; empty when fine.
 *
 * @returns Human-readable problems.
 */
function startupProblems(): string[] {
  const problems: string[] = [];
  if (!mongoConfigured() && process.env.WORKER_ALLOW_MEMORY !== '1') {
    problems.push('MONGODB_URI is not set. The worker cannot see jobs the API queued without a shared database (WORKER_ALLOW_MEMORY=1 overrides, for testing the loop only).');
  }
  if (process.env.NEXT_PUBLIC_USE_MOCKS !== '1') {
    if (!process.env.FAL_KEY) problems.push('FAL_KEY is not set (needed for every image, voice and video stage).');
    if (!process.env.DEEPSEEK_API_KEY) problems.push('DEEPSEEK_API_KEY is not set (needed for the Historian that writes each brief).');
  }
  return problems;
}

/** Start the worker and wire up shutdown. */
async function main(): Promise<void> {
  const problems = startupProblems();
  if (problems.length > 0) {
    for (const problem of problems) console.error(`Worker not started: ${problem}`);
    process.exit(1);
  }
  const dryRun = process.env.NEXT_PUBLIC_USE_MOCKS === '1';
  const concurrency = Number(process.env.WORKER_CONCURRENCY ?? 1) || 1;
  const workerId = `worker-${os.hostname()}-${process.pid}`;
  log(
    `${workerId} starting. Mode: ${dryRun ? 'DRY RUN on fixtures (spends nothing)' : 'REAL (spends fal and Historian credits)'}. ` +
      `Database: ${mongoConfigured() ? 'MongoDB' : 'in-memory (private to this process)'}. Concurrency: ${concurrency}.`,
  );

  const controller = new AbortController();
  let stopRequests = 0;
  const stop = (name: string): void => {
    stopRequests++;
    if (stopRequests > 1) {
      log(`${name} again: exiting now. A running job will be resumed by the next worker.`);
      process.exit(130);
    }
    log(`${name}: no new jobs. Waiting up to ${SHUTDOWN_GRACE_MS / 1000} s for running jobs (Ctrl+C again to exit now).`);
    controller.abort();
    setTimeout(() => {
      log('Grace period over: exiting. A running job keeps its saved fal request ids and the next worker resumes it.');
      process.exit(0);
    }, SHUTDOWN_GRACE_MS).unref();
  };
  process.on('SIGINT', () => stop('SIGINT'));
  process.on('SIGTERM', () => stop('SIGTERM'));

  const summary = await runWorker({ workerId, claim: claimNextJob, run: runEraJob, signal: controller.signal, concurrency, log });
  log(`Stopped. Jobs run: ${summary.jobsRun}. Errors survived: ${summary.errors}.`);
  await closeMongo();
}

main().catch((err: unknown) => {
  console.error('Worker crashed:', err);
  process.exit(1);
});
