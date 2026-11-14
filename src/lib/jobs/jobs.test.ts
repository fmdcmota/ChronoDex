/**
 * Tests for the M0 in-memory stubs of src/lib/jobs, src/lib/db and src/lib/pipeline, run together
 * as the worker will run them. Owner: Agent 1.
 */
import { describe, expect, it } from 'vitest';
import { eraIdOf } from '@/lib/contracts';
import { getEra, patchEra } from '@/lib/db';
import { runEraJob } from '@/lib/pipeline';
import { claimNextJob, enqueueEraJob, finishJob, getActiveJob, patchStage } from './index';

describe('jobs stub', () => {
  it('keeps one active job per era, claims it, and frees it when finished', async () => {
    const eraId = eraIdOf('exhibition-road', 1862);
    const a = await enqueueEraJob(eraId, false);
    const b = await enqueueEraJob(eraId, true);
    expect(b.id).toBe(a.id);

    const claimed = await claimNextJob('w1');
    expect(claimed?.id).toBe(a.id);
    expect(claimed?.state).toBe('running');
    expect(await claimNextJob('w2')).toBeNull();

    const patched = await patchStage(a.id, 'brief', { state: 'done', falRequestId: 'r1' });
    expect(patched.stages[0]).toMatchObject({ key: 'brief', state: 'done', falRequestId: 'r1' });
    await expect(patchStage(a.id, 'talk', { state: 'done' })).rejects.toThrow();

    await finishJob(a.id, 'failed');
    expect(await getActiveJob(eraId)).toBeNull();
    expect((await enqueueEraJob(eraId, false)).id).not.toBe(a.id);
  });

  it('runs a whole job through the pipeline stub and fills the era', async () => {
    const eraId = eraIdOf('natural-history-museum', 1862);
    await enqueueEraJob(eraId, true);
    let job = await claimNextJob('w');
    // Drain any job left queued by another test first.
    while (job && job.eraId !== eraId) {
      await finishJob(job.id, 'failed');
      job = await claimNextJob('w');
    }
    expect(job).not.toBeNull();
    await runEraJob(job!);
    const era = await getEra(eraId);
    expect(era?.state).toBe('ready');
    expect(era?.videoState).toBe('ready');
    expect(await getActiveJob(eraId)).toBeNull();
  });

  it('patchEra never changes the era id', async () => {
    const eraId = eraIdOf('huxley-building', 1885);
    const era = await patchEra(eraId, { id: 'evil_1', title: 'x' });
    expect(era.id).toBe(eraId);
    expect(era.title).toBe('x');
  });
});
