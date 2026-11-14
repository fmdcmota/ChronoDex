# Agent 1 (Core): progress report

Saturday 14 November 2026, written at about 17:00. A plain-language summary for the team. The detailed record is in [agent-1.md](agent-1.md) and [DEV_NOTEBOOK.md](../DEV_NOTEBOOK.md).

## 1. What Agent 1 has done so far

| Time | What happened |
|---|---|
| 15:40 | Read the plan (MASTER.md), the notebooks and the board. Found that this laptop had no Node.js installed, so nothing could run. Installed it. |
| 15:45 | Created the Next.js app. The newest Next.js (version 16) has a few surprises: it wanted to rewrite AGENTS.md, which the humans own, and it switches on a caching mode that trips up code written in the usual way. Turned both off and noted why. |
| 15:50 | Installed the shared libraries everyone needs (fal, Claude, MongoDB, the map, the 360° viewer). One test tool clashed with another library's version; fixed by choosing compatible versions. |
| 16:00 | Wrote the shared "contracts": the exact shape of a landmark, an era, a job, a capture and so on, which all four agents build against. The code checks itself, so it complains if the shapes ever drift apart. |
| 16:05 | Made test data for the six landmarks, with one era (Queen's Tower, 1893) fully filled in with placeholder pictures, audio and video. |
| 16:10 | Built "mock mode": the app can run with no internet, database or keys. A fake generation job runs for about 20 seconds, so Agents 3 and 4 can build their screens straight away. |
| 16:15 | Added placeholder pages for all five screens, the `npm run check` safety check, and a rule that every piece of code must be documented. |
| 16:30 | **M0 (Foundation) pushed to main and announced to the other agents.** About 15 minutes after the target. |
| 16:35 | Built the real database layer (MongoDB) and the six data routes the app calls (landmarks, eras, generate, captures, Dex). Without a database connection it runs in memory, so the team can try it today. |
| 16:40 | Built the job queue. It makes sure two players asking for the same year never pay twice, and that a job left by a crashed worker is picked up again. Added the two safety switches: video generation stays off unless switched on, and fake locations are refused unless allowed. |
| 16:45 | Second batch pushed to main. |
| 16:50 | Built the guide chat (answers stream in word by word, in character) and the Historian. The Historian researches a landmark and year on the web, then writes the summary, sources, fun facts and the guide's 45-second script, and checks the script length and sources itself. |
| 16:55 | Switched the test data to Agent 3's pixel art and their map-checked coordinates, as they asked on the board. Waiting for approval to push. |

**Problems solved along the way**

- No Node.js on the laptop: installed it.
- Next.js 16 surprises: stopped it editing AGENTS.md, and turned off a caching mode that would confuse the agents.
- A placeholder for the guide's opening line could have been saved as real history by mistake. Removed that path.
- A phone opening the dev server without HTTPS would have crashed when making a player id. Added a fallback.
- Windows line endings broke some scripted edits. Noted as a trap for the other agents.

**Not yet tested for real** (no keys yet)

- The MongoDB database layer has never talked to a real database.
- The chat and the Historian have never called Claude. They are tested with a stand-in.
- Nothing has been looked at on a phone yet.

## 2. Where the whole project stands

**Milestones** (targets from MASTER.md)

| Milestone | Target | Status |
|---|---|---|
| M0 Foundation | 16:15 | Done in code at 16:30. A human still needs to click through it on a phone. |
| M1 Risky parts proven | 17:45 | **At risk.** No fal generation has run yet. The 360° viewer works on desktop but hasn't been tried on a phone. |
| M2 Vertical slice | 20:00 | Data, API, chat and Historian are written. Waiting for keys, the fal pipeline, and the real screens. |
| M3 to M5 | 23:00 to Sun 10:00 | Not started. |

**Each agent**

| Agent | Done | Next |
|---|---|---|
| 1 Core | Foundation, database, data routes, job queue, chat, Historian, safety switches | Connect a real database and Claude once keys arrive; deploy to Vercel; write and check the briefs for every demo era |
| 2 Studio (fal) | **Nothing pushed yet** | Everything generated: images, the 360° view, voices, the guide video, the worker. The biggest risk to the schedule. |
| 3 Explorer | Pixel art, sprites and badges, map design spike | App shell and theme, map screen, camera capture, Dex |
| 4 Time Machine | 360° viewer spike (desktop only) | Phone check, then the Time Machine screen, video player, chat screen |

**What the humans need to do now**

1. **Share the keys privately (H2):** MongoDB Atlas connection string, Anthropic key, fal key, and how many fal credits we have. Without them nothing real can run.
2. **Check on Agent 2.** It has posted nothing. If it hasn't started, start it now: every fal model still needs proving, and M1 is due at 17:45.
3. **Landmark photos (H1):** if they were taken before sunset, share them, with GPS left on. They give the real photo spots and the base image for every era.
4. **Phone checks:** open Agent 4's 360° spike and Agent 3's map spike on an iPhone and an Android phone, and click through the M0 placeholder pages.
5. **Confirm the deadline and judging criteria (H5)**, so the timeline can be adjusted.
6. **Agent 3's teammate:** their clone of the repo is in an iCloud-synced folder, and iCloud is already making conflict copies. Move it out before it damages the git history.

**What is left overall**

- The fal pipeline and worker that actually generate eras (Agent 2). Everything visual depends on it.
- The real screens: map, capture, Dex, Time Machine, chat (Agents 3 and 4).
- Deploy on Vercel over HTTPS, and check camera, location and motion on real phones.
- Research and human-check a brief for every demo era, then pre-generate the content overnight.
- Back up the media, rehearse, and record a backup video on Sunday morning.
