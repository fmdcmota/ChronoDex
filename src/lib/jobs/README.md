# src/lib/jobs

The generation job queue. Owner: Agent 1. MASTER.md sections 4.4 and 5.3.

**Entry points:** `enqueueEraJob(eraId, includeVideo)`, `getActiveJob(eraId)`, `claimNextJob(workerId)`, `patchStage(jobId, key, patch)`, `finishJob(jobId, state)`.

**State at M0:** an in-memory stub. A1-10 swaps the bodies for MongoDB: one active job per era (unique partial index), atomic claim. Signatures stay the same.

**Test:** `npm run test` (`jobs.test.ts`, which also runs the pipeline stub end to end).

**Traps**
- One active job per era. Enqueueing again returns the existing job, so fal is never paid twice.
- Save `falRequestId` with `patchStage` the moment fal accepts a request, so a restarted worker resumes.
