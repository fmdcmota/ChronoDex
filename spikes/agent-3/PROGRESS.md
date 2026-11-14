# Chronodex progress: Agent 3 and the whole repo

Snapshot: Sat 14 Nov 2026, about 16:55. Written for the team, in plain language. Detail lives in `notebook/agent-3.md` and `DEV_NOTEBOOK.md`.

## 1. What Agent 3 (Explorer) has done, in order

| Time | What happened | Problem solved |
|---|---|---|
| ~15:45 | Read the plan, the board and the notebooks. Made branch `agent-3` | Nothing was built yet and there was no app scaffold, so I worked in my own `spikes/agent-3/` folder, with dependencies kept apart from the code |
| ~15:50 | Checked the six landmark locations against OpenStreetMap and chose the map tools | The plan's coordinates were guesses. Now the building positions are verified, and the photo spots are flagged as estimates until the team's photos arrive |
| ~15:55 | Wrote the shared logic: distances, compass words ("north-east"), the 50 m capture rule, a location tracker. 51 tests | A test caught a photo spot placed too far from its landmark, and I fixed the data |
| ~16:10 | Built the game-style map: flat colours, sand roads, buildings with drop shadows, no labels | Starting from scratch was simpler than recolouring a 110-layer style |
| ~16:20 | Drew six original pixel-art landmark sprites, plus a collected and a locked badge for each | There was no fal key yet, so I drew the art in code: free, instant to redo, no copyright worries. A test caught two sprites with clipped outlines, fixed |
| ~16:25 | Built the map page: markers, capture rings, your position, a "next landmark" hint, the capture button, a hidden panel for faking location | Screenshots in a phone-sized browser showed a blank map (a MapLibre 6 file the bundler skips), markers in the wrong places, and a hard-to-read font. All three fixed |
| ~16:33 | Found that iCloud is syncing the repo and making "file 2" duplicates in `node_modules` | Reinstalled clean and warned the team to move the clone out of iCloud |
| ~16:35 | Wrote the optional fal sprite script (never run, no key, nothing spent). Wrote the docs and my notebook page | The script needs `--yes` and writes only to its own folder, so it can't overwrite the art or burn credits by accident |
| ~16:36 | Pulled Agent 1's scaffold. Matched their rarities. Put the art in `public/sprites/` | The badge rims are baked from rarity, so I copied Agent 1's values instead of mine |
| ~16:50 | Committed, rebased on Agent 1's newest work and pushed to `main`. Both check suites passed | Left an ASK on the board for Agent 1 and Agent 4 |

**Not done on my side:** nothing has been seen on a real phone yet. I've only used headless Chrome. The fal sprites were never generated.

## 2. Whole repo: where we are and what's left

### Milestones (target times from `MASTER.md`)

| | Milestone | Target | Status |
|---|---|---|---|
| M0 | Foundation | Sat 16:15 | Code is on `main`. Late, and still waiting for a human walk-through on a phone |
| M1 | Risky parts proven | Sat 17:45 | At risk. Agent 2 has not started, and the fal key is missing |
| M2 | Vertical slice | Sat 20:00 | Not started |
| M3 | Full loop | Sat 23:00 | Not started |
| M4 | Content complete | Sun 02:00 | Not started |
| M5 | Demo ready | Sun 10:00 | Not started |

### By agent

| Agent | Done | Next |
|---|---|---|
| 1 Core | Scaffold, contracts, fixtures, mock client, database layer, API routes, job queue, dev flags (on `main`) | Seed the database, Historian (A1-11), chat (A1-13), Vercel deploy. Needs `MONGODB_URI` and `ANTHROPIC_API_KEY` |
| 2 Studio | Nothing | Everything: all fal bake-offs (A2-01 to A2-06), then the fal library, pipeline and worker. **Biggest risk**: it is the critical path |
| 3 Explorer (me) | Art and map spike (A3-01, A3-02) | A3-03 app shell and UI kit, A3-04 map screen, A3-05 location, A3-06 capture, then Dex, resilience, hints and a phone pass |
| 4 Time Machine | 360° viewer spike, committed on `main` | Phone check of the spike, then the Time Machine screen, 360° view, guide player and chat. Needs real eras from Agent 2 |

### What is blocking the team

1. **fal key and credits.** Agent 2 can't start, and my fal sprite route can't run.
2. **`MONGODB_URI` and `ANTHROPIC_API_KEY`.** They block Agent 1's database check, the Historian and chat.
3. **The H1 landmark photos with GPS.** They give real photo spots and the base image for every era edit. Sunset was about 16:10, so if they weren't taken, the light is gone.
4. **Real-phone checks.** Nobody has seen the map, the 360° viewer or the scaffold on a phone. The gates need an iPhone and an Android phone.
5. **iCloud.** Move the clone out of iCloud-synced Documents.

### Still to build, by priority

1. Agent 2 starts the fal spikes, which is the critical path to M1.
2. Agent 3 builds the real app shell and map screen (port my spike into Next.js; the MapLibre worker fix needs testing there).
3. Agent 3 builds the capture flow, with the camera, the upload through Agent 2's route and the badge award.
4. Agent 4 builds the Time Machine and chat screens against mock data.
5. Agent 1 finishes the Historian and chat, then deploys to Vercel.
6. Everyone: pre-generate the demo eras overnight (M4), then rehearse and record a backup video (M5).

### Open questions for the humans

- When is the real submission deadline (Q1)? Every target above assumes Sunday midday.
- How many fal credits do we have (Q2)? That decides how many guide videos we can afford.
- Who runs the worker (Q5)?
