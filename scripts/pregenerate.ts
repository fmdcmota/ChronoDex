/**
 * `scripts/pregenerate.ts`: generate every seeded era overnight, then stop.
 *
 * Owner: Agent 2 (Studio). Implements MASTER.md section 11, task A2-13, and the M4 gate ("demo eras pre-generated
 * overnight").
 *
 * Usage (repo root; MONGODB_URI, MONGODB_DB, FAL_KEY and DEEPSEEK_API_KEY in .env.local; NEXT_PUBLIC_USE_MOCKS empty):
 *   npx tsx --env-file=.env.local scripts/pregenerate.ts --dry-run          the plan and the estimated cost, spends nothing
 *   npx tsx --env-file=.env.local scripts/pregenerate.ts                    core tier for every era that is not ready
 *   npx tsx --env-file=.env.local scripts/pregenerate.ts --video            also the guide video (needs VIDEO_GENERATION=on)
 *   add --only queens-tower_1893 (repeatable) to limit it, --concurrency 2 to change how many run at once
 *   add --max-usd 20 to refuse to start when the estimate is higher
 *
 * What it does: asks the API's own rule (requestEraGeneration) to queue each era that needs it, runs the queue with
 * the same worker loop and the same runEraJob as `npm run worker`, and exits when the queue is empty. Eras already
 * `ready` are skipped, so it is safe to run again after a failure: it repeats only what is missing and never pays
 * twice for a finished piece. It prints a table with the time and an estimated cost per era, and writes
 * pregenerate-log.json next to the repo root's spikes output for the notes.
 * Cost: the estimate printed first. Use --dry-run to see it. Stop it any time with Ctrl+C: a running job keeps its
 * saved fal request ids and the next run resumes it.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import os from 'node:os';
import { closeMongo, getEra, listLandmarks, mongoConfigured } from '@/lib/db';
import { claimNextJob, requestEraGeneration, videoGenerationEnabled } from '@/lib/jobs';
import { estimateEraCostUsd, runEraJob } from '@/lib/pipeline';
import { eraIdOf, type EraId } from '@/lib/contracts';
import { runWorker } from '../src/worker/loop';

/** Where the run log goes. spikes/agent-2/out is git-ignored. */
const LOG_PATH = 'spikes/agent-2/out/pregenerate-log.json';
/** Jobs at once by default. Each mostly waits on fal; two is a gentle load on credits and rate limits. */
const DEFAULT_CONCURRENCY = 2;

/** Read the value after a flag, or null. */
function flagValue(args: string[], flag: string): string | null {
  const i = args.indexOf(flag);
  return i >= 0 && args[i + 1] ? args[i + 1] : null;
}

/** Run the script. */
async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const includeVideo = args.includes('--video');
  const concurrency = Number(flagValue(args, '--concurrency') ?? DEFAULT_CONCURRENCY) || DEFAULT_CONCURRENCY;
  const maxUsd = flagValue(args, '--max-usd');
  const only = args.flatMap((a, i) => (a === '--only' && args[i + 1] ? [args[i + 1]] : []));

  if (!dryRun) {
    if (!mongoConfigured()) throw new Error('MONGODB_URI is not set. Jobs must be in the shared database.');
    for (const key of ['FAL_KEY', 'DEEPSEEK_API_KEY'] as const) if (!process.env[key]) throw new Error(`${key} is not set.`);
    if (process.env.NEXT_PUBLIC_USE_MOCKS === '1') throw new Error('NEXT_PUBLIC_USE_MOCKS=1 would run a dry run on fixtures. Set it empty.');
    if (includeVideo && !videoGenerationEnabled()) throw new Error('--video needs VIDEO_GENERATION=on (the switch that protects credits).');
  }

  const landmarks = await listLandmarks();
  const allIds: EraId[] = landmarks.flatMap((l) => l.eraYears.map((year) => eraIdOf(l.id, year)));
  const wanted = only.length ? allIds.filter((id) => only.includes(id)) : allIds;
  if (only.length && wanted.length !== only.length) throw new Error(`Unknown era in --only. Known eras: ${allIds.join(', ')}`);

  const toRun: EraId[] = [];
  for (const id of wanted) {
    const era = await getEra(id);
    const ready = era?.state === 'ready' && (!includeVideo || era.videoState === 'ready');
    console.log(`${ready ? 'ready  ' : 'to do  '} ${id}${era ? ` (core ${era.state}, video ${era.videoState})` : ' (missing)'}`);
    if (!ready) toRun.push(id);
  }
  const each = estimateEraCostUsd(includeVideo);
  const estimate = Math.round(toRun.length * each.totalUsd * 100) / 100;
  console.log(`\n${toRun.length} era(s) to generate at about ${each.totalUsd.toFixed(2)} USD each (core ${each.coreUsd.toFixed(2)}${includeVideo ? `, video ${each.videoUsd.toFixed(2)}` : ''}): about ${estimate.toFixed(2)} USD. Concurrency ${concurrency}.`);
  if (dryRun) return void console.log('Dry run: nothing queued.');
  if (maxUsd && estimate > Number(maxUsd)) throw new Error(`The estimate ${estimate} USD is over --max-usd ${maxUsd}. Nothing was started.`);
  if (toRun.length === 0) return void console.log('Nothing to do.');

  const startedMs = Date.now();
  for (const id of toRun) {
    const outcome = await requestEraGeneration(id, includeVideo);
    if (!outcome.ok) throw new Error(`Could not queue ${id}: ${outcome.message}`);
  }

  // Drain the queue: stop once nothing has been claimable for a few polls and nothing is running.
  const controller = new AbortController();
  let running = 0;
  let idlePolls = 0;
  process.on('SIGINT', () => {
    console.log('\nStopping: finishing running jobs, claiming no more (Ctrl+C again to exit now).');
    controller.abort();
    process.once('SIGINT', () => process.exit(130));
  });
  const summary = await runWorker({
    workerId: `pregenerate-${os.hostname()}-${process.pid}`,
    claim: async (name) => {
      const job = await claimNextJob(name);
      if (job) idlePolls = 0;
      else if (running === 0 && ++idlePolls >= 3) controller.abort();
      return job;
    },
    run: async (job) => {
      running++;
      try {
        await runEraJob(job);
      } finally {
        running--;
      }
    },
    signal: controller.signal,
    concurrency,
    pollIntervalMs: 2000,
    log: (line) => console.log(line),
  });

  const rows: { eraId: EraId; core: string; video: string; title: string | null }[] = [];
  for (const id of toRun) {
    const era = await getEra(id);
    rows.push({ eraId: id, core: era?.state ?? 'missing', video: era?.videoState ?? 'missing', title: era?.title ?? null });
  }
  const minutes = ((Date.now() - startedMs) / 60000).toFixed(1);
  console.log(`\nFinished in ${minutes} min. Jobs run: ${summary.jobsRun}. Estimated spend about ${estimate.toFixed(2)} USD.`);
  console.table(rows);
  await mkdir('spikes/agent-2/out', { recursive: true });
  await writeFile(LOG_PATH, JSON.stringify({ finishedAt: new Date().toISOString(), minutes: Number(minutes), includeVideo, estimatedUsd: estimate, rows }, null, 2));
  const notReady = rows.filter((r) => r.core !== 'ready' || (includeVideo && r.video !== 'ready'));
  if (notReady.length) {
    console.error(`${notReady.length} era(s) are not ready. Run the script again to repeat only what is missing.`);
    process.exitCode = 1;
  }
}

// Always close the database connection, even on an early return: an open MongoClient keeps the process alive.
main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  // Exit explicitly: the media store's own database connection would otherwise keep the process alive.
  .finally(() => closeMongo().catch(() => undefined).finally(() => process.exit(process.exitCode ?? 0)));
