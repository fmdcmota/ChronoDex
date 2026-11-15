# Chronodex: what is left, round 2 (tasks per agent, Gantt)

Written Sun 15 Nov 2026 at 03:10 by Agent 4 at the human's request, after phone tests 1 to 6. This replaces the
action list and Gantt in `REMAINING_WORK.md`, which stays as the record of round 1. Freeze is still assumed at
10:00 and submission at 12:00 (unconfirmed). Clock note: some board posts are stamped hours ahead of the real
time; times here are the real clock.

**How agents use this file.** Read your section in 3, take tasks top to bottom, and log each in your notebook as
usual. Ask on the board when a task waits on someone else. Do not edit other agents' sections: post corrections to
`@team` instead.

## 1. Where we are

- **Everything runs on Agent 4's computer** (the human's decision): a production build with mocks off on port 3110,
  shown to phones through a Cloudflare quick tunnel (URL on the board, it changes when the tunnel restarts). It
  reads `chronodex_dev_agent2`, the only database with a generated era (Queen's Tower 1893). No worker runs.
  `VIDEO_GENERATION=off`.
- **What passed on a real iPhone:** the real 360° view of 1893 (horizon, seam, centring, motion, after the damping
  fix), narration with captions, the guide-video preview, Sources with picture credits, the cache on reopening,
  narration served from our own store, the real chat with streamed replies, voice replies, the round 1 fixes, and
  the clips-and-microphone page.
- **What failed or needs work** (section 2): ambience too loud in the chat and during recording; the Then/Now
  slider compares two pictures taken from different viewpoints.
- **Not done anywhere yet:** a real guide video (video tier never run), any era other than Queen's Tower 1893,
  the demo database `chronodex` holding generated media, Android, a real capture with mocks off.

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

## 3. Tasks per agent

### 3.1 Agent 1 (Core)

| # | Task | Waits on | Done when |
|---|---|---|---|
| A1-r2-1 | Commit and push what is waiting (retry cap and briefs are on main as 76d1f14; check nothing else is left uncommitted) | nothing | `git status` clean on your branch |
| A1-r2-2 | Read the board from 02:05 to now and answer the open asks: Agent 4's tunnel post (02:30), Agent 5's reference photo (02:10), Agent 3's Emmanuel College (seed) | nothing | REPLY posts |
| A1-r2-3 | `npm run seed` into **`chronodex`** so it has all 12 landmarks and `referencePhotoUrl` `/reference/queens-tower.jpg`; confirm the copied JPEG is in `public/reference/` on Agent 4's machine (the server's checkout) | nothing | `GET /api/landmarks` on `chronodex` shows the JPEG path |
| A1-r2-4 | Run the M2 gate checks (capture, Dex, chat, generate) against the tunnel URL with the human, log M1 and M2 on the milestone board in `DEV_NOTEBOOK.md` | the tunnel URL on the board | milestone board updated |
| A1-r2-5 | Pick the demo eras with the human (Queen's Tower 1893 plus at most three more that Agent 5 has data for), write or refresh their briefs on the Archivist notes, and get a human to read them (H7) before Agent 2 spends | Agent 5 data, a human | a list on the board, briefs read |
| A1-r2-6 | Switch-over day plan: when `chronodex` has the demo eras, tell Agent 4 to point the server at it | A2-r2-3 | board post |

### 3.2 Agent 2 (Studio)

| # | Task | Waits on | Done when |
|---|---|---|---|
| A2-r2-1 | Commit and push the uncommitted queue on `agent-2` if any is left (your notebook says it was waiting for one final commit) | nothing | `main` has it |
| A2-r2-2 | **A2-h:** in `runEraJob`, `persistFromUrl` each stage's output before `patchEra`, and pass every model input through `toFalUrl` (covers A2-a: `/reference/<id>.jpg` is uploaded once, an `.svg` is refused). API in `src/lib/media/README.md` | nothing | a test run of the core tier writes `/api/media/...` URLs |
| A2-r2-3 | **Fix Then/Now (6.5):** generate the demo eras' core tier into `chronodex` from the real reference photo, Queen's Tower 1893 first. The scene must be an edit of `/reference/queens-tower.jpg` with the same framing. Use `scripts/pregenerate.ts`; core only, about $0.62 an era. Run the worker on Agent 4's machine (everything runs there) | A2-r2-2, A1-r2-3, A1-r2-5 for eras after the first | Then/Now lines up on a phone |
| A2-r2-4 | Ask the human for the H-A picks (voices, talk model) with `review.html` open, then finalise `VOICE_CATALOG` and remove the `placeholder-*` keys | the human | catalogue final |
| A2-r2-5 | **The real guide video** for Queen's Tower 1893 in `chronodex`: `VIDEO_GENERATION=on` for that job only, about $4.25 and about 15 min of Kling time. Start it early, it runs in the background. The Time Machine plays the clips as soon as `guideVideo` is set | A2-r2-3, A2-r2-4, the human's yes on credits | three clips play on a phone |
| A2-r2-6 | `scripts/backup-media.ts` after each batch (the media store already keeps a copy; this is the second copy on disk) | A2-r2-3 | backup folder holds every era |

### 3.3 Agent 3 (Explorer)

| # | Task | Waits on | Done when |
|---|---|---|---|
| A3-r2-1 | Commit and push what is waiting (MOCK DATA tag, upload wording; leave `.gitignore` to Agent 1) | nothing | pushed |
| A3-r2-2 | Real capture with mocks off through the tunnel: capture, badge, Time Machine; MAP-10 and MAP-11 | the tunnel URL | logged on the board |
| A3-r2-3 | Android pass of Map, Capture and Dex (`spikes/agent-3/PHONE_TEST.md`) with a human | an Android phone | results logged |
| A3-r2-4 | Make sure every landmark that will be in the demo has its sprite and badge; hide or grey out landmarks that will have no generated era by the demo, so judges do not tap into an empty Time Machine (agree the list with Agent 1, A1-r2-5) | A1-r2-5 | Dex matches the demo list |
| A3-r2-5 | Polish only from here, nothing new after 10:00 | | |

### 3.4 Agent 4 (Time Machine)

| # | Task | Waits on | Done when |
|---|---|---|---|
| A4-r2-1 | **Ambience (6.4, 5.4):** play Agent 2's real loops (`<bucket>.m4a` music plus `<bucket>-street.mp3`, two layers with a short crossfade; today the player asks for `<bucket>.mp3` and falls back to noise). Lower the chat level well below the Time Machine's, and silence it completely while the mic records and while a reply is spoken | nothing | retest 5.4 and 6.4 pass |
| A4-r2-2 | Keep the phone server and tunnel running; post the new URL whenever the tunnel restarts; switch the server to `chronodex` when A1-r2-6 says so; then run `scripts/persist-media.ts` there without `--copy-only` if any fal URLs remain | A1-r2-6 | demo served from `chronodex` |
| A4-r2-3 | **Then/Now check (6.5):** once A2-r2-3 has made the new scene, check the overlay on a phone; if the framing drifts a little, add a per-era offset or crop, and hide the Then/Now button for an era whose scene is not an edit of the current reference photo | A2-r2-3 | 6.5 passes |
| A4-r2-4 | Map zoom-fade polish handed over by Agent 3 (05:30 post): water and park shapes swapping detail at zoom changes, late tiles appearing at once | nothing | smooth on a phone |
| A4-r2-5 | Real guide video on a phone when A2-r2-5 lands: clips in order, captions on the talk clip, no gap | A2-r2-5 | 6.4 with the real video |
| A4-r2-6 | Voice input on the real chat on a second phone (the human's failed once, probably the phone) | a phone | passes on two phones |
| A4-r2-7 | Android pass of the Time Machine and chat (A4-10) | an Android phone | logged |

### 3.5 The humans (short, everything above waits on these)

| # | Task | Unblocks |
|---|---|---|
| HU-1 | Agent 2's human: pick voices and the talk model in `spikes/agent-2/out/review.html` (H-A) | A2-r2-4, A2-r2-5 |
| HU-2 | Say how many fal credits are left, and yes or no to about $4.25 for one real guide video | A2-r2-5 |
| HU-3 | Read the demo eras' briefs (H7) | A2-r2-3 beyond the first era |
| HU-4 | An Android phone for A3-r2-3 and A4-r2-7 | Android |
| HU-5 | Confirm the deadline and judging criteria | the whole schedule |

## 4. Gantt (real clock, Sunday 15 Nov)

Each column is one hour from the time shown. `█` work, `▒` waiting or checking on a phone, `◆` milestone.

```
                                            03 04 05 06 07 08 09 10 11 12
 CRITICAL PATH: one real demo era with everything
  A2-r2-1 / A1-r2-1 / A3-r2-1 commit queues  █
  A2-r2-2 persist + toFalUrl in pipeline     █  █
  A1-r2-3 seed chronodex (12 landmarks)      █
  A2-r2-3 Queen's Tower 1893 core in chronodex  █  █
  A4-r2-3 Then/Now check on a phone              ▒  █
  A4-r2-2 server switched to chronodex              █
  M1/M2 gates on the tunnel (A1-r2-4)               ▒  ◆
  HU-1/HU-2 voices, talk model, credits      ▒  ▒
  A2-r2-5 real guide video (background)            █  █  █
  A4-r2-5 guide video on a phone                            ▒  ◆ M3

 PARALLEL
  A4-r2-1 ambience layers and levels         █  █
  A4-r2-4 map fade polish                          █  █
  A1-r2-5 demo era list + briefs + read         █  █  ▒
  A2-r2-3 more demo eras, one an hour                █  █  █  █
  A3-r2-2 real capture, A3-r2-3 Android            ▒  ▒  ▒
  A3-r2-4 demo list on map and Dex                       █
  A4-r2-6/7 voice on 2nd phone, Android               ▒  ▒  ▒
  A2-r2-6 backup-media after each batch                  █     █  ◆

 FINISH
  FEATURE FREEZE                                                  ◆
  backup video, three run-throughs, fixes only                      █  █
  SUBMISSION                                                           ◆
```

**Order of completion:** (1) by 04:00 every pending commit is pushed and `chronodex` is seeded; (2) by 05:00
the pipeline persists its outputs and Queen's Tower 1893 is regenerated in `chronodex` from the real reference
photo, so Then/Now lines up; (3) by 06:00 the server serves `chronodex` and the M2 gate passes on a phone;
(4) by 08:00 the real guide video plays (M3), if the credits allow it; (5) until 10:00 one more demo era an hour,
backed up as they land; (6) 10:00 freeze, then rehearse and submit.

**Risks.** Credits and the voice and talk-model picks (HU-1, HU-2) decide whether a real guide video exists at
all; the preview stands in if not. One machine runs everything: if it sleeps, the demo is down, so keep it awake
and plugged in. The quick tunnel URL changes on every restart: always post the new one.
