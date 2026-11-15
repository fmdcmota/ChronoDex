/**
 * The generation job queue itself. Import it through "@/lib/jobs" (./index.ts).
 *
 * Owner: Agent 1 (Core). Implements MASTER.md sections 4.4 and 5.3, task A1-10.
 *
 * Backends: MongoDB when MONGODB_URI is set, otherwise an in-memory queue (see src/lib/db).
 * Guarantees:
 * - At most one active (queued or running) job per era. In MongoDB a unique partial index enforces
 *   it, so two players asking at the same moment share one job and fal is never paid twice.
 * - Claiming is atomic (findOneAndUpdate), so several workers can run at once.
 * - A running job whose worker went quiet for JOB_LEASE_MS is handed to the next worker that
 *   asks. Every patchStage call renews the lease; long stages should call heartbeatJob.
 *   The new worker resumes from the saved falRequestId of each stage (MASTER.md 5.3 rule 2).
 */
import { buildStages, parseEraId, type EraId, type Job, type JobStage, type StageKey } from '@/lib/contracts';
import { usingMongo } from '@/lib/db';
import { collections, fromJobDoc, isDuplicateKeyError } from '@/lib/db/mongo';

/** How long a running job may go without a stage update or heartbeat before another worker may take it. */
export const JOB_LEASE_MS = 10 * 60 * 1000;

/** Job states that count as active. */
const ACTIVE_STATES: readonly Job['state'][] = ['queued', 'running'];

// ---------------------------------------------------------------------------
// In-memory backend
// ---------------------------------------------------------------------------

interface MemoryJob {
  job: Job;
  workerId: string | null;
}

const GLOBAL_KEY = '__chronodexMemoryJobs';

/** The in-memory queue, created on first use. Kept on globalThis to survive hot reloads. */
function memory(): Map<string, MemoryJob> {
  const g = globalThis as typeof globalThis & { [GLOBAL_KEY]?: Map<string, MemoryJob> };
  g[GLOBAL_KEY] ??= new Map();
  return g[GLOBAL_KEY];
}

/** Empty the in-memory queue. Tests only. Has no effect on MongoDB. */
export function resetMemoryJobs(): void {
  delete (globalThis as typeof globalThis & { [GLOBAL_KEY]?: Map<string, MemoryJob> })[GLOBAL_KEY];
}

/**
 * Find a job in memory, or fail.
 *
 * @param jobId - Job id.
 * @returns The stored entry (not a copy).
 * @throws Error when there is no job with that id.
 */
function mustGetMemory(jobId: string): MemoryJob {
  const entry = memory().get(jobId);
  if (!entry) throw new Error(`No job "${jobId}"`);
  return entry;
}

/**
 * The time before which a running job's lease has expired.
 *
 * @param nowMs - Current time in milliseconds.
 * @returns ISO timestamp.
 */
function leaseCutoff(nowMs: number): string {
  return new Date(nowMs - JOB_LEASE_MS).toISOString();
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Queue a generation job for an era, unless one is already active.
 *
 * When an active job exists it is returned unchanged, even if it has a different includeVideo.
 * Ask again after it finishes to add the video tier.
 *
 * @param eraId - The era to generate.
 * @param includeVideo - False runs the core tier only.
 * @returns The new job, or the era's existing active job.
 * @throws Error when eraId is malformed.
 */
export async function enqueueEraJob(eraId: EraId, includeVideo: boolean): Promise<Job> {
  const { year } = parseEraId(eraId);
  const existing = await getActiveJob(eraId);
  if (existing) return existing;

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

  if (!usingMongo()) {
    memory().set(job.id, { job: structuredClone(job), workerId: null });
    return job;
  }
  const { jobs } = await collections();
  try {
    await jobs.insertOne({ ...job, _id: job.id, active: true });
    return job;
  } catch (err) {
    // Another request created the era's job between our check and our insert: use theirs.
    if (!isDuplicateKeyError(err)) throw err;
    const winner = await getActiveJob(eraId);
    if (!winner) throw err;
    return winner;
  }
}

/**
 * How many jobs for an era have ended in failure. The generate rule uses this to stop an era that keeps
 * failing from spending fal credits again and again (task A1-f).
 *
 * @param eraId - The era.
 * @returns The number of finished jobs whose state is `failed`.
 */
export async function countFailedJobs(eraId: EraId): Promise<number> {
  if (!usingMongo()) return [...memory().values()].filter((e) => e.job.eraId === eraId && e.job.state === 'failed').length;
  const { jobs } = await collections();
  return jobs.countDocuments({ eraId, state: 'failed' });
}

/**
 * The era's active (queued or running) job.
 *
 * @param eraId - The era.
 * @returns The job, or null when none is active.
 */
export async function getActiveJob(eraId: EraId): Promise<Job | null> {
  if (!usingMongo()) {
    const entry = [...memory().values()].find((e) => e.job.eraId === eraId && ACTIVE_STATES.includes(e.job.state));
    return entry ? structuredClone(entry.job) : null;
  }
  const { jobs } = await collections();
  const doc = await jobs.findOne({ eraId, active: true });
  return doc ? fromJobDoc(doc) : null;
}

/**
 * Get any job by id.
 *
 * @param jobId - Job id.
 * @returns The job, or null.
 */
export async function getJob(jobId: string): Promise<Job | null> {
  if (!usingMongo()) {
    const entry = memory().get(jobId);
    return entry ? structuredClone(entry.job) : null;
  }
  const { jobs } = await collections();
  const doc = await jobs.findOne({ _id: jobId });
  return doc ? fromJobDoc(doc) : null;
}

/**
 * Take the next job and mark it running. Safe for several workers at once.
 *
 * Picks the oldest queued job, or else the oldest running job whose lease has expired (its worker
 * died). A reclaimed job keeps its stages, so the new worker can resume from saved fal request ids.
 *
 * @param workerId - Who is claiming. Stored on the job for debugging.
 * @returns The claimed job, or null when there is nothing to do.
 */
export async function claimNextJob(workerId: string): Promise<Job | null> {
  const nowMs = Date.now();
  const now = new Date(nowMs).toISOString();
  const cutoff = leaseCutoff(nowMs);

  if (!usingMongo()) {
    const candidates = [...memory().values()]
      .filter((e) => e.job.state === 'queued' || (e.job.state === 'running' && e.job.updatedAt < cutoff))
      .sort((a, b) => a.job.createdAt.localeCompare(b.job.createdAt));
    const next = candidates[0];
    if (!next) return null;
    next.job.state = 'running';
    next.job.updatedAt = now;
    next.workerId = workerId;
    return structuredClone(next.job);
  }

  const { jobs } = await collections();
  const update = { $set: { state: 'running' as const, updatedAt: now, workerId } };
  const options = { sort: { createdAt: 1 as const }, returnDocument: 'after' as const };
  // Queued jobs first, so a stuck job never starves new ones.
  const queued = await jobs.findOneAndUpdate({ state: 'queued' }, update, options);
  if (queued) return fromJobDoc(queued);
  const stale = await jobs.findOneAndUpdate({ state: 'running', updatedAt: { $lt: cutoff } }, update, options);
  return stale ? fromJobDoc(stale) : null;
}

/**
 * Update one stage of a job, for example to save the fal request id or mark it done.
 * Also renews the job's lease.
 *
 * Save `falRequestId` as soon as fal accepts a request, so a restarted worker resumes instead of
 * paying twice (MASTER.md 5.3 rule 2).
 *
 * @param jobId - Job id.
 * @param key - Stage to update.
 * @param patch - Fields to set. `key` cannot be changed. Undefined values are ignored.
 * @returns The job after the update.
 * @throws Error when the job or the stage does not exist.
 */
export async function patchStage(jobId: string, key: StageKey, patch: Partial<Omit<JobStage, 'key'>>): Promise<Job> {
  const fields = Object.fromEntries(
    Object.entries(patch).filter(([field, value]) => field !== 'key' && value !== undefined),
  ) as Partial<Omit<JobStage, 'key'>>;
  const now = new Date().toISOString();

  if (!usingMongo()) {
    const { job } = mustGetMemory(jobId);
    const stage = job.stages.find((s) => s.key === key);
    if (!stage) throw new Error(`Job "${jobId}" has no stage "${key}"`);
    Object.assign(stage, fields);
    job.updatedAt = now;
    return structuredClone(job);
  }

  const { jobs } = await collections();
  const set: Record<string, unknown> = { updatedAt: now };
  for (const [field, value] of Object.entries(fields)) set[`stages.$.${field}`] = value;
  const doc = await jobs.findOneAndUpdate({ _id: jobId, 'stages.key': key }, { $set: set }, { returnDocument: 'after' });
  if (!doc) {
    const exists = await jobs.findOne({ _id: jobId }, { projection: { _id: 1 } });
    throw new Error(exists ? `Job "${jobId}" has no stage "${key}"` : `No job "${jobId}"`);
  }
  return fromJobDoc(doc);
}

/**
 * Renew a running job's lease without changing anything else. Call it from stages that wait on
 * fal for minutes (the 45 s talk video), at least every few minutes.
 *
 * @param jobId - Job id.
 * @returns Resolves when renewed.
 * @throws Error when the job does not exist.
 */
export async function heartbeatJob(jobId: string): Promise<void> {
  const now = new Date().toISOString();
  if (!usingMongo()) {
    mustGetMemory(jobId).job.updatedAt = now;
    return;
  }
  const { jobs } = await collections();
  const result = await jobs.updateOne({ _id: jobId }, { $set: { updatedAt: now } });
  if (result.matchedCount === 0) throw new Error(`No job "${jobId}"`);
}

/**
 * Put a running job back in the queue, for example when a worker shuts down on purpose, so the next
 * worker takes it at once instead of waiting out the 10 minute lease.
 *
 * The job keeps its stages and their saved fal request ids, so the next worker resumes rather
 * than paying twice (MASTER.md 5.3 rule 2). It keeps its place in the queue (claiming is by
 * creation time) and it stays the era's active job, so nobody can queue a second one meanwhile.
 * A job that is not running (queued, or already finished) is left alone.
 *
 * @param jobId - Job id.
 * @returns The job after the change, or null when it was not running or does not exist.
 */
export async function releaseJob(jobId: string): Promise<Job | null> {
  const now = new Date().toISOString();
  if (!usingMongo()) {
    const entry = memory().get(jobId);
    if (!entry || entry.job.state !== 'running') return null;
    entry.job.state = 'queued';
    entry.job.updatedAt = now;
    entry.workerId = null;
    return structuredClone(entry.job);
  }
  const { jobs } = await collections();
  const doc = await jobs.findOneAndUpdate(
    { _id: jobId, state: 'running' },
    { $set: { state: 'queued', updatedAt: now }, $unset: { workerId: '' } },
    { returnDocument: 'after' },
  );
  return doc ? fromJobDoc(doc) : null;
}

/**
 * Mark a job finished. It stops being the era's active job, so the era can be generated again.
 *
 * @param jobId - Job id.
 * @param state - The outcome.
 * @returns The finished job.
 * @throws Error when the job does not exist.
 */
export async function finishJob(jobId: string, state: 'succeeded' | 'failed'): Promise<Job> {
  const now = new Date().toISOString();
  if (!usingMongo()) {
    const { job } = mustGetMemory(jobId);
    job.state = state;
    job.updatedAt = now;
    return structuredClone(job);
  }
  const { jobs } = await collections();
  const doc = await jobs.findOneAndUpdate(
    { _id: jobId },
    { $set: { state, updatedAt: now }, $unset: { active: '' } },
    { returnDocument: 'after' },
  );
  if (!doc) throw new Error(`No job "${jobId}"`);
  return fromJobDoc(doc);
}
