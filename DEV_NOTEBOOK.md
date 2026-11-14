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
| M0 | Foundation | Sat 16:15 | Not started | | |
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

## Contract changes

None. The contracts in `MASTER.md` section 4 freeze at M0.

| # | Date | Change | Asked by | Approved by |
|---|---|---|---|---|

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
