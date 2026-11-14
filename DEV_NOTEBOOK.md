# Chronodex dev notebook

The running record of the build. The rules are in `MASTER.md` section 8.5. In short:

- This front page holds the milestone board, decisions, contract changes, and verified facts and traps. Agent 1 and humans write here.
- Each agent has its own page in `notebook/`. Only that agent writes to it, so the pages never conflict in git.
- Agents talk to each other on [BOARD.md](BOARD.md), one post per commit. Questions and requests go there, not here.
- Update your page after every task and before you stop.
- Never paste keys, tokens or connection strings.

| Page | Agent | Role |
|---|---|---|
| [notebook/agent-1.md](notebook/agent-1.md) | 1 | Core: scaffold, contracts, database, API, Claude, integration |
| [notebook/agent-2.md](notebook/agent-2.md) | 2 | Studio: everything fal, pipeline, worker |
| [notebook/agent-3.md](notebook/agent-3.md) | 3 | Explorer: shell, map, capture, Dex |
| [notebook/agent-4.md](notebook/agent-4.md) | 4 | Time Machine: 360° view, guide video, chat |

## Milestone board

Agent 1 updates this when a human has walked through the gate (`MASTER.md` section 9).

| | Milestone | Target | Status | Passed at | Notes |
|---|---|---|---|---|---|
| M0 | Foundation | Sat 16:15 | Built on branch agent-1, awaiting commit approval and a human walk-through | | With mocks on, the six landmarks list and a fake job advances (unit tested). Not yet seen in a browser |
| M1 | Risky parts proven | Sat 17:45 | Not started | | |
| M2 | Vertical slice | Sat 20:00 | Not started | | |
| M3 | Full loop | Sat 23:00 | Not started | | |
| M4 | Content complete | Sun 02:00 | Not started | | |
| M5 | Demo ready | Sun 10:00 | Not started | | |

## Decisions

Every row is proposed until the team has reviewed plan v1.

| # | Date | Decision | Why |
|---|---|---|---|
| D-001 | 14 Nov | Build to the team's spec in `prompt-record.md`. `MASTER.md` replaces `CHRONODEX.md` for scope | The team fixed the feature set after the concept was written |
| D-002 | 14 Nov | TypeScript everywhere. One Next.js app at the repo root, MongoDB Atlas, Vercel, and a Node worker for long jobs | One set of shared types for four agents. HTTPS for camera, location and gyroscope. An era takes minutes |
| D-003 | 14 Nov | Every fal call runs on the server or worker through one wrapper that saves the fal request id | Keeps the key private and never pays twice after a restart |
| D-004 | 14 Nov | No Google scraping. Street View is shown only in Google's viewer and never given to a model | Google's Street View policy forbids export, bulk download and derived content |
| D-005 | 14 Nov | The 50 m check measures to the landmark's photo spot and forgives up to 25 m of reported GPS error | A large building's centre is more than 50 m from any street |
| D-006 | 14 Nov | One guide per landmark and year. Guides are fictional people | Matches the spec's guide "from the era". Avoids likeness problems |
| D-007 | 14 Nov | Every still and video is 16:9 landscape | One aspect ratio keeps every stage aligned |
| D-008 | 14 Nov | The guide video is three clips played in order. Until it exists, the narration plays over the 360° view | No model makes walk on, 45 s of speech and walk off in one shot |
| D-009 | 14 Nov | An era has two tiers, core and video, generated separately | The video tier is about eight times the cost of the core tier |
| D-010 | 14 Nov | One notebook page per agent, plus this front page | Four agents writing one file would conflict |
| D-011 | 14 Nov | Agents talk on `BOARD.md`. Every commit adds one post that @-mentions the agents it affects | Team request. One place to see who changed what and who is waiting on whom |
| D-012 | 14 Nov | An agent asks its human before every commit and every push. There is no standing approval | Team request |
| D-013 | 14 Nov | Each agent may hand mechanical work to a Haiku subagent, within the limits of its delegation sheet | Team request. Saves the main agent's time and context |
| D-014 | 14 Nov | `cacheComponents` and `partialPrefetching` are off in `next.config.ts` | Next 16's scaffold turns them on. Our screens are client components over a dynamic API, and the prerender rules they add are a trap for agents trained on earlier Next.js |
| D-015 | 14 Nov | Node 24 line: `.nvmrc` is 24 and `@types/node` is 24. Node 26 also works locally | vitest 5 needs @types/node 22 or later. Vercel is certain to support 24 |
| D-016 | 14 Nov | Fixtures are TypeScript modules (`fixtures/*.ts`), imported as `@fixtures/index` | The type checker enforces their shape. JSON imports widen string unions |
| D-017 | 14 Nov | Without `MONGODB_URI`, `src/lib/db` and `src/lib/jobs` use an in-memory store seeded from fixtures. On Vercel a missing `MONGODB_URI` is an error | Real routes work locally before Atlas exists. A silent fallback in production would lose every capture |
| D-018 | 14 Nov | One active job per era is enforced by a unique partial index on `eraId` where `active` is true. A running job not updated for 10 minutes may be claimed by another worker | Never pay fal twice. A crashed worker must not block an era for ever |
| D-019 | 14 Nov | Generate with `includeVideo: true` returns 403 `video_disabled` unless `VIDEO_GENERATION=on`. A spoofed capture returns 403 `spoofed_location` unless `ALLOW_SPOOFED_LOCATION=1` | Explicit refusals are easier to debug than silent downgrades |
| D-020 | 14 Nov | `npm run seed` seeds every era as `missing` and never overwrites an existing era | The fixture hero era is placeholder content. Re-seeding must never wipe generated media |
| D-021 | 14 Nov | The Historian runs in two Claude calls: research with web search (free-text notes, `pause_turn` resumed), then writing with structured output and no tools, with one corrective retry. Both use `fallbacks: "default"` | A retry never repeats the searches, and search citations never meet structured output in one response |
| D-022 | 14 Nov | The Historian has no placeholder fallback without credentials; the pipeline stub uses `placeholderBrief` itself | Placeholder text must never be stored as a real era |
| D-023 | 14 Nov | Fixture coordinates and art come from Agent 3's map spike: OSM-checked subjects, estimated photo spots, `/sprites/<id>.png`, `/sprites/badges/<id>.png` | One set of points for the map and the capture rule. Photo spots are still replaced by the H1 GPS |
| D-024 | 14 Nov | The guide chat uses DeepSeek (`deepseek-flash`, thinking off) instead of Claude Haiku. The Historian and the image checks stay on Claude. `MASTER.md` section 7 still says Claude for the chat: a human must update it | Team decision (Agent 1's human), 14 Nov 17:15 |

## Contract changes

The contracts in `MASTER.md` section 4 freeze at M0. Additions made while building M0, before the freeze, are logged here so nobody is surprised.

| # | Date | Change | Asked by | Approved by |
|---|---|---|---|---|
| C-001 | 14 Nov | Pre-freeze additions. No 4.1 type changed. `src/lib/contracts/api.ts` holds request and response types for 4.3. `CaptureRequest.location` is `LatLng \| null` so the server can answer `location_missing`, plus optional `spoofed` for A1-14. New `resolveCapture` helper. New `stages.ts` (stage order, labels, `buildStages`, `eraNeedsGeneration`). `db.listEras` and `jobs.getActiveJob` added beyond 4.4. `patchEra` returns the updated Era | Agent 1, while building M0 | Pending human review with the M0 commit |

## Verified facts and traps

Things learned the hard way, so nobody learns them twice. Add the source.

| # | Date | Fact | Source |
|---|---|---|---|
| F-001 | 14 Nov | fal's catalogue can be searched without a key at `https://api.fal.ai/v1/models?q=<words>` or `?category=<category>`. A model's schema is at `https://fal.ai/models/<endpoint>/llms.txt` | Tried in the planning session |
| F-002 | 14 Nov | `fal-ai/hunyuan_world` is listed as active, but three of its documentation URLs returned 404. Its fields in `MASTER.md` come from a search summary | Planning session |
| F-003 | 14 Nov | Every Veo model in fal's catalogue is marked deprecated. Walk-on and walk-off use Kling 4.0 or Flux 3 | fal model search |
| F-004 | 14 Nov | `fal-ai/kling-video/v3/turbo/standard/image-to-video` mentions a last frame in its description but has no end-frame input. Do not use it for walk-on or walk-off | Its schema page |
| F-005 | 14 Nov | The Kling avatar pages give no maximum audio length. Prove 45 s before relying on it | Schema pages |
| F-006 | 14 Nov | `fal-ai/ffmpeg-api/merge-videos` uses the lowest input frame rate and the smallest width and height unless told otherwise. It says nothing about audio tracks | Its schema page |
| F-007 | 14 Nov | `fal-ai/minimax/voice-design` costs $3 per voice created. Not used by default | Its schema page |
| F-008 | 14 Nov | `kling/v4/image-to-video` defaults to 1080p at $0.235 per second. Pass `resolution: "720p"` for $0.157 | Its schema page |
| F-009 | 14 Nov | fal media stays on the CDN at least 7 days by default and the URLs are public. Back up before the demo | fal FAQ, through a search summary |
| F-010 | 14 Nov | Google allows panorama ids to be stored indefinitely. It does not allow the images to be downloaded in bulk or stored | Google's Street View policy page |
| F-011 | 14 Nov | The Next.js scaffolder is expected to refuse a folder that already has files. Not tested here: confirm at A1-01 | From memory |
| F-012 | 14 Nov | `BOARD.md` is set to git's union merge in `.gitattributes`. A local merge and a local rebase of two branches that each added a post kept both posts with no conflict. GitHub's merge button is not tested and may ignore the setting | Tested in a throwaway repo, 14 Nov |
| F-013 | 14 Nov | An `@name` in a commit message, pull request or issue can notify the GitHub user of that name. Handles belong in `BOARD.md` only | From memory |
| F-014 | 14 Nov | `next dev` in Next 16 writes a managed block into `AGENTS.md` when it detects an AI agent. `agentRules: false` in `next.config.ts` turns it off | `node_modules/next/dist/server/lib/app-info-log.js` and the `agentRules` doc page |
| F-015 | 14 Nov | npm 11 warns that esbuild's postinstall is not in `allowScripts` and skips it. tsx and vitest still work through esbuild's prebuilt platform package | Tried at A1-02 |
| F-016 | 14 Nov | `crypto.randomUUID` exists only in secure contexts, so a phone on plain-HTTP LAN would crash. `randomUuid()` in `src/lib/client/player.ts` falls back to `getRandomValues` | MDN, from memory |
| F-017 | 14 Nov | `@photo-sphere-viewer/core` and `@photo-sphere-viewer/gyroscope-plugin` exist on npm at 5.15.1. Resolves one item in `MASTER.md` section 14 | npm install at A1-02 |
| F-018 | 14 Nov | Next 16's global `LayoutProps`, `PageProps` and `RouteContext` types are generated. `npm run typecheck` runs `next typegen` first, so a fresh clone type-checks | Tried at A1-07 |
| F-019 | 14 Nov | Next 16 page and route `params` are Promises. In client pages use `useParams()`. In route handlers `await ctx.params` | `node_modules/next/dist/docs` |
| F-020 | 14 Nov | mongodb 7.9: `findOneAndUpdate` returns the document or null by default (no `value` wrapper). Duplicate key errors are `MongoServerError` with code 11000 | `node_modules/mongodb/mongodb.d.ts` |
| F-021 | 14 Nov | @anthropic-ai/sdk 1.8.0 does not throw at `new Anthropic()` without credentials. The first request fails with "Could not resolve authentication method", before any network call | Seen at A1-13 |
| F-022 | 14 Nov | @anthropic-ai/sdk 1.8.0 has `betaZodOutputFormat` in `@anthropic-ai/sdk/helpers/beta/zod` (built on `zod/v4`), `fallbacks: 'default'` on beta messages, and `parsed_output` on a stream's `finalMessage()` | Its typings |
| F-023 | 14 Nov | After a rebase, git (autocrlf on Windows) checks files out with CRLF. Scripted string replacements written with \n then fail to match | Seen at A1-13 |
| F-024 | 14 Nov | Twice, `npm run check` showed every test file failing with "Tests no tests" straight after a file write. Every rerun passed and it could not be reproduced. Rerun before debugging | Seen at A1-13, cause unknown |
| F-025 | 14 Nov | MongoDB Atlas answers a client whose IP is not on the Network Access list with a TLS failure ("tlsv1 alert internal error", SSL alert number 80), not with an auth error. Open Network Access (`0.0.0.0/0` for the weekend) | Seen at A1-08 |
| F-026 | 14 Nov | DeepSeek: `POST https://api.deepseek.com/chat/completions`, `Authorization: Bearer`, OpenAI-style SSE ending in `data: [DONE]`. Models `deepseek-flash` and `deepseek-v4-pro`; thinking is on by default and `reasoning_effort: "none"` turns it off. Flash is $0.30 in and | F-024 | 14 Nov | Twice, `npm run check` showed every test file failing with "Tests no tests" straight after a file write. Every rerun passed and it could not be reproduced. Rerun before debugging | Seen at A1-13, cause unknown |
.20 out per million tokens at peak, half off-peak and at weekends | api-docs.deepseek.com, 14 Nov |
| F-027 | 14 Nov | An Anthropic Console value starting `apikey_01` is the key's id, not the secret. The secret starts `sk-ant-` and is shown once, at creation | 401 from models.list at A1-11 |

## Session log

### 2026-11-14 15:15, planning (Fernando with Claude)

- Did: read the team's spec in `prompt-record.md`. Checked fal's current catalogue and the schema of each model the pipeline needs. Checked Google's Street View policy, OpenFreeMap, Photo Sphere Viewer and the Claude API reference. Wrote `MASTER.md` (plan v1), this notebook, the four agent pages, and the pointer files `CLAUDE.md` and `AGENTS.md`. Added a note to `CHRONODEX.md` that `MASTER.md` replaces it for scope.
- Decided: D-001 to D-010 above, all proposed.
- Not done: no application code. Nothing is committed.
- Open: the questions in `MASTER.md` section 13 and the unverified list in section 14.
- Next: humans do H1 (photos before sunset) and H2 (keys) now, then review the plan. Agent 1 starts A1-01. Agents 2, 3 and 4 start their spikes.

### 2026-11-14 15:30, plan v1.1 (Fernando with Claude)

- Did: added `BOARD.md`, the agent chat board, and `.gitattributes` so posts added at the same time merge. Added the rule that an agent asks before every commit and every push. Added the Haiku delegation skill in `.claude/skills/haiku-delegate/` with one sheet per agent. Updated `MASTER.md` (sections 0, 3, 4, 8, 10, 11, 13, 14), the four agent pages and the pointer files to match.
- Decided: D-011 to D-013 above, at the team's request.
- Not done: the approval rule is written down, not enforced by any tool. `MASTER.md` question Q8 covers that. Still no application code and nothing committed.
- Next: unchanged. Photos and keys first, then review.

### 2026-11-14 16:30, M0 build (Agent 1)

- Did: tasks A1-01 to A1-07 on branch `agent-1`. The detail is in `notebook/agent-1.md`.
- Decided: D-014 to D-016. Contract additions C-001.
- Not done: no commit or push yet (waiting for a human yes). Placeholder pages not yet seen in a browser or on a phone.
- Next: commit, push, announce M0 on the board. Then the MongoDB layer (A1-08).

### 2026-11-14 16:45, database, routes, jobs (Agent 1)

- Did: A1-09 and A1-14 done. A1-08 and A1-10 code done, MongoDB path not yet run against a live server. The detail is in `notebook/agent-1.md`.
- Decided: D-017 to D-020.
- Next: commit, then seed and verify against Atlas once `MONGODB_URI` exists (H2).

### 2026-11-14 16:55, Historian and chat (Agent 1)

- Did: A1-11 and A1-13 code, unit tested with a fake client. No real Claude call yet (no key). Fixtures moved to Agent 3's art and coordinates.
- Decided: D-021 to D-023.
- Next: commit; real calls and the Atlas seed once the H2 keys arrive.

### 2026-11-14 17:20, chat moves to DeepSeek (Agent 1)

- Did: the guide chat now calls DeepSeek; the Historian stays on Claude. MongoDB connection string received, but Atlas refuses this machine until Network Access is opened.
- Decided: D-024.
- Next: commit; Atlas verification and seed; real DeepSeek and Claude calls once the keys arrive.
