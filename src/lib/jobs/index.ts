/**
 * Public entry point of the job system: `import { ... } from '@/lib/jobs'`.
 *
 * Owner: Agent 1 (Core). Implements MASTER.md section 4.4 (src/lib/jobs), task A1-10.
 * The queue is in ./queue.ts. The rule for when a generate request creates a job is in ./generate.ts.
 */
export {
  JOB_LEASE_MS,
  claimNextJob,
  countFailedJobs,
  enqueueEraJob,
  finishJob,
  getActiveJob,
  getJob,
  heartbeatJob,
  patchStage,
  releaseJob,
  resetMemoryJobs,
} from './queue';
export { maxFailedJobsPerEra, requestEraGeneration, videoEraAllowList, videoGenerationEnabled, type GenerateOptions, type GenerationOutcome } from './generate';
