# Chronodex — technical review

Written 2026-11-14 by a human-directed full-repo review (not a commit). This is for the four
agents and for the humans who want the detail. The plain-language version is [HUMAN_BRIEF.md](HUMAN_BRIEF.md).

Updated after pulling the four commits that landed on origin meanwhile: Agent 4's Time Machine and
chat screens, and Agent 1's switch of the guide chat to DeepSeek (decision D-024).

## 1. What was reviewed

- Every file under `src/`, `fixtures/`, `scripts/` and `public/` on `main`.
- The four notebooks (`notebook/agent-N.md`), `DEV_NOTEBOOK.md`, `BOARD.md`, `MASTER.md`.
- Agent 3's map/art spike (`spikes/agent-3/`) and Agent 4's viewer spike (`spikes/agent-4/`).
- `package.json`, `tsconfig.json`, `next.config.ts`, `.env.example`, `.gitattributes`.

Nothing here is a new contract or a change to `MASTER.md`; it is a status snapshot and a list of
gaps. Code changes (the map port) are reported separately.

## 2. Repository state on `main`, by owner

| Path | Owner | Status |
|---|---|---|
| `MASTER.md`, `CLAUDE.md`, `AGENTS.md` | Humans | Plan v1.1 |
| `DEV_NOTEBOOK.md` | 1 + humans | Current (M0 logged, D-001…D-023, F-001…F-024) |
| `BOARD.md` | all | Current |
| `notebook/agent-N.md` | each | Agent 1/2/3 current; Agent 4 pre-port |
| `package.json`, config, `.env.example`, `README.md` | 1 | Done (M0) |
| `src/lib/contracts/` | 1 | Done, frozen. Types + zod + helpers + `api.ts` + `stages.ts` |
| `src/lib/client/` | 1 | Done: typed client, mock mode, SSE parser, player id |
| `src/lib/db/` | 1 | Done in code. MongoDB path **not run against Atlas** |
| `src/lib/jobs/` | 1 | Done in code. Queue + generate rule. MongoDB path unverified |
| `src/lib/historian/` | 1 | Done in code, unit tested with a fake client. **No real call** |
| `src/lib/chat/` | 1 | Done in code (DeepSeek, D-024), unit tested. **No real call** |
| `src/app/api/` (core routes) | 1 | Done: landmarks, captures, eras, generate, dex, chat |
| `src/app/api/uploads`, `/voice/*` | 2 | **Missing** |
| `src/lib/fal/` | 2 | **Still Agent 1's stub** (returns fixture media) |
| `src/lib/pipeline/` | 2 | **Still Agent 1's stub** (`runEraJob` marks all stages done) |
| `src/worker/` | 2 | **Missing** — `npm run worker` fails |
| `scripts/pregenerate.ts`, `scripts/backup-media.ts` | 2 | **Missing** |
| `src/app/layout.tsx`, `globals.css` | 3 | Replaced with the game shell (this review's map work) |
| `src/app/page.tsx` | 3 | Replaced with the map (this review's map work) |
| `src/components/explore/` | 3 | New: ported map logic + MapScreen (this review's map work) |
| `public/sprites/` | 3 | Done: six sprites, badges, `-locked` silhouettes |
| `public/manifest.webmanifest`, icons | 3 | **Missing** (A3-08) |
| `src/app/capture/`, `src/app/dex/` | 3 | **Placeholders** (A3-06, A3-07) |
| `src/app/time/`, `src/app/chat/` | 4 | Built by Agent 4 (A4-02…A4-05, A4-07, part of A4-08), mock mode |

## 3. Per-agent review

### Agent 1 — Core (mostly done in code, unverified against live services)

**Done and good.** Contracts copied from `MASTER.md` 4.1 unchanged, with zod schemas and a
compile-time drift check. Helpers (`eraIdOf`, `parseEraId`, `haversineM`, `bearingDeg`,
`withinCaptureRange`, `resolveCapture`) are unit tested. The typed client has one method per
endpoint, mock mode simulates the job lifecycle from the clock (no timers), and the SSE parser is
shared with the chat route so the two cannot drift.

**API layer.** Every route validates with zod and returns the documented `{ error: { code, message } }`
shape. `handle()` turns unexpected exceptions into a 500 without leaking messages. The capture rule
runs on the server; the client only shows distance. `generate` is idempotent and refuses the video
tier unless `VIDEO_GENERATION=on`; spoofed captures are refused unless `ALLOW_SPOOFED_LOCATION=1`.

**Database and jobs.** Two backends behind one interface: MongoDB when `MONGODB_URI` is set, an
in-memory fixture store otherwise. On Vercel a missing URI throws rather than silently losing data.
Indexes: a 2dsphere on `photoSpot`, a unique index on `(playerId, landmarkId)` for captures, and a
unique **partial** index on `{ eraId }` where `active: true` so an era has at most one active job —
this is what "never pay fal twice" relies on. Job claiming is `findOneAndUpdate` (atomic), with a
10-minute lease so a crashed worker's job is reclaimed and resumed from saved `falRequestId`s.

**Historian and chat.** Historian is two Claude calls (research with web search + `pause_turn`
resume, then writing with structured output) plus one corrective retry, using
`claude-opus-5-5`. Chat streams DeepSeek (`deepseek-flash`, or `CHAT_MODEL`) as SSE and ends with
an `error` event on refusal/failure, never a hang (decision D-024; the Historian and image checks
stay on Claude). Both are unit tested against a fake client.

**Not verified.** The MongoDB backend has never run against Atlas. No real Claude call has been
made. `scripts/seed.ts` exists but has not seeded a real database.

**Missing / next.** A1-12 (Vercel deploy), A1-15 (walk the gates), A1-16 (real era briefs).

### Agent 2 — Studio (spikes done, production layer not started)

All fal bake-offs exist as spikes: A2-01 (hello fal), A2-02 (scene + headshot), A2-03 (panorama
route b2, full 2:1), A2-04 (16 voice clips + Scribe transcription, waiting for a human ear),
A2-05 (Kling avatar vs Fabric talk, waiting for a human eye), A2-06 (Kling walk-on 5 s). Measured
costs/timings are in `notebook/agent-2.md`. Total spend so far ≈ $4.20 (list).

**The gap.** Everything from A2-07 onward is not in `src/`: `src/lib/fal/index.ts` and
`src/lib/pipeline/index.ts` are still Agent 1's placeholders (they return fixture media), there is
no `src/worker/index.ts`, and the upload/voice routes do not exist. The chosen model table in
`notebook/agent-2.md` is the source of truth for `src/lib/fal/models.ts`, which does not exist yet.

**Notes that block or de-risk A2.** A 45 s narration needs about 130 words, not the 105–120 in
`MASTER.md` (measured: ~2.9 words/s). `fal-ai/ffmpeg-api/extract-frame` returns 403 on the current
key, so the walk_off "start on talk's last frame" plan needs another route (guide_frame is the talk
clip's first frame). Kling avatar standard took 226 s for a 10 s clip, so a 45 s clip is ~15 min
and must not be in the live demo's wait path. `merge-videos` uses the smallest input size, so all
clips must be scaled to 1280×720 first.

### Agent 3 — Explorer (art + spike done; the real screen is what this review builds)

A3-01 art is committed to `public/sprites/` (six sprites, badges, `-locked` silhouettes; rarity
rims baked in). A3-02 map spike is in `spikes/agent-3/` and validated in headless Chrome.

**This review ports the spike into `src/`** as the A3-03 shell and A3-04 map: `src/app/layout.tsx`,
`src/app/globals.css` (theme tokens), `src/app/page.tsx`, and `src/components/explore/` (palette,
game-map-style, location, geo-format, map-geometry, and the `MapScreen` React component), with the
maplibre worker copied to `public/maplibre-gl-worker.mjs` to fix the bundler trap, and
`@fontsource/jersey-10` added for the pixel font.

**Still missing after this port.** A3-06 capture flow (`/capture` is a placeholder), A3-07 Dex
(`/dex` is a placeholder), A3-08 resilience/manifest/icons, A3-09's UI wiring (the logic is
ported), A3-10 phone pass. Location logic (A3-05) is ported and used by the map.

### Agent 4 — Time Machine (screens built, phone check pending)

A4-01 360° spike exists in `spikes/agent-4/` (Photo Sphere Viewer 5.15.1 + gyroscope, `panoDataFor`
mapping `Panorama` → PSV, pitch/yaw clamps). It has not been seen on a real phone.

A4-02 to A4-05 and A4-07 are built in `src/` (mock mode, checked on desktop at phone width):
`src/components/time-machine/` (TimeMachineScreen, PanoramaView, GuidePlayer, ProgressSheet,
YearBar) and `src/components/chat/` (ChatScreen, bubbles, typing indicator, hold-to-talk recorder).
A4-06 (then/now slider) and A4-09 (sources drawer) are next; A4-08 voice needs Agent 2's routes
(A2-11), and real content needs real eras (A2-09).

## 4. Cross-cutting observations

**Strong.** Consistent error shape; strict zod validation at the edge; the server owns the capture
decision; the job lease + saved `falRequestId` resume design; the in-memory fallback that fails
loud on Vercel; the two-phase Historian; the doc-comment lint rule actually enforced (`npm run
lint` fails on undocumented exports).

**Traps already documented (and now handled where relevant).** maplibre-gl 6's worker is a separate
file the bundler drops (fixed in the map port by serving it from `public/`); `next dev` would write
into `AGENTS.md` (turned off via `agentRules: false`); Next 16 `params` are Promises (routes already
`await ctx.params`, client pages use `useParams()`); `crypto.randomUUID` is HTTPS-only (the client's
`randomUuid` falls back); git autocrlf means scripted edits must allow `\r\n`.

**Risks.** (1) The MongoDB and Claude layers are untested against real services — the first real
seed/Historian run is where surprises will surface. (2) The repo sits in iCloud-synced Documents,
which has already written conflict copies into `node_modules` and could corrupt `.git`. (3) No real
reference photos or photo-spot GPS yet; fixtures use `/mock/reference.svg` and estimated photo spots.
(4) The worker does not exist, so live generation cannot run end to end yet.

## 5. Testing status

- **`typecheck` — passes.** All new and existing code compiles.
- **`lint` — passes** with 0 errors and 0 warnings, including the map port and the eslint ignore fix.
- **`next build` — succeeds.** All routes compile and bundle, including the map's maplibre CSS,
  the pixel font and the `ssr: false` dynamic import.
- **`vitest` unit tests — blocked by the environment.** vitest 5.1.0 fails to initialise its
  runner on Node 26.13.1 (`Vitest failed to find the runner` / `Cannot read properties of
  undefined (reading 'config')`) in **every** test file, including Agent 1's pre-existing ones.
  It is not caused by this review's changes (the port's two new test files fail the same way), is
  not fixed by `npm ci`, and is not the worker pool or a dependency drift. The likely cause is a
  vitest/vite + Node 26 incompatibility: `.nvmrc` pins Node 24, but only Node 26.13.1 is
  installed on this machine. Run the suite under Node 24 to confirm and unblock `npm run check`.
- The map port adds unit tests for `geo-format` and `map-geometry` (ported from the spike); they
  type-check and lint but cannot run until the vitest/Node issue above is resolved.

## 6. Blockers, in dependency order

1. **`MONGODB_URI`, `ANTHROPIC_API_KEY`, `DEEPSEEK_API_KEY`** — Agent 1 cannot seed Atlas, run a
   real Historian brief (Claude) or a real chat reply (DeepSeek), or deploy to Vercel (A1-12).
2. **`FAL_KEY` + the credit count** — Agent 2 has a key in `spikes/agent-2/.env.local`; the credit
   total decides how many guide videos are affordable.
3. **H1 photos with GPS** — real photo spots and the 16:9 reference photo every era edit is built on.
4. **Human picks for voices and the talk model** — Agent 2's A2-04/A2-05 wait on an ear and an eye
   (`spikes/agent-2/out/review.html`).
5. **Real-phone checks** — the M1/M2 gates; nothing has been seen on a phone yet.
6. **iCloud** — move the clone out of the synced folder.

The full list of what the humans should test and answer is in [HUMAN_BRIEF.md](HUMAN_BRIEF.md).
