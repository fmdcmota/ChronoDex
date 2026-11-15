/**
 * A2-r2-3: regenerate one era's scene and panorama so the scene is an edit of the current reference photo (Then/Now,
 * phone test 6.5). Clears only sceneImageUrl and panorama (the brief, headshot and narration are kept and skipped),
 * queues a core job through the API's own rule, runs it with the real worker loop and the real pipeline.
 * Owner: Agent 2. Spike script, not used by src/.
 *
 * Usage (repo root): MONGODB_DB=chronodex NEXT_PUBLIC_USE_MOCKS= node --import tsx --env-file=.env.local spikes/agent-2/regen-scene.mts queens-tower_1893
 * Cost: a scene and a panorama, about $0.35, up to about $0.70 when both need their retry.
 */
import { writeFileSync } from 'node:fs';
import { getEra, patchEra, closeMongo } from '../../src/lib/db/index.ts';
import { claimNextJob, getJob, requestEraGeneration } from '../../src/lib/jobs/index.ts';
import { realDeps, runEraJob } from '../../src/lib/pipeline/index.ts';
import { runWorker } from '../../src/worker/loop.ts';

const eraId = process.argv[2];
if (!eraId) throw new Error('usage: regen-scene.mts <eraId>');
const before = await getEra(eraId);
if (!before) throw new Error(`no era ${eraId}`);
console.log('before:', { state: before.state, scene: before.sceneImageUrl, panorama: before.panorama?.url });
await patchEra(eraId, { sceneImageUrl: null, panorama: null, state: 'missing' });

const outcome = await requestEraGeneration(eraId, false);
if (!outcome.ok || !outcome.response.job) throw new Error(`not queued: ${JSON.stringify(outcome)}`);
const jobId = outcome.response.job.id;
const controller = new AbortController();
const t = Date.now();
await runWorker({
  workerId: 'agent2-regen',
  claim: async (name) => {
    const job = await claimNextJob(name);
    if (job && job.id !== jobId) throw new Error(`claimed another job ${job.id}; stopping`);
    return job;
  },
  run: async (job) => {
    await runEraJob(job, realDeps);
    controller.abort();
  },
  signal: controller.signal,
  pollIntervalMs: 1000,
});
const job = await getJob(jobId);
for (const s of job!.stages) console.log(`  ${s.key.padEnd(10)} ${s.state.padEnd(8)} ${s.error ?? ''}`);
const after = await getEra(eraId);
console.log(`done in ${Math.round((Date.now() - t) / 1000)} s:`, { state: after?.state, scene: after?.sceneImageUrl, panorama: after?.panorama?.url });
writeFileSync(`spikes/agent-2/out/regen-${eraId}.json`, JSON.stringify(after, null, 1));
await closeMongo();
process.exit(0);
