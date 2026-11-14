# src/lib/jobs

The generation job queue. Owner: Agent 1. MASTER.md sections 4.4 and 5.3, tasks A1-10 and A1-14.

**Entry points** (`import { ... } from '@/lib/jobs'`):
- Worker side: `claimNextJob(workerId)`, `patchStage(jobId, key, patch)`, `heartbeatJob(jobId)`, `finishJob(jobId, state)`, `getJob(jobId)`, and `releaseJob(jobId)` (a worker shutting down on purpose puts its running job back in the queue, so the next worker resumes at once instead of waiting out the lease; stages and saved fal request ids are kept, and it stays the era's active job).
- API side: `requestEraGeneration(eraId, includeVideo)` (the whole rule behind POST generate), `enqueueEraJob`, `getActiveJob`, `videoGenerationEnabled()`.

**Guarantees.** One active job per era (unique partial index on `eraId` where `active` is true). Atomic claims. A running job not updated for `JOB_LEASE_MS` (10 min) is handed to the next worker, which resumes from the saved `falRequestId`s. `patchStage` renews the lease; call `heartbeatJob` during long fal waits.

**Who writes era state.** `requestEraGeneration` moves idle tiers to `queued`. The pipeline (Agent 2) moves them to `generating`, `ready` or `failed` with `patchEra`.

**Test:** `npm run test` (`jobs.test.ts`), in-memory backend. The MongoDB backend was verified on real Atlas on 14 Nov 2026 with throwaway-database scripts, which are not kept in the repo.

**Traps**
- Without `MONGODB_URI` the queue lives in one process's memory, so a worker started with `npm run worker` cannot see jobs created by `npm run dev`. Use Atlas to run the two together.
- `VIDEO_GENERATION` must be exactly `on` for video jobs. Anything else returns 403 `video_disabled`.
