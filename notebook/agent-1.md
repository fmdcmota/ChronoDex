# Agent 1 notebook: Core

Only Agent 1 writes here. Rules: `MASTER.md` section 8.5. Task details: `MASTER.md` section 11.
Questions and requests to other agents go on `BOARD.md`, not here.

## Current state

Rewrite this block before you stop, so a fresh session can continue from it alone.

- Last updated: 2026-11-14 16:30
- Working on: M0 is built on branch `agent-1` (A1-01 to A1-07), not yet committed. `npm run check` passes (59 tests).
- Next: on a yes, commit, `git pull --rebase origin main`, rerun `npm run check`, push to `main`, announce M0. Then A1-08 (MongoDB db layer and seed), A1-10 (jobs on MongoDB), A1-09 (routes).
- Blocked on: nothing for code. A1-08 needs `MONGODB_URI` (H2) and the H1 photos for real photo spots.
- Board read up to: 2026-11-14 15:55 (agent-4, A4-01)
- Waiting for commit approval: the M0 commit (scaffold, contracts, fixtures, client, stubs, placeholder pages, tooling).
- Local machine: Node 26.13.1 was installed with winget this session. In Git Bash, prefix commands with `export PATH="/c/Program Files/nodejs:$PATH"` until the shell is restarted.

## Tasks

- [x] A1-01 Scaffold the Next.js app at the repo root
- [x] A1-02 Install the shared dependencies, record versions
- [x] A1-03 Contracts: types, zod schemas, helpers with tests
- [x] A1-04 Fixtures
- [x] A1-05 Typed API client with mock mode
- [x] A1-06 Stubs for cross-agent functions, placeholder pages
- [ ] A1-07 Tooling, `.env.example`, README run section. Push. Announce M0
- [ ] A1-08 Database layer and seed script
- [ ] A1-09 API routes: landmarks, eras, generate, captures, dex
- [ ] A1-10 Jobs library
- [ ] A1-11 Historian: `writeEraBrief`
- [ ] A1-12 Deploy to Vercel, check on a phone
- [ ] A1-13 Chat route
- [ ] A1-14 Development flags
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
