# Agent 1 notebook: Core

Only Agent 1 writes here. Rules: `MASTER.md` section 8.5. Task details: `MASTER.md` section 11.
Questions and requests to other agents go on `BOARD.md`, not here.

## From the human: round 3, run until only the videos are left (2026-11-15 04:15, read first)

Added by Agent 4 at the human's request. Goal: everything works, so the project's last step is switching video
generation on and running one command. The finish line (V1 to V10), your queue and the rules are in
`REMAINING_WORK_2.md` section 0. Your queue, in order: R3-1a (VIDEO_ERAS allow list, critical path), R3-1b, R3-1c, R3-1d, R3-1e. Keep working through it without stopping between
tasks. **When you wait on another agent: post BLOCKED on the board and tell your human in one line, "Waiting on
Agent N's <task> (<what>); please ask Agent N's human to prioritise it", then do your next unblocked task.**
This replaces the round 2 list below.

## Round 2 tasks (04:05, replaced by round 3 above)

Added by Agent 4 at the human's request. Your tasks are in `REMAINING_WORK_2.md` section 3 (statuses at 04:05,
Gantt in section 4); this list replaces the 01:50 priorities below where they differ. In order: A1-r2-7 (Historian offers only selectableVoices()), A1-r2-9 (milestone board: M1 passed on an iPhone about 03:00), A1-r2-8 (delete Agent 3's test capture), then A1-r2-4 (M2 gates on the tunnel) as soon as Agent 4 posts that the server reads chronodex.
Log each as usual and leave this section in place.

## Your human's tasks (2026-11-15 02:05)

Your human's own list is section 1 of `HUMAN_TASKS.md` (plus "Everyone"). When one of those blocks you, remind them by its number (for example 1.1) rather than asking again from scratch, and post each answer they give to `@team` on the board.

## From the human: priorities for Sunday (2026-11-15 01:50, read first)

Added by the human on Sun 15 Nov 2026 at 01:50, from `REMAINING_WORK.md` (tests, actions, Gantt) and `notebook/agent-4-panorama-plan.md` (the 360° view made once with fal and kept). Work top to bottom. Move each item into your Tasks list as you take it, log it, and leave this section in place. Freeze is assumed at 10:00, submission 12:00 (still unconfirmed).

1. **A1-a** Commit the pending Archivist-data change (seed reads `data/`, Historian reads `notes.txt`), then `npm run seed` now that `data/landmarks/queens-tower.json` exists.
2. **A1-d** `npm run seed` after Agent 3's eleven-landmark fixtures; update docs that still say six.
3. **A1-f** (new, saves fal credits) Retry cap in `requestEraGeneration`: at most 2 failed jobs per era, then answer `retry_limit` unless forced. Add the `media_assets` collection to the database docs and `MEDIA_DIR` to `.env.example` (Agent 4's media store, `notebook/agent-4-panorama-plan.md`). Agent 4 owns `src/lib/media/` and `src/app/api/media/` by the human's grant.
4. **A1-b** When the stable URL with mocks off lands (H5), run the capture, Dex, chat and generate gates on it and log each in `DEV_NOTEBOOK.md` (A1-15). Record the M1 to M3 gate results on the milestone board.
5. **A1-c** Decide with Agent 5 whether the Historian re-runs Queen's Tower 1893 on `data/eras/queens-tower_1893.notes.txt`.
6. **A1-16** Fix the two known brief problems before the human read (H7): queens-tower_1962 contradicts itself about the east wing; huxley-building_1885 and _1961 describe the Queen's Gate site, not today's building.
7. **A1-e** Briefs for the Singapore and Oslo eras only if the human says they are in the demo (H7 in REMAINING_WORK). Otherwise drop them from the seed.
8. **A1-12** Deploy or named tunnel with the human; confirm camera, location and streamed chat on a phone.

## From the human: phone test round 1 and next steps (2026-11-14 23:35, read first)

Added by the human after the first run of `phone_test.md`. Device: iPhone, iOS 26.5.1, Safari. Android not tested yet. Move these into your Tasks and log as you take them. Leave this section in place.

**The key finding for everyone.** The chat test (Part 6) ran on Agent 4's spike page, and the voice test (Part 2) ran with `NEXT_PUBLIC_USE_MOCKS=1`. The canned replies, the beep instead of a voice and the fixed transcript were mock behaviour, not bugs in the real routes. **The real chat, TTS and STT have not yet been seen working from a phone.**

Results that concern you:

- Part 8 / test 8: **pass.** With mocks off, captures are stored in Atlas and the Dex is as expected (SRV-1 to SRV-4).
- Part 3, MAP-1 to MAP-13 with mocks on: all pass. Part 4, the 360° viewer: all pass, with smoothing to tune (Agent 4). Part 5, clips: pass, with 20 to 21 ms gaps on the iPhone.
- Part 2, voice test: `HTTP 200 in 76 ms {"text":"What was daily life like here?"}` is Agent 2's mock `transcribe()`. It proves nothing and needs a rerun with mocks off.
- SRV-5, chat with a real guide: not done. No era in the database has a guide yet.

Next, in order:

1. **A1-12, the Vercel deploy, now.** Every remaining phone test is waiting on it: the real chat, voice in and out on the iPhone, MAP-10 (offline Dex), MAP-11 (Add to Home Screen) and the Android pass. Vercel env: `MONGODB_URI`, `MONGODB_DB=chronodex`, `DEEPSEEK_API_KEY`, `FAL_KEY`, `VIDEO_GENERATION=off` until the credit count is known, `NEXT_PUBLIC_USE_MOCKS` empty. For indoor testing this weekend also set `NEXT_PUBLIC_DEV_TOOLS=1` and `ALLOW_SPOOFED_LOCATION=1`. Check that a voice recording fits under Vercel's request body limit. Post the URL on the board.
2. **Seed the demo database `chronodex`** (not `chronodex_dev_alex`), so the deploy and Agent 2's worker share one queue.
3. **Give Queen's Tower 1893 a real guide in `chronodex`.** Queue its core tier so Agent 2's worker runs brief, scene, panorama, headshot and narration, or run `writeEraBrief` yourself if the worker is not up. The human's main chat complaints (no profile picture, canned replies, a beep for a voice) can only be judged against an era that has `guide`, `guide.headshotUrl` and `narrationAudioUrl`. Tell Agents 2 and 4 on the board when it is ready.
4. **Check the chat brain with mocks off (A1-13).** Replies should be short, use facts from the brief and suggest the next landmark. The human thought the replies were canned. Confirm that no path returns fixed text when DeepSeek fails: a failure must end in an error event.
5. **A1-15:** put round 1 on the `DEV_NOTEBOOK.md` milestone board, as listed above. Still open: Android, MEDIA-2, MEDIA-4, MEDIA-8, SRV-5, Part 7 (the real Time Machine), and everything that needs the deploy.
6. Then A1-16: briefs for every demo era, for a human to read (H7).

Decided by the human: period music and ambience in the chat ships as static loops that Agent 2 makes with fal and Agent 4 plays, so the contract does not change. If the team later wants a track per era, that needs a `CONTRACT` post adding `Era.ambienceAudioUrl`.

## Current state

Rewrite this block before you stop, so a fresh session can continue from it alone.

- Last updated: 2026-11-15 09:45
- Working on: nothing. Uncommitted (waiting for a commit yes): R3-1a `VIDEO_ERAS` allow list (`videoEraAllowList` in `src/lib/jobs/generate.ts`, 403 `video_disabled` for an era not listed, `.env.example`, tests); two-line env opt-in added to Agent 2's `src/lib/pipeline/run.test.ts` and my `src/worker/loop.test.ts` so video tests still pass. `npm run check` passes (540 tests).
- Done: R3-1b (selectableVoices, pushed 3d613b4). R3-1a as above. Round 3 queue left: R3-1c M2 gate on a tunnel with the human, R3-1d chat check for all 8 demo eras with mocks off, R3-1e delete Agent 3's test capture in `chronodex_dev_agent2` and keep `DEV_NOTEBOOK.md` current.
- Next: R3-1d (needs DEEPSEEK key only, can do now), R3-1e, then R3-1c with the human. My own tunnel/server (port 3110, chronodex) is running from this machine; Agent 4's phone server has the shared URL.
- Blocked on: the human for the phone gate (R3-1c).
- Board read up to: 2026-11-15 04:20 (Agent 4's R3-4a post).
- Waiting for commit approval: yes.
- Keys: `.env.local` (git-ignored) holds `MONGODB_URI` (live, Atlas cluster0), `MONGODB_DB=chronodex_dev_alex`, `DEEPSEEK_API_KEY` (working). `FAL_KEY` is not in it. Rotate the Atlas password after the weekend.
- Local machine: Node 26.13.1. In Git Bash prefix `export PATH="/c/Program Files/nodejs:$PATH"`. Run `npm run check` in PowerShell. A human's dev server holds port 3000 (https, database `chronodex_dev_alex`). Committed files are checked out with CRLF.

## Tasks

- [x] A1-01 Scaffold the Next.js app at the repo root
- [x] A1-02 Install the shared dependencies, record versions
- [x] A1-03 Contracts: types, zod schemas, helpers with tests
- [x] A1-04 Fixtures
- [x] A1-05 Typed API client with mock mode
- [x] A1-06 Stubs for cross-agent functions, placeholder pages
- [x] A1-07 Tooling, `.env.example`, README run section. Push. Announce M0
- [ ] A1-08 Database layer and seed script (database layer and seed done and verified on Atlas; photo GPS and 16:9 step waits for H1)
- [x] A1-09 API routes: landmarks, eras, generate, captures, dex
- [x] A1-10 Jobs library (verified against Atlas, 21:30)
- [x] A1-11 Historian: `writeEraBrief` (real runs on DeepSeek, 10 briefs written)
- [ ] A1-12 Deploy to Vercel, check on a phone
- [x] A1-13 Chat route (real replies checked on DeepSeek with mocks off, 15 Nov 00:00)
- [x] A1-14 Development flags
- [ ] A1-15 Run each gate with a human, log results on the front page
- [ ] A1-16 Briefs for every demo era, human-checked (10 drafts in `briefs/`, waiting for the human read, H7). queens-tower_1893 and _1962 were regenerated on the Archivist's notes at 15 Nov 06:00; the 1893 one is stored in both databases
- [x] A1-a Archivist-data change committed (b30b942), seed run on `chronodex` and `chronodex_dev_alex`
- [x] A1-d Seed after the 12-landmark fixtures: 12 landmarks, 19 eras in both databases; docs updated
- [x] A1-f Retry cap (2 failed jobs, `retry_limit`), `media_assets` documented, `MEDIA_DIR` in `.env.example`
- [ ] A1-b Gates on the stable URL (local pre-check passed; URL not posted yet)
- [x] A1-c Re-run queens-tower_1893 on the Archivist's notes: done, 8 s, stored in both databases
- [ ] A1-e Singapore and Oslo briefs: waiting for the human's decision (HUMAN_TASKS 3.2)

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

### 2026-11-14 16:55, A1-11 and A1-13: Historian and guide chat
- Did: loaded the `claude-api` skill first (MASTER.md section 7) and checked every SDK name against @anthropic-ai/sdk 1.8.0's typings. `src/lib/chat`: `streamGuideReply` (claude-haiku-5-5 or CHAT_MODEL, streaming, effort low, cached system prompt, refusal and failure end with an `error` event), `buildGuideSystemPrompt`, `toClaudeMessages` (drops the leading greeting, requires the history to end with the player), `pickNextLandmark` (nearest uncollected). `POST /api/chat` streams SSE through `formatSseEvent`, so it matches the typed client's parser. `src/lib/historian`: two phases. Research uses Opus 5.5 at effort high with `web_search_20260209` (max 8 searches) and resumes `pause_turn` by sending the turn back unchanged. Writing uses Opus 5.5 at effort medium, no tools, `betaZodOutputFormat(EraBriefSchema)`, then the mechanical checks, with one corrective retry. Both send `fallbacks: "default"`. A fake client (`src/lib/chat/test-fakes.ts`) drives the tests. Fixtures now use Agent 3's sprites, badges and OSM-checked subjects (their ASK at 16:35).
- Decided, and why: two-phase Historian, so a correction never repeats the searches and so web-search citations never meet structured output in one response (unverified whether they conflict; this sidesteps it). Server-side refusal fallback (`fallbacks: "default"`) is on for the Historian, as the claude-api skill recommends for Opus 5.5 code; Haiku 5.5 has none. No placeholder fallback in the Historian without credentials: SDK 1.8 does not throw at construction, and a silent placeholder could be stored as a real era. The pipeline stub uses `placeholderBrief` directly, so it never calls Claude. Chat effort `low`, because replies are a few sentences and latency matters. The thinking parameter is left out on both models (adaptive by default), and there is no budget_tokens and no forced tool_choice.
- Measured or verified: `npm run check` passes, 97 tests, all with the fake client; no API calls were made. With mocks off and no key, `next dev` answered POST /api/chat with 409 for an era with no guide, and for the hero era with `text/event-stream` and one `error` event, logging the SDK's "Could not resolve authentication method" on the server.
- Not verified: any real Claude call. Costs in the doc comments are estimates from list prices.
- Delegated to Haiku, and whether it was kept: nothing.
- Problems: twice, `npm run check` failed every test file straight after a file write, with no message shown; every rerun passed and I could not reproduce it. If you see "Tests no tests", rerun before debugging. Committed files are checked out with CRLF, which broke one scripted edit.
- Next: commit on a yes; real calls once the key arrives.

### 2026-11-14 17:20, keys, and the chat moves to DeepSeek
- Did: put the MongoDB connection string in `.env.local` with database `chronodex_dev_alex`. Tested the Anthropic value with a free models.list call: 401, because `apikey_01...` is the key id, not the secret. Moved the guide chat from Claude to DeepSeek at the human's request. `src/lib/chat/deepseek.ts` is a small fetch client for `POST https://api.deepseek.com/chat/completions` (OpenAI-style SSE ending in `data: [DONE]`). `streamGuideReply` now sends a system message and the turns to `deepseek-flash` (CHAT_MODEL) with `reasoning_effort: "none"`. `toClaudeMessages` was renamed `toChatTurns`. The Anthropic client and test fake moved to `src/lib/historian/`, which stays on Claude. Added `DEEPSEEK_API_KEY` to `.env.example`; CHAT_MODEL now defaults to `deepseek-flash`. The route, the SSE events and the typed client are unchanged, so Agent 4 is not affected.
- Decided, and why: plain fetch, not a vendor SDK, so no new dependency for one endpoint. Thinking off, because replies are a few sentences and DeepSeek thinks by default, which would delay the first word. `max_tokens` 1024. A `content_filter` finish becomes the in-character refusal message. A missing key ends the stream with an error event and makes no request.
- Measured or verified: DeepSeek's endpoint, auth header, stream format, `reasoning_effort` values and prices were read from api-docs.deepseek.com (model page, chat completion reference, pricing page) on 14 Nov. `npm run check` passes, 99 tests. The stream parser is tested with the body split at 1, 3, 7 and 1000 characters. No real DeepSeek call yet (no key).
- Problems: MongoDB Atlas refused the TLS handshake twice ("SSL alert number 80"), which is what Atlas does when the client IP is not on the Network Access list (F-025). Nothing was written. A verification script against a throwaway database `chronodex_verify_tmp` is ready to run and drop that database afterwards.
- Delegated to Haiku, and whether it was kept: nothing.
- Next: commit on a yes; Atlas once Network Access is open.

### 2026-11-14 19:30, review follow-up
- Did: pulled the review commits and Agent 3's map. Read the review and the human brief. Reran the whole suite from a clean `npm ci`. Retried Atlas.
- Verified: `npm run check` passes on the merged tree on Node 26.13.1, with 181 tests in 15 files, including the map and the Time Machine and chat code. The review's claim that vitest cannot start on Node 26 does not reproduce here (F-028).
- Not changed: the `.nvmrc` stays at 24, which is what Vercel runs. Atlas still refuses this machine (TLS alert 80, F-025), so the MongoDB verification and the seed have not run.
- Delegated to Haiku, and whether it was kept: nothing.
- Next: unchanged. Waiting for Atlas Network Access, `DEEPSEEK_API_KEY`, and the real Anthropic secret.
- 19:45, switch back to Claude Haiku: the human decided to use Claude for the chat again, and said to make sure it is Haiku. Restored the pre-DeepSeek chat module, route and tests from commit cc03cb8's parent, pointed them at the shared Anthropic client in `src/lib/historian/`, and removed `src/lib/chat/deepseek.ts` and the DEEPSEEK variable. Added `chatModel()`: `CHAT_MODEL` is honoured only if it starts `claude-haiku`, otherwise ignored with a warning, so a leftover `deepseek-flash` can never reach Claude (tested). `.env.local` CHAT_MODEL was `deepseek-flash`: set back to `claude-haiku-5-5`. The route, SSE events and typed client are unchanged. Verified: check passes (179 tests); with the memory db and the given key, `POST /api/chat` reaches Anthropic, gets 401, and streams one clean error event. With the Atlas URI set the route returns the documented 500 instead, because it reads the era from Atlas and Atlas refuses this machine. Problem: the key given is not an Anthropic key (F-029).

### 2026-11-14 20:40, DeepSeek for the chat and the Historian
- Did: the human replaced all Anthropic requirements with DeepSeek, and gave a second key (the first was invalid for both providers, F-030). Tested the key with the free models call. Read DeepSeek's web tools docs. Extended `src/lib/chat/deepseek.ts` (tools, JSON mode, the URLs and citations DeepSeek reports, in-stream errors). Rewrote the Historian: research with `deepseek_web_search` and `deepseek_read_url`, then JSON-mode writing, then the checks; sources are kept only if the research tools found them. Chat restored on DeepSeek with a guard so only `deepseek-` models are used. Removed the Anthropic client, its test fake, `@anthropic-ai/sdk` and `ANTHROPIC_API_KEY`. New shared test fakes in `src/lib/chat/test-fakes.ts`.
- Decided, and why: flash, not pro, for the Historian (pro failed mid-stream with the tools twice out of two, F-031). Two calls, because JSON mode cannot be combined with the web tools (F-032). Only URLs the tools reported count as found, which is a stronger "every claim has a source" check than before: it drops a URL the model wrote from memory. A failed in-stream request is retried twice with backoff, and a 401 is not retried.
- Measured or verified: `npm run check` passes, 214 tests. One real Historian run, Queen's Tower 1893 on flash: 174 s, 108-word script opening with the guide's name, 4 real sources (imperial.ac.uk, the Royal Collection, Grace's Guide, Victorian London). Research read about 850k tokens, nearly all cache hits, about $0.04 of tokens; the web tool fees are not known. One real chat reply through `POST /api/chat` on the in-memory store: 1.5 s, streamed, in character.
- Not verified: Atlas (still refuses this machine). The Historian on the other five landmarks. The web tool cost. Whether the facts are right: the 1893 brief has a repeated sentence, and every brief needs a human read (H7).
- Delegated to Haiku, and whether it was kept: nothing.
- Problems: DeepSeek reports mid-stream failures inside a 200 stream, which my client first ignored and returned empty notes. Fixed and tested.
- Next: commit on a yes.

### 2026-11-14 21:30, MongoDB verified and seeded
- Did: the human opened Atlas Network Access. Pinged Atlas (ok). Ran a verification script of 16 checks against a throwaway database `chronodex_verify_tmp`, which the script drops at the end. Seeded `chronodex_dev_alex` and ran the seed again. Ran the real website API against Atlas and then removed my test capture.
- Verified on real Atlas: landmarks come back in seed order with no storage fields; upserts are idempotent; `insertEraIfMissing` never overwrites; `patchEra` keeps identity fields; the unique index keeps a player's first capture; two racing `enqueueEraJob` calls share one job (the partial unique index works); an atomic claim marks it running and a second claim finds nothing; `patchStage` updates the right stage; a finished job stops being active; generating after a failure makes a new queued job. The seed writes 6 landmarks and 10 eras the first time and 0 new eras the second. Over HTTP with mocks off: landmarks, eras, a capture at the Queen's Tower photo spot, the same capture again (`alreadyCollected: true`), the Dex, a too-far capture (nearest: Royal Albert Hall, 110 m), and the chat route's 409 for an era with no guide yet.
- Not verified: the 2dsphere index is created but nothing queries it yet. A claim by a second real worker process, and lease expiry, were tested only in memory.
- Delegated to Haiku, and whether it was kept: nothing.
- Problems: none. The earlier TLS refusal (F-025) was Network Access, as suspected.
- Next: A1-16, A1-12.
- 21:50, Agent 2's asks (A2-10 ASK, posted 21:10): added `releaseJob(jobId)` to `src/lib/jobs` (running job back to queued; stages and fal request ids kept; stays the era's active job; null if not running). Documented `WORKER_CONCURRENCY` and `WORKER_ALLOW_MEMORY` in `.env.example`, reading the worker source for the meaning. Renamed the fixtures' `placeholder-*` voice keys to `eleven-george` and `eleven-alice`, and the example in the Historian prompt comment. The two `placeholder-*` entries in `src/lib/fal/voices.ts` are Agent 2's to remove. Verified: 343 tests pass (2 new for `releaseJob`), and 8 checks of `releaseJob` pass on real Atlas in a throwaway database that the script dropped. Not verified: the worker itself against Atlas, which is Agent 2's. Note for the worker: `FAL_KEY` is still empty in the root `.env.local`, so a real run needs it.

### 2026-11-15 00:35, A1-16 and round 1 follow-up
- Did: read the human's round 1 section (kept in place above). Seeded `chronodex`. Wrote `scripts/brief-era.ts` and `npm run brief`: runs the Historian per era, writes `briefs/<eraId>.json` and a readable `.md` with every source, skips an era whose file exists, `--save` stores a brief on a still-empty era. Ran it for all 10 eras and saved queens-tower_1893 to `chronodex` and `chronodex_dev_alex` so the pipeline skips its brief stage and the chat has a guide. Checked the real chat with mocks off through the human's dev server: two real replies, streamed, in character, using the brief ("silks and bonnets... top hat"). Read the chat code: the only text a failure can produce is an `error` event, so nothing canned can reach the screen. Added `maxDuration = 60` to the chat route and a "Deploying to Vercel" section to the README.
- Decided, and why: the Historian now researches up to 3 times (`NoSourcesError`), and the research prompt requires a first web search and 3 page reads, because 3 in 5 real runs answered without the tools (F-035). Only queens-tower_1893 was saved to the database; the other nine stay on disk until a human has read them, so a pre-generation run cannot spend credits on an unread brief.
- Measured or verified: 10 briefs, each 105 to 116 words of script, 3 to 7 sources, a spread of guide voices (daniel, george, alice, lily). 92 to 298 s per brief including retries; roughly 2 to 3 minutes of DeepSeek time each. After the prompt change, 4 of 4 reruns still needed 0 to 2 retries, so the prompt helps less than the retry does. Unit tests: 344 pass (1 new for the second research attempt).
- Not verified: the facts, which is what H7 is for. The Vercel deploy: it needs a human login, and I have no Vercel CLI session. Voice in and out, which is Agent 2's and Agent 4's on the deployed site.
- Delegated to Haiku, and whether it was kept: nothing.
- Problems: in Git Bash, vitest failed every file for no code change and node was off PATH once; PowerShell ran clean (F-036). A human's dev server already held port 3000, so mine exited; I used theirs.
- Next: see Current state.

### 2026-11-15 01:05, A1-12 prep: rate limits
- Did: added `src/app/api/_lib/limits.ts`: fixed-window limits per caller (first X-Forwarded-For address) on POST /api/chat (60 a minute), /generate (20) and /captures (60), reusing Agent 2's `createRateLimiter` from `@/lib/fal/guards`. 429 with Retry-After in the standard error shape. Test added.
- Decided, and why: chat and generate spend DeepSeek and fal credits and had no limit, while the voice and upload routes did; a public URL makes that a real exposure. Numbers are generous because a demo room can share one public address. Counters are per server instance, so on Vercel the ceiling is a small multiple; that is enough against a script.
- Measured or verified: `npm run check` passes, 360 tests (2 new).
- Delegated to Haiku, and whether it was kept: nothing.
- Next: commit on a yes, then wait for the Vercel URL.

### 2026-11-15 02:00, Archivist data (AGENT5.md section 10 asks to Agent 1)
- Did: worker dry run on real Atlas in a throwaway database (queue, claim, run, era ready: works, database dropped). Then built the three asks: `src/lib/archive` (lenient readers for `data/landmarks/*.json`, `data/eras/<id>.json` and `.notes.txt`); `writeEraBrief` takes `researchNotes` (or reads the notes file itself) and skips the web search, with the URLs the notes cite as the only allowed sources; after writing, dossier sources are appended and its licensed images replace the model's `referenceImageUrls`; `npm run seed` applies `data/landmarks` (geometry, radius, years, reference JPEG copied to `public/reference/<id>.jpg`, stored as `/reference/<id>.jpg`). `ARCHIVE_DIR` added to `.env.example`, `/public/reference/` git-ignored.
- Decided, and why: lenient readers that skip a bad file with a warning, because strict validation is Agent 5's script and a data typo must not stop the seed or a brief. Reference photos are served by the app, not uploaded to fal at seed time, because the browser needs a durable address and fal URLs expire; the cost is that the pipeline must upload the file itself. Dossier images replace the model's picks because they carry licence receipts. A `blocked` landmark file and a `rejected` era are ignored. Nothing is ever deleted: a dropped year keeps its era.
- Measured or verified: 373 tests (13 new: reader, override, notes path, merge). Seed dry run with a synthetic archive gave 11 eras (one extra year) and 10 without data. The fixtures' `referencePhotoUrl` is a mock SVG that the scene stage would send to fal as is: noted for the team.
- Not verified: against Agent 5's real files (none exist yet). Whether the pipeline can use a relative reference URL: it cannot today.
- Delegated to Haiku, and whether it was kept: nothing.
- Next: commit on a yes.

### 2026-11-15 06:30, Sunday priorities A1-a to A1-f
- Did: seeded both databases (12 landmarks, 19 eras; 9 new eras inserted, 10 left alone). Retry cap: `countFailedJobs`, `maxFailedJobsPerEra()` (env `MAX_FAILED_JOBS_PER_ERA`, default 2), `requestEraGeneration(..., { force })`, outcome 429 `retry_limit`; the route honours `?force=1` only with `ALLOW_FORCE_GENERATE=1`. `media_assets` described in the db README, `MEDIA_DIR`, `MAX_FAILED_JOBS_PER_ERA`, `ALLOW_FORCE_GENERATE` in `.env.example`. Fixtures, db, jobs and api READMEs updated. Regenerated queens-tower_1893 and _1962 on the Archivist's notes (7 to 9 s each), stored 1893 in both databases with `--replace`. Added the no-hindsight rule to the writing prompt after the first run had the guide say a hall "has never been built" in 1893. Local gate pre-check passed (see the front page).
- Decided, and why: D-029 and D-030 on the front page. 429 for `retry_limit` so a client treats it as "stop asking". The cap counts all failed jobs for the era, not per tier, which is simple and errs on the side of saving credits. `--replace` refuses once any media exists.
- Measured or verified: `npm run check` passes, 455 tests (3 new for the cap). Briefs: 105 to 120 word scripts, Archivist sources merged in (6 for 1893).
- Not verified: the guide facts (H7). The stable URL. Verified on real Atlas in a throwaway database (dropped): two failed jobs counted, the third request 429 `retry_limit`, a forced request queued.
- Delegated to Haiku, and whether it was kept: nothing.
- Problems: Git Bash's /tmp is not visible to Windows node: write helper scripts in the repo and delete them.
- Next: see Current state.
