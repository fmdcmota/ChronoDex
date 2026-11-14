# Agent 1 notebook: Core

Only Agent 1 writes here. Rules: `MASTER.md` section 8.5. Task details: `MASTER.md` section 11.
Questions and requests to other agents go on `BOARD.md`, not here.

## Current state

Rewrite this block before you stop, so a fresh session can continue from it alone.

- Last updated: 2026-11-14 16:45
- Working on: database, jobs, routes and dev flags written on branch `agent-1` (A1-08, A1-09, A1-10, A1-14), not yet committed. `npm run check` passes (78 tests).
- Next: on a yes, commit and push. Then, once `MONGODB_URI` exists: `npm run seed`, then run the API against Atlas to verify the MongoDB backend (it has never touched a live server). Then A1-11 (Historian) and A1-13 (chat), which need `ANTHROPIC_API_KEY`.
- Blocked on: H2 keys (`MONGODB_URI`, `ANTHROPIC_API_KEY`). H1 photos for A1-08 part 2 (GPS into photoSpot, 16:9 normalising).
- Board read up to: 2026-11-14 15:55 (agent-4, A4-01). Nothing newer on origin/main at 16:45.
- Waiting for commit approval: the A1-08/09/10/14 commit.
- Local machine: Node 26.13.1 was installed with winget. In Git Bash, prefix commands with `export PATH="/c/Program Files/nodejs:$PATH"` until the shell is restarted.

## Tasks

- [x] A1-01 Scaffold the Next.js app at the repo root
- [x] A1-02 Install the shared dependencies, record versions
- [x] A1-03 Contracts: types, zod schemas, helpers with tests
- [x] A1-04 Fixtures
- [x] A1-05 Typed API client with mock mode
- [x] A1-06 Stubs for cross-agent functions, placeholder pages
- [x] A1-07 Tooling, `.env.example`, README run section. Push. Announce M0
- [ ] A1-08 Database layer and seed script (code done, MongoDB unverified; photo GPS and 16:9 step waits for H1)
- [x] A1-09 API routes: landmarks, eras, generate, captures, dex
- [ ] A1-10 Jobs library (code done, MongoDB unverified)
- [ ] A1-11 Historian: `writeEraBrief`
- [ ] A1-12 Deploy to Vercel, check on a phone
- [ ] A1-13 Chat route
- [x] A1-14 Development flags
- [ ] A1-15 Run each gate with a human, log results on the front page
- [ ] A1-16 Briefs for every demo era, human-checked

## Log

Newest at the bottom. One entry per task or per session, in this shape:

    ### YYYY-MM-DD HH:MM, <task id>: <title>
    - Did:
    - Decided, and why:
    - Measured or verified:
    - Delegated to Haiku, and whether it was kept:
    - Problems:
    - Next:

### 2026-11-14 16:30, A1-01 to A1-07: M0 foundation
- Did: scaffolded Next.js 16.4.6 (React 19.3, Tailwind 4.3, ESLint 9, TypeScript 5.9) in a temp folder and moved it in, keeping every document. Pinned `.nvmrc` to 24. Installed the shared dependencies. Wrote `src/lib/contracts` (types from 4.1 unchanged, API bodies, zod schemas with a compile-time drift check, the 4.2 helpers, `resolveCapture`, stage list and labels), `fixtures/` (6 landmarks, 10 eras with `queens-tower_1893` fully populated, a sample job in each state, placeholder media), `src/lib/client` (typed client, mock mode with a fake 20 s job, SSE parser, player id), in-memory stubs for every 4.4 export (db, jobs, historian, and Agent 2's fal and pipeline), placeholder pages for all five routes that use the client, `.env.example`, README "Run it", a README per owned directory, `npm run check`, `seed` (dry run) and `worker` scripts, and the jsdoc lint rule. A1-07 stays unticked until the push and the M0 announcement.
- Installed versions: next 16.4.6, react 19.3.0, @fal-ai/client 1.11.0, @anthropic-ai/sdk 1.8.0, mongodb 7.9.0, zod 4.6.7, maplibre-gl 6.18.0, @photo-sphere-viewer/core 5.15.1, @photo-sphere-viewer/gyroscope-plugin 5.15.1, swr 2.5.1; dev: tsx 4.23.15, vitest 5.1.0, eslint-plugin-jsdoc 65.4.7, dotenv 18.0.10, @types/node 24.19.2, typescript 5.9.3.
- Decided, and why: `cacheComponents` and `partialPrefetching` off (D-014). `agentRules: false` so `next dev` stops writing to the humans' AGENTS.md (F-014). Node 24 line for types and `.nvmrc`, because vitest 5 needs @types/node 22 or later and Vercel certainly runs 24 (D-015). Fixtures are TypeScript, not JSON, so the type checker enforces their shape (D-016). Added to the contracts before the freeze (C-001): `api.ts` request and response types, `CaptureRequest.location` nullable plus optional `spoofed`, `resolveCapture`, `stages.ts`. No `server-only` import in db or jobs: it throws outside Next's server bundle, which would break the tsx worker.
- Measured or verified: `npm run check` passes, 59 tests. `next build` succeeds. `next dev` with mocks on serves all five routes with 200. The lint rule catches undocumented exported interfaces, types, constants, functions and arrow functions, and an empty `/** */`. The schema drift check fails the type check when a field is added (tried). The sample media hosts send `Access-Control-Allow-Origin: *`; the sample panorama is 2000 x 1000.
- Not verified: the placeholder pages in a real browser or on a phone (only the server-rendered HTML was fetched). The scaffolder's refusal of a non-empty folder was sidestepped, not tested. Landmark coordinates are hand-placed estimates.
- Delegated to Haiku, and whether it was kept: nothing. The work was mostly contract and mock design, which the sheet says to keep, and the rest was quicker to write than to brief and review.
- Problems: Node was not installed on this machine, so I installed Node 26.13.1 LTS with winget. npm 11 skips esbuild's postinstall by default (F-015); tsx and vitest work without it. `npm run worker` fails until Agent 2 adds `src/worker/index.ts` (asked on the board).
- Next: commit and push on a yes, then A1-08.

### 2026-11-14 16:45, A1-08, A1-09, A1-10, A1-14: database, routes, jobs, dev flags
- Did: `src/lib/db` now has two backends behind the same functions: MongoDB (`mongo.ts`: cached client, small pool, 8 s server-selection timeout, indexes on first use) when `MONGODB_URI` is set, the in-memory fixture store otherwise. Added `listCaptures`, `insertCapture` (keeps the first capture per player and landmark), `upsertLandmark`, `insertEraIfMissing`, `closeMongo`. `src/lib/jobs` split into `queue.ts` (enqueue, claim, patchStage, heartbeatJob, finishJob, getJob) and `generate.ts` (`requestEraGeneration`, the whole generate rule including `VIDEO_GENERATION`). Six routes in `src/app/api` with shared helpers in `_lib/http.ts`. `scripts/seed.ts` writes to MongoDB, with `--dry-run`. READMEs for db, jobs and api.
- Decided, and why: one active job per era through a unique partial index on `eraId` where `active: true` (removed on finish), not a filter on `state`, because a storage-only boolean flag is the simplest partial filter to rely on. A 10-minute job lease so a crashed worker's job is picked up again; `patchStage` renews it, `heartbeatJob` is for long waits. Seed writes every era as `missing`, including queens-tower_1893, because the fixture's placeholder hero would block real generation. Landmarks carry a storage-only `seedOrder` because MongoDB's natural order is not guaranteed. Captures: 400 for a non-http(s) `photoUrl` so no `javascript:` URL is stored, 403 `spoofed_location` unless `ALLOW_SPOOFED_LOCATION=1`. Generate with `includeVideo: true` returns 403 `video_disabled` unless `VIDEO_GENERATION=on`, instead of quietly downgrading to core. On Vercel a missing `MONGODB_URI` throws rather than falling back to memory.
- Measured or verified: `npm run check` passes, 78 tests (19 new: queue, lease expiry with fake timers, generate rule, captures, routes called directly). `next build` succeeds and every API route is dynamic. With mocks off, `next dev` served every route over HTTP as expected: landmarks, eras, generate (job queued, then returned again), the 403 for video, capture, Dex, 404.
- Not verified: the MongoDB backend has never run against a live server. I tried to install `mongodb-memory-server` to test it locally, and that action was denied, so I left it. The code follows the mongodb 7.9 typings (findOneAndUpdate returns the document or null; duplicate key is code 11000).
- Delegated to Haiku, and whether it was kept: nothing.
- Problems: without MongoDB, the worker and the dev server are separate processes with separate memory, so a job queued through the API never reaches the worker. Documented in the jobs README.
- Next: commit on a yes. Then seed and verify against Atlas when the keys arrive.
