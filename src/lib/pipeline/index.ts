/**
 * The era pipeline: runs every stage of one job and writes each result as it lands.
 *
 * Owner: Agent 2 (Studio). Created by Agent 1 as an M0 stub with the signature in MASTER.md
 * section 4.4. TODO(agent-2): A2-09 replaces the body with the real dependency graph of 5.1.
 *
 * The stub marks every stage done with a placeholder model and fills the era with fixture media,
 * so the API and screens can be tested against a "finished" job without spending anything.
 */
import { getEra, getLandmark, patchEra } from '@/lib/db';
import { finishJob, patchStage } from '@/lib/jobs';
import { parseEraId, type Job } from '@/lib/contracts';
import { placeholderBrief, populatedEra } from '@fixtures/index';

/**
 * Run a claimed job to the end.
 *
 * @param job - A job in state `running`, as returned by claimNextJob.
 * @returns Resolves when the job is finished, either way.
 */
export async function runEraJob(job: Job): Promise<void> {
  try {
    const { landmarkId, year } = parseEraId(job.eraId);
    const [landmark, era] = await Promise.all([getLandmark(landmarkId), getEra(job.eraId)]);
    if (!landmark || !era) throw new Error(`Era "${job.eraId}" or its landmark is missing`);
    // The stub never calls Claude, so it costs nothing. A2-09 calls writeEraBrief from @/lib/historian.
    const brief = placeholderBrief(landmark, year);
    for (const stage of job.stages) {
      const at = new Date().toISOString();
      await patchStage(job.id, stage.key, { state: 'done', model: 'stub', startedAt: at, finishedAt: at });
    }
    const filled = populatedEra(era, brief, job.includeVideo);
    await patchEra(job.eraId, filled);
    await finishJob(job.id, 'succeeded');
  } catch (err) {
    console.error('runEraJob stub failed', err);
    await finishJob(job.id, 'failed');
  }
}
