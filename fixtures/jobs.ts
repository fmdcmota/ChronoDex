/**
 * Sample jobs, one in each state, for building the progress sheet and for tests.
 *
 * Owner: Agent 1 (Core). Task A1-04.
 *
 * These are examples of the Job shape. They are not tied to the eras' states and the seed script
 * does not insert them. Mock mode creates its own jobs when `generate` is called.
 */
import { buildStages, eraIdOf, type Job, type JobStage } from '@/lib/contracts';
import { FIXTURE_TIMESTAMP } from './eras';

const STARTED = '2026-11-14T15:00:05.000Z';
const FINISHED = '2026-11-14T15:00:40.000Z';

/** Placeholder model name shown in sample stages. Real endpoint ids live only in src/lib/fal/models.ts. */
const SAMPLE_MODEL = 'sample-model';

/**
 * Build a stage list where the first `doneCount` stages are done, the next one is in `current`
 * state, and the rest are pending.
 */
function stagesWith(year: number, includeVideo: boolean, doneCount: number, current: JobStage['state'] | null, error: string | null = null): JobStage[] {
  return buildStages(year, includeVideo).map((stage, i) => {
    if (i < doneCount) {
      return { ...stage, state: 'done', model: SAMPLE_MODEL, startedAt: STARTED, finishedAt: FINISHED };
    }
    if (i === doneCount && current) {
      return {
        ...stage,
        state: current,
        model: SAMPLE_MODEL,
        falRequestId: current === 'running' ? 'sample-request-id' : null,
        startedAt: STARTED,
        finishedAt: current === 'failed' ? FINISHED : null,
        error: current === 'failed' ? error : null,
      };
    }
    return stage;
  });
}

/**
 * Make a sample job.
 *
 * @param id - Job id.
 * @param landmarkId - Landmark.
 * @param year - Year.
 * @param state - Job state.
 * @param includeVideo - Whether the video tier is included.
 * @param stages - Stage list.
 * @returns The job.
 */
function job(id: string, landmarkId: string, year: number, state: Job['state'], includeVideo: boolean, stages: JobStage[]): Job {
  return { id, eraId: eraIdOf(landmarkId, year), includeVideo, state, stages, createdAt: FIXTURE_TIMESTAMP, updatedAt: FIXTURE_TIMESTAMP };
}

/** Keys of the sample jobs, one per job state. */
export type SampleJobKey = Job['state'];

/** One sample job in each state. */
export const sampleJobs: Record<SampleJobKey, Job> = {
  queued: job('job-sample-queued', 'royal-albert-hall', 1871, 'queued', false, stagesWith(1871, false, 0, null)),
  running: job('job-sample-running', 'natural-history-museum', 1881, 'running', true, stagesWith(1881, true, 2, 'running')),
  succeeded: job('job-sample-succeeded', 'queens-tower', 1893, 'succeeded', true, stagesWith(1893, true, 10, null)),
  failed: job('job-sample-failed', 'v-and-a', 1941, 'failed', false, stagesWith(1941, false, 2, 'failed', 'Sample failure: the panorama model returned no image')),
};
