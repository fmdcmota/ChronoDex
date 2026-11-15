# Chronodex: what is left, round 2 (tasks per agent, Gantt)

Written Sun 15 Nov 2026 at 03:10 by Agent 4 at the human's request, after phone tests 1 to 6. **Updated at 04:05**
after pulling main, and at 04:15 with round 3 (section 0): run long until only the videos are left. This replaces the
action list and Gantt in `REMAINING_WORK.md`, which stays as the record of round 1. Freeze is still assumed at
10:00 and submission at 12:00 (unconfirmed). Clock note: some board posts are stamped hours ahead of the real
time; times here are the real clock.

**How agents use this file.** Read your section in 3, take tasks top to bottom, and log each in your notebook as
usual. Ask on the board when a task waits on someone else. Do not edit other agents' sections: post corrections to
`@team` instead.

## 0. Round 3 (04:15): run long, until only the videos are left

**The goal, from the human:** the agents keep working until everything works, so that the last step of the whole
project is: switch `VIDEO_GENERATION=on`, run one command that makes the guide videos, switch it off. Nothing else.

### 0.1 The finish line: "video-ready"

Every box below must be ticked, by the owner named, before the human spends a cent on video.

| # | Must be true | Owner |
|---|---|---|
| V1 | The 8 demo eras (section 1) open on an iPhone through the tunnel: 360° view, preview guide, captions, Sources, chat reply, voice reply | Agent 6 checks, owners fix |
| V2 | M2 gate passed and logged: capture, Dex, chat, generate on a real phone | Agent 1 with a human |
| V3 | **Video only starts on purpose.** The Time Machine never asks for the video tier by itself, and the server accepts video only for eras on an allow list (`VIDEO_ERAS`), so turning video on cannot spend on every era someone opens | Agent 4 (client), Agent 1 (server) |
| V4 | Every input the video tier needs exists and fal can read it for each demo era: scene, headshot, narration (`/demo/...` paths go through `toFalUrl`); narration length fits the talk model (Kling) or is split | Agent 2 |
| V5 | The video tier runs end to end in a dry run (mocks, no spend) through the worker on Agent 4's machine, writing `guideVideo` with three segments | Agent 2 |
| V6 | The Time Machine swaps from the preview to the real clips as soon as `guideVideo` lands, without a reload; captions on the talk clip; ambience ducks; tested with a fake `guideVideo` | Agent 4 |
| V7 | A one-page runbook `VIDEO_RUNBOOK.md`: the exact commands (env, worker, `pregenerate.ts --video --only <era>` one era at a time, `--max-usd`), how to watch progress, how to stop, what to check on a phone, then switch off. First era is the canary: check it before the next | Agent 2 |
| V8 | Content is right: the 8 demo eras fact-checked (Agent 5) and their briefs read by a human (H7), because a video freezes the script | Agent 5, a human |
| V9 | Then/Now is right or hidden for every demo era | Agent 4 (Agent 2 and 5 for the real fix) |
| V10 | Everything is backed up: `public/demo/` in git, GridFS-only files on disk | Agent 2 |

Budget: $14.97 left. At about $4.25 an era: the canary (Queen's Tower 1893), then at most two more.

### 0.2 How agents work in round 3 (the relay rule)

1. Work your queue in 0.3 top to bottom without stopping between tasks. Commit and push as you go.
2. **When you are waiting on another agent:** post `BLOCKED` on the board naming the agent and task, **and tell
   your own human in one line**: "Waiting on Agent N's <task id> (<what>). Please ask Agent N's human to
   prioritise it." Then carry on with your next unblocked task. Do not sit idle.
3. When you finish something another agent waits on, post `REPLY` to them at once (its own commit if needed).
4. Before you stop for any reason, rewrite your notebook's Current state.

### 0.3 Queues (long; work them in order)

**Agent 1 (Core)**
1. **R3-1a (V3, server)** `VIDEO_ERAS` env: comma-separated era ids that may get the video tier while
   `VIDEO_GENERATION=on`; anything else answers 403 `video_disabled`. Document in `.env.example`. Tests.
2. R3-1b Historian offers only `selectableVoices()` (A1-r2-7).
3. R3-1c (V2) M2 gate on the tunnel with your human and a phone; log it; M1 as passed at about 03:00.
4. R3-1d Chat check for all 8 demo eras with mocks off (a reply each, in character, short); fix prompt issues.
5. R3-1e Delete Agent 3's test capture in `chronodex_dev_agent2`; keep `DEV_NOTEBOOK.md` current.
6. Then: help with whatever is `BLOCKED` on the board.

**Agent 2 (Studio)**
1. R3-2a (V10) Back up the GridFS-only Queen's Tower 1893 panorama (A2-r2-6).
2. R3-2b (V4) For each demo era: inputs exist and pass `toFalUrl`; narration length vs Kling's maximum; if over,
   build the split (two talk requests played back to back, the player already handles extra segments).
3. R3-2c (V5) Dry run of the video tier for all 8 eras through the worker on Agent 4's machine; fix what breaks.
4. R3-2d (V7) Write `VIDEO_RUNBOOK.md`; have Agent 4 read it.
5. R3-2e When Agent 5 lands a wide Queen's Tower photo: regenerate the 1893 scene only (about $0.17) (A2-r2-7).
6. Do not run the real video tier until the human says go.

**Agent 3 (Explorer)**
1. R3-3a Check only the 8 demo landmarks light up on the tunnel (A3-r2-5).
2. R3-3b With a human: Android pass, Add to Home Screen (A3-r2-3, A3-r2-6).
3. R3-3c Map and Dex polish for the demo route Agent 6 writes; nothing new after 10:00.

**Agent 4 (Time Machine)**
1. **R3-4a (V3, client)** The Time Machine stops asking for the video tier; videos come only from the runbook.
2. R3-4b (V6) Test the swap from preview to real clips with a fake `guideVideo` era; fix if it needs a reload.
3. R3-4c (V9) Then/Now: apply Agent 2's crop for Queen's Tower 1893 or hide it; check the other 7 eras.
4. R3-4d `/demo/...` files in the browser cache (A4-r2-8); WAV voices on iOS (A4-r2-9).
5. R3-4e Keep the server and tunnel up; post every new URL.
6. R3-4f Read Agent 2's runbook (V7) and add the phone checks.

**Agent 5 (Archivist)**
1. R3-5a (V8) Fact-check the 8 demo eras' summary, facts and script; post each unsupported claim to Agent 1.
2. R3-5b A wide, licensed present-day photo of Queen's Tower from far back on Queen's Lawn (unblocks R3-2e).
3. R3-5c Credits for period images the demo eras used.

**Agent 6 (demo set)**
1. R3-6a (V1) Open all 8 eras through the tunnel; post each problem to its owner.
2. R3-6b The demo route and script for the rehearsal (`DEMO.md`).
3. R3-6c Re-check V1 after every fix lands; keep the V1 to V10 table's ticks current on the board.

### 0.4 Who is waiting on whom right now (04:15)

| Waiting | On | For | Tell this human |
|---|---|---|---|
| Agent 2 (R3-2e, Then/Now real fix) | Agent 5 | R3-5b wide Queen's Tower photo | Agent 5's human: prioritise R3-5b after R3-5a |
| Agent 1 (R3-1c gates) | a human with a phone | M2 walk-through | Agent 1's human |
| Agent 2 (R3-2c dry run on this machine) | Agent 4's machine and human | access to run the worker here | Agent 4's human |
| Final video step | Agent 1 R3-1a, Agent 4 R3-4a, Agent 2 R3-2b to R3-2d, Agent 5 R3-5a + human H7 | V3 to V8 | everyone: these are the critical path |
| Agents 3 and 6 | Agent 4 | server on `chronodex` | nobody: done at 04:12 |

The section 3 tables below keep the round 2 history.

### 0.5 Gantt to video-ready (real clock)

```
                                          04 05 06 07 08 09 10 11 12
 VIDEO-READY (critical path)
  R3-4a client never asks for video        █
  R3-1a server VIDEO_ERAS allow list       █  █
  R3-2b inputs and Kling length per era    █  █
  R3-2c video-tier dry run, all 8 eras        █  █
  R3-4b preview to clips swap tested          █
  R3-2d VIDEO_RUNBOOK.md                         █
  R3-5a fact-check + H7 human read          █  █  █
  R3-6a/c all 8 eras on a phone (V1)        █  █  ▒  ▒
  R3-1c M2 gate (V2)                           ▒  ◆
  VIDEO-READY: V1 to V10 ticked                        ◆
  HUMAN: video on, canary era, then 1-2 more              █  █
 PARALLEL
  R3-4c Then/Now crop or hide               █
  R3-5b wide photo -> R3-2e new 1893 scene     █  █  █
  R3-3b Android, Add to Home Screen            ▒  ▒  ▒
  R3-6b demo route                             █  █
 FINISH
  FEATURE FREEZE                                          ◆
  rehearse, backup video, submit                             █  █  ◆
```

Video-ready by about 08:00 leaves two hours of credit-limited generation before the freeze. Section 4 below is
the 04:00 chart, kept for history.

## 1. Where we are (04:05)

- **The demo set exists.** Agent 6 generated 8 eras (core tier, no guide video) and loaded them into `chronodex`:
  Queen's Tower 1893 and 1962, Royal Albert Hall 1871, Natural History Museum 1862 and 1881, Raffles' Landing
  1819, Zócalo and Metropolitan Cathedral 1519, Dom Luís I Bridge 1886. Their files are in the repo under
  `public/demo/<eraId>/` (27 MB). The other 14 eras are `missing`, and the Map greys their landmarks out
  (Agent 3), so judges never open an empty Time Machine. **This is the demo list** unless the team says otherwise.
- **Everything runs on Agent 4's computer**: production build, port 3110, Cloudflare quick tunnel (URL on the
  board). At 04:05 it still reads `chronodex_dev_agent2`; Agent 4 switches it to `chronodex` first (A4-r2-2).
- **Credits:** $14.97 of fal credit left (Agent 2's human). One guide video is about $4.25, so at most three.
  **The guide video is on hold** until the team confirms details; the preview (portrait walks on, real narration,
  captions) stands in. Talk model chosen: Kling. Voices final: Charlotte, Daniel, Gemini Kore, Aoede, Iapetus,
  plus Agent 6's accent voices for Mexico City, Porto and Singapore.
- **Done since 03:10:** chronodex seeded (Agent 1); the pipeline saves every output to our store and uploads
  inputs through `toFalUrl` (Agent 2, A2-h); Queen's Tower 1893 regenerated in colour (Agent 2); real capture
  through the tunnel, Dex, greyed-out landmarks (Agent 3); real ambience layers and levels, map zoom polish
  (Agent 4); the demo set (Agent 6).
- **Still open:** Then/Now for Queen's Tower 1893 (the stand-in reference photo is too close for the model to keep
  its framing; a wide photo from far back on Queen's Lawn is the real fix); Android; the human reading the
  8 demo briefs; listening to the accents; the M2 and M3 gates on a phone.

## 2. Phone test results (iPhone, Safari, 15 Nov about 03:00)

| Test | Result | Goes to |
|---|---|---|
| 6.1 to 6.3 real panorama, drag, motion | Pass | |
| 6.4 guide preview | Works. **The ambience is too loud once you move into the chat** | Agent 4 (A4-r2-1) |
| 6.5 Then/Now | **Fail: the two pictures are not the same viewpoint.** The 1893 scene in `chronodex_dev_agent2` was made before Agent 5's reference photo (A5-07) existed, so it is not an edit of that photo. The slider must compare the reference photo with a scene edited from that same photo | Agent 2 (A2-r2-2), Agent 4 checks (A4-r2-3) |
| 6.6 to 6.9 | Pass | |
| 5.1 jitter | Was too jittery, fixed by the damping update | |
| 5.2, 5.3, 5.5, 5.6 and the rest | Pass | |
| 5.4 mic earcons | Pass. **The ambience is too loud and gets into the voice recording** | Agent 4 (A4-r2-1) |
| Test 2 clips and mic page | Pass: gaps 16 ms, `audio/webm;codecs=opus` 4.0 s 109 KB (Safari 27 on a Mac) | |
| Test 3 chat | Pass: good replies, voice replies work. Voice input failed once on the human's phone, probably the phone | Agent 4 retests on the real chat (A4-r2-6) |
| Test 1 motion | Pass, given a good panorama | |

## 3. Tasks per agent (status at 04:05)

✓ done, ▶ do now, ⏸ waiting (on what), ✗ dropped. Take ▶ tasks top to bottom. Older ✓ rows are kept so the
history reads in one place.

### 3.1 Agent 1 (Core)

| # | Task | Status |
|---|---|---|
| A1-r2-1 | Push pending work | ✓ |
| A1-r2-3 | Seed `chronodex` (all landmarks, reference photo path) | ✓ 13+ landmarks, 20+ eras |
| A1-r2-5 | Demo era list | ✓ Agent 6's 8 eras, unless the team objects on the board |
| A1-r2-6 | Tell Agent 4 to switch the server | ✗ not needed, Agent 4 switches now |
| A1-r2-7 | **New.** Historian offers only `selectableVoices()` from `@/lib/fal` (Agent 2's 03:51 ask), so no retired voice is picked again | ▶ |
| A1-r2-4 | M2 gate checks (capture, Dex, chat, generate) on the tunnel once it serves `chronodex`; log M1 and M2 on the milestone board | ⏸ A4-r2-2, then ▶ |
| A1-r2-8 | **New.** Delete Agent 3's test capture (player `a3-test-1794712950868`) from `chronodex_dev_agent2` | ▶ low |
| A1-r2-9 | **New.** Keep `DEV_NOTEBOOK.md`'s milestone board current: M1 passed on an iPhone at about 03:00 (real panorama), M2 waits on A1-r2-4 | ▶ |

### 3.2 Agent 2 (Studio)

| # | Task | Status |
|---|---|---|
| A2-r2-1 | Push the queue | ✓ PR 4 and 5 |
| A2-r2-2 | Persist outputs, `toFalUrl` inputs (A2-h) | ✓ |
| A2-r2-3 | Regenerate Queen's Tower 1893 from the reference photo | ✓ done, but the framing cannot match the close stand-in photo (see A5-r2-2) |
| A2-r2-4 | Final voices | ✓ |
| A2-r2-5 | Real guide video for Queen's Tower 1893 (Kling, about $4.25) | ⏸ the team's go-ahead; then ▶ first thing, it takes about 15 min |
| A2-r2-6 | **Changed.** Back up what is only in GridFS: `chronodex`'s Queen's Tower 1893 panorama (`/api/media/...`). The 8 demo eras' other files are in the repo already | ▶ |
| A2-r2-7 | **New.** When A5-r2-2 lands a wide reference photo, regenerate only the 1893 scene (about $0.17) so Then/Now lines up | ⏸ A5-r2-2 |
| A2-r2-8 | **New.** If the go-ahead allows more than one video, Royal Albert Hall 1871 next, then one non-London era | ⏸ team |

### 3.3 Agent 3 (Explorer)

| # | Task | Status |
|---|---|---|
| A3-r2-1, r2-2, r2-4 | Push, real capture through the tunnel, grey out landmarks with no ready era | ✓ |
| A3-r2-5 | **New.** Once the server reads `chronodex` (A4-r2-2), check that exactly the 8 demo landmarks light up and the rest are grey, on the tunnel | ⏸ A4-r2-2, then ▶ |
| A3-r2-3 | Android pass of Map, Capture, Dex | ⏸ a human with an Android phone |
| A3-r2-6 | **New.** MAP-11 Add to Home Screen on a real iPhone | ⏸ a human |
| A3-r2-7 | Polish only. Nothing new after 10:00 | |

### 3.4 Agent 4 (Time Machine)

| # | Task | Status |
|---|---|---|
| A4-r2-1 | Ambience: real layers, quieter chat, silent while recording | ✓ phone retest PHONE_TEST 6.10 to 6.13 |
| A4-r2-4 | Map zoom polish | ✓ |
| A4-r2-2 | **Switch the phone server to `chronodex`**, with `public/reference/queens-tower.jpg` in the server's checkout; post on the board | ▶ first |
| A4-r2-3 | Then/Now for Queen's Tower 1893: check Agent 6's scene against the reference photo; apply Agent 2's crop or hide the button for eras whose scene does not line up | ▶ |
| A4-r2-8 | **New.** Keep `/demo/...` files in the browser cache too (they never change), so the 8 demo eras open instantly on a second visit | ▶ |
| A4-r2-9 | **New.** Gemini voices return WAV: check narration and chat replies play on iOS from WAV | ▶ |
| A4-r2-5 | Real guide video on a phone | ⏸ A2-r2-5 |
| A4-r2-6, r2-7 | Voice input on a second phone; Android pass | ⏸ a human with the phones |

### 3.5 Agent 5 (Archivist)

| # | Task | Status |
|---|---|---|
| A5-r2-1 | **New.** Fact-check the 8 demo eras' text (summary, fun facts, script) against sources; post any claim that has none. This replaces new research: no new eras before the freeze | ▶ first |
| A5-r2-2 | **New.** A wide, licensed present-day photo of Queen's Tower from far back on Queen's Lawn, so the 1893 scene can keep its framing with the Institute's wings added (fixes Then/Now) | ▶ |
| A5-r2-3 | Picture credits (`licence`, `author`, `pageUrl`) for any period image the 8 demo eras used, so the Sources drawer credits them | ▶ |

### 3.6 Agent 6 (demo set)

| # | Task | Status |
|---|---|---|
| A6-r2-1 | **New.** Once the server reads `chronodex`, open all 8 eras through the tunnel (headless is fine): 360 view, Meet guide, Sources, chat reply; post anything broken to its owner | ⏸ A4-r2-2, then ▶ |
| A6-r2-2 | **New.** Write the demo route (which landmarks, in which order, what to say) for the rehearsal, in `scripts/demo/README.md` or a new `DEMO.md` | ▶ |

### 3.7 The humans

| # | Task | Unblocks |
|---|---|---|
| HU-1 | Voices and talk model | ✓ |
| HU-2 | Go or no-go on the guide video: $14.97 left, about $4.25 each | A2-r2-5, A4-r2-5 |
| HU-3 | Read the 8 demo eras' briefs (H7), helped by A5-r2-1 | the demo's accuracy |
| HU-4 | An Android phone for A3-r2-3 and A4-r2-7 | Android |
| HU-5 | Confirm the deadline and judging criteria | the schedule |
| HU-6 | **New.** Listen to the accented voices (Mexico City, Porto, Singapore) and say if any sound wrong | Agent 6 |
| HU-7 | **New.** Phone retest 6.10 to 6.13 (ambience) and 6.5 after A4-r2-3 | A4 |
| HU-8 | **New.** Keep Agent 4's computer awake and plugged in: it is the whole demo | everything |

## 4. Gantt (real clock, from 04:00, Sunday 15 Nov)

Each column is one hour from the time shown. `█` work, `▒` waiting or checking on a phone, `◆` milestone,
`?` only if the team says yes.

```
                                            04 05 06 07 08 09 10 11 12
 CRITICAL PATH: the demo served from chronodex, checked on phones
  A4-r2-2 server on chronodex                █
  A3-r2-5 / A6-r2-1 check the 8 eras         █  █
  A1-r2-4 M2 gates on the tunnel                ▒  ◆ M2
  A4-r2-3 Then/Now fix or hide               █  █
  HU-7 phone retest (ambience, Then/Now)        ▒  ▒
  HU-2 guide video go or no-go               ▒  ▒
  A2-r2-5 real guide video (Kling, bg)          ?  ?  ?
  A4-r2-5 guide video on a phone                      ?  ◆ M3 (preview stands in if no)

 PARALLEL
  A5-r2-1 fact-check 8 demo eras             █  █  █
  HU-3 read the 8 briefs                        ▒  ▒  ▒
  A1-r2-7 Historian voice list               █
  A2-r2-6 back up GridFS-only files          █
  A4-r2-8/9 demo files cached, WAV on iOS    █  █
  A5-r2-2 wide Queen's Tower photo           █  █  █
  A2-r2-7 regenerate 1893 scene                       █
  A6-r2-2 demo route written                    █  █
  HU-6 listen to accents                     ▒  ▒
  A3/A4 Android (HU-4)                             ▒  ▒

 FINISH
  M4 content complete, backed up                          ◆
  FEATURE FREEZE                                             ◆
  backup video, three run-throughs, fixes only                  █  █
  SUBMISSION                                                       ◆
```

**Order of completion:** (1) 04:00 to 05:00 the server reads `chronodex` and the 8 demo eras are checked on the
tunnel; (2) by 06:00 the M2 gate passes on a phone and Then/Now is fixed or hidden; (3) 05:00 to 08:00 the
fact-check and the human's brief reading run in parallel; the guide video runs only if the team says yes;
(4) 09:00 content complete and backed up (M4); (5) 10:00 freeze; rehearse with Agent 6's demo route; submit.

**Risks.** One computer runs everything: if it sleeps or the tunnel restarts, the URL changes and the demo is
down, so keep it awake (HU-8) and post every new URL. Guide video credits: three at most. The stand-in reference
photo keeps Then/Now approximate for Queen's Tower until a wide photo exists; hiding the button is the fallback.

