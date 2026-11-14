# Agent 4 (Time Machine): progress report

Written Sat 14 Nov 2026, updated 18:10 from the latest `main` (`db4e25e`), for the human running Agent 4.
Times come from git and the clock. The detailed log is in [agent-4.md](agent-4.md).

## 1. What Agent 4 has done so far

| Time | What happened | Problems hit and how they were solved |
|---|---|---|
| 15:43 | Session start. Read the plan, the notebooks and the board. No app existed yet, so started on the experiments (spikes) that need no app | — |
| 16:09 | **360° viewer test page** done and pushed to `main`. Look around a panorama by dragging or by moving the phone. Works with full panoramas and with partial strips | A rounding issue left a thin seam at the back of the view: fixed. You could turn past the edge of a strip into black: the view now stops at the edges. The laptop browser rejected the test certificate: added a plain-HTTP mode for desktop checks |
| 16:23 | **Media test page** committed (branch `agent-4`). Guide clips play back to back, hold-to-talk recording works, and a test for iPhone audio rules. Also wrote **PHONE_TEST.md**, the checklist for whoever tests on phones | No video tools on this laptop to make test clips: the page records its own clips in the browser. Clip changes measured at 1 to 2 ms, no black flash. A test server would not stop cleanly: stopped by hand |
| 16:27 | Agent 1's base app (M0) landed on `main` | — |
| 16:31 | **Chat test page** committed (branch `agent-4`). Text-message look, typing dots, replies appearing word by word, saved history, voice buttons | Two helpers handed to Haiku (reply-stream reader, saved history); both reviewed and kept. Fixed a doubled full stop in an error message |
| 16:31 to 16:50 | Moved branch `agent-4` onto the base app. **Built the real Time Machine and chat screens** in the app, replacing Agent 1's placeholders. Year bar, 360° view, guide video with captions, live "travelling back" progress list, chat on the shared API client | The 360° view showed nothing (0 px tall) because of a style clash: fixed. A code rule forbade one pattern: moved the logic. Haiku's caption code used a feature older iPhones cannot read, which would have broken the whole page: replaced. The progress list hid the view for minutes: it now shrinks to one line |
| 16:50 | Read the newest board posts, fixed timestamps that had run ahead of the clock, wrote this report | One board post already committed carries a wrong time (16:45, really 16:31). The board is add-only, so the next post corrects it |
| 18:08 | Checked nothing was lost after the human's `git pull` (nothing was). Re-read `main` and updated this report. Moved the uncommitted work into this session's worktree so it can be committed | The session had been moved to a new worktree that may not write to the old one; the work was copied across instead. Nothing on `main` touches Agent 4's files or the API they use, so a later merge should be clean |

**Where the work sits after this commit**

- On `main`: only the 360° viewer test page (`7de1d9b`).
- On a local branch, not pushed: the media and chat test pages, then this commit with the real Time Machine and chat screens, Test 4 in PHONE_TEST.md, the notebook, the board post and this report.
- `npm run check` passes. Everything was checked in a desktop browser at phone size with test data. **Nothing has been tried on a real phone yet.**

## 2. Whole-project progress (from `main` at 18:08)

### Milestones (targets from MASTER.md; it is now 18:08)

| | Milestone | Target | Where it stands |
|---|---|---|---|
| M0 | Foundation | Sat 16:15 | **Built and on `main`** since 16:27. Never walked through by a person, so the gate is not formally passed |
| M1 | Risky parts proven | Sat 17:45 | **Late, but close.** Agent 2 has run scene, headshot and panorama through fal, and made voice, talking-guide and walk-on samples. Missing: a person's pick of voice and talking-guide model, the full 45 s talk clip, and any phone check of the 360° viewer |
| M2 | Vertical slice | Sat 20:00 | Time Machine and chat are built; the chat server and Historian are written. Missing: keys, the capture and map screens (Agent 3), the fal library and pipeline (Agent 2), the Vercel deploy |
| M3 to M5 | Full loop, content, demo | Sat 23:00 to Sun 10:00 | Not started |

### Each agent

| Agent | Done | Next | Waiting on |
|---|---|---|---|
| 1 Core | Base app, shared types, test data (now with Agent 3's art and map-checked points), API client, database layer, API routes, job queue, dev switches, **Historian** and **chat server** (both tested with a fake Claude, no real call yet) | Seed the database, one real brief and one real chat reply, deploy to Vercel, write the demo briefs | **Keys**: `MONGODB_URI`, `ANTHROPIC_API_KEY`. Landmark photos for exact photo spots |
| 2 Studio | fal works. Models chosen for scene, headshot, panorama, guide frame and speech-to-text. Voice, talking-guide and walk-on samples made | A person listens and watches the samples (`spikes/agent-2/out/review.html`), then the voice list, the 45 s clip, and the fal library in the app | **A person to review the samples**. It was told not to read the board or rebase, so it may miss other agents' notes |
| 3 Explorer | Art style, sprites and badges, game-style map test page, team progress summary. On `main` | App shell and theme, map screen, location, capture, Dex | Nothing blocking. Landmark photos for exact photo spots |
| 4 Time Machine | 360° viewer, guide player, progress list, year bar, chat screen, voice in and out (screen side) | See below | Phone results; Agent 2's voice routes; real eras |

### What's left for Agent 4

1. **Bring the work onto `main`** when you say so: pull, re-run the checks, push.
2. **Try Agent 2's real panorama** in the viewer (full 2:1, link in `notebook/agent-2.md`), on a phone if possible. This is part of M1.
3. **A4-06** Then/now slider: drag between today's photo and the same view in the chosen year.
4. **A4-09** Sources list for each era, plus the "go to the next landmark" prompt after the chat.
5. **Theme**: switch both screens to Agent 3's palette and pixel font once their app shell lands.
6. **A4-08** Finish voice once Agent 2's speech routes exist (the screen side is done).
7. **Real data** (M2): turn test data off once keys and real eras exist, and try one era end to end.
8. **A4-10** Phone pass on iPhone and Android, then polish.

### What the humans need to do

1. **Share keys privately** (H2): `ANTHROPIC_API_KEY` and `MONGODB_URI` to Agent 1. Agent 1's Historian, chat, database and deploy all wait on them. (Agent 2 already has `FAL_KEY`.)
2. **Review Agent 2's samples** in `spikes/agent-2/out/review.html`: pick the voices and the talking-guide model. Agent 2 is waiting on this.
3. **Phone tests**: run `spikes/agent-4/PHONE_TEST.md` on an iPhone and an Android phone, including Agent 2's panorama in the viewer. Needed for M1.
4. **Walk the M0 gate**, review Agent 1's contract additions (C-001 in DEV_NOTEBOOK.md), and ask Agent 1 to update the milestone board (it still says M0 is not committed).
5. **Merging**: Agent 2's work came in through GitHub's merge button. MASTER.md asks for `git pull --rebase` because the button may not keep everyone's board posts. The board looks intact, but posts are now out of time order.
6. **Agent 3's warning**: if a teammate's clone sits in iCloud-synced Documents, move it out before iCloud corrupts `.git`.
7. **Confirm the deadline and judging criteria** with the organisers (H5); every target above assumes Sunday midday.
