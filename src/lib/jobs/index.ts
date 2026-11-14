/**
 * The generation job queue. The API enqueues; the worker claims, reports stages and finishes.
 *
 * Owner: Agent 1 (Core). Implements MASTER.md section 4.4 (src/lib/jobs).
 *
 * M0 STUB: an in-memory queue, so Agent 2 can drive the pipeline from a script today.
 * TODO(agent-1): A1-10 replaces the bodies with MongoDB (one active job per era enforced by a
 * unique partial index, atomic claim with findOneAndUpdate). Signatures will not change.
 */
import { buildStages, parseEraId, type EraId, type Job, type JobStage, type StageKey } from '@/lib/contracts';

const GLOBAL_KEY = '__chronodexMemoryJobs';

/** The in-memory queue, created on first use. Kept on globalThis to survive hot reloads. */
function memory(): Map<string, Job> {
  const g = globalThis as typeof globalThis & { [GLOBAL_KEY]?: Map<string, Job> };
  g[GLOBAL_KEY] ??= new Map();
  return g[GLOBAL_KEY];
}

/** A job that has not finished. */
function isActive(job: Job): boolean {
  return job.state === 'queued' || job.state === 'running';
}

/**
 * Find a job, or fail.
 *
 * @param jobId - Job id.
 * @returns The stored job (not a copy).
 * @throws Error when there is no job with that id.
 */
function mustGet(jobId: string): Job {
  const job = memory().get(jobId);
  if (!job) throw new Error(`No job "${jobId}"`);
  return job;
}

/**
 * Queue a generation job for an era, unless one is already active.
 *
 * Only one job per era may be active, so two players asking for the same year share one job and
 * fal is never paid twice (MASTER.md 5.3 rule 4).
 *
 * @param eraId - The era to generate.
 * @param includeVideo - False runs the core tier only.
 * @returns The new job, or the era's existing active job.
 * @throws Error when eraId is malformed.
 */
export async function enqueueEraJob(eraId: EraId, includeVideo: boolean): Promise<Job> {
  const existing = await getActiveJob(eraId);
  if (existing) return existing;
  const { year } = parseEraId(eraId);
  const now = new Date().toISOString();
  const job: Job = {
    id: `job-${crypto.randomUUID()}`,
    eraId,
    includeVideo,
    state: 'queued',
    stages: buildStages(year, includeVideo),
    createdAt: now,
    updatedAt: now,
  };
  memory().set(job.id, job);
  return structuredClone(job);
}

/**
 * The era's active (queued or running) job.
 *
 * @param eraId - The era.
 * @returns The job, or null when none is active.
 */
export async function getActiveJob(eraId: EraId): Promise<Job | null> {
  const job = [...memory().values()].find((j) => j.eraId === eraId && isActive(j));
  return job ? structuredClone(job) : null;
}

/**
 * Take the oldest queued job and mark it running. Safe for several workers at once.
 *
 * @param workerId - Who is claiming, for logs. Not stored by the stub.
 * @returns The claimed job, or null when the queue is empty.
 */
export async function claimNextJob(workerId: string): Promise<Job | null> {
  void workerId;
  const next = [...memory().values()]
    .filter((j) => j.state === 'queued')
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))[0];
  if (!next) return null;
  next.state = 'running';
  next.updatedAt = new Date().toISOString();
  return structuredClone(next);
}

/**
 * Update one stage of a job, for example to save the fal request id or mark it done.
 *
 * Save `falRequestId` as soon as fal accepts a request, so a restarted worker resumes instead of
 * paying twice (MASTER.md 5.3 rule 2).
 *
 * @param jobId - Job id.
 * @param key - Stage to update.
 * @param patch - Fields to set. `key` cannot be changed.
 * @returns The job after the update.
 * @throws Error when the job or the stage does not exist.
 */
export async function patchStage(jobId: string, key: StageKey, patch: Partial<Omit<JobStage, 'key'>>): Promise<Job> {
  const job = mustGet(jobId);
  const stage = job.stages.find((s) => s.key === key);
  if (!stage) throw new Error(`Job "${jobId}" has no stage "${key}"`);
  Object.assign(stage, patch, { key });
  job.updatedAt = new Date().toISOString();
  return structuredClone(job);
}

/**
 * Mark a job finished. It stops being the era's active job.
 *
 * @param jobId - Job id.
 * @param state - The outcome.
 * @returns The finished job.
 * @throws Error when the job does not exist.
 */
export async function finishJob(jobId: string, state: 'succeeded' | 'failed'): Promise<Job> {
  const job = mustGet(jobId);
  job.state = state;
  job.updatedAt = new Date().toISOString();
  return structuredClone(job);
}
