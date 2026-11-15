# Chronodex: what is left (tests, actions, features, order)

Written Sun 15 Nov 2026 at 01:25 by Agent 4 from `origin/main` (ee0d029), the notebooks and the board.
Times assume the assumed deadline: **submission Sunday 12:00, feature freeze 10:00** (`MASTER.md` Q1, still
unconfirmed: ask the organisers, H5). Move every time if the real deadline differs.

## 1. Where we are in one paragraph

Map, capture, Dex and the 360° viewer pass on an iPhone (round 1). Atlas stores data. The pipeline, worker, voice
routes, realism rework and image critic are built (Agent 2). The Historian runs on DeepSeek and a real Queen's Tower
1893 brief and guide exist (Agent 1). The Time Machine and chat have the round 1 fixes (Agent 4). The map now has
eleven landmarks including Singapore and Oslo and a globe zoom (Agent 3). Agent 5's first Queen's Tower data is on
main (`thin_record`). **Nothing real has run end to end on a phone:** no real panorama, narration, guide video, or
real chat/voice has been seen on a device, and no era has been generated for real.

## 2. Tests still to run

Test ids come from `phone_test.md` and `spikes/agent-4/PHONE_TEST.md`. "Needs" is what must exist first.

### 2.1 No phone needed

| # | Test | Who | Needs | Pass if |
|---|---|---|---|---|
| T1 | Test runner on Node 24 (`nvm use 24`, `npm run check`) | Human | Node 24 install | All tests pass with the default pool (Node 26.13.1 fails every file) |
| T2 | Laptop mic test: `node spikes/agent-2/voice-test.mjs`, record in Chrome | Human | `FAL_KEY` | Speech to text returns your words (WebM already proven once) |
| T3 | Read the 10 era briefs in `briefs/*.md` for accuracy (H7) | Human | none | Each fact checks out; known problems: queens-tower_1962 summary contradicts itself about the east wing; huxley-building_1961 and _1885 are about the Queen's Gate site, not today's building |
| T4 | Listen to the 16 voice clips and Kling vs Fabric clips in `spikes/agent-2/out/review.html` | Human | none | You name 4 to 6 voices and one talk model |
| T5 | Listen to the ambience loops in `public/audio/ambience/` | Human | none | Each loops without a click and fits its period |
| T6 | `npx tsx scripts/data/validate.ts --online` | Agent 5 | none | Exit 0 (open the 403 pages in a browser by hand) |

### 2.2 Real phone, iPhone (round 1 retest) and Android (never run)

| # | Test | Needs | Pass if |
|---|---|---|---|
| T7 | `PHONE_TEST.md` Test 5 rows 5.1 to 5.9: gyro tighter, zoom, recording sizes, mic earcons, reset with dots, silhouette avatar, ambience, duck, mute | Tunnel URL (mocks on is fine) | Each row's pass mark |
| T8 | Row 5.10 and 5.11: hold to talk with mocks off, real reply, spoken reply loud from the speaker after using the mic | Tunnel with mocks off, keys, a real era with a guide | Your words appear, streamed reply, voice in the guide's voice, no earpiece switch |
| T9 | Rows 4.7 and 4.8: Then/Now slider and Sources drawer | Tunnel | Slider follows the finger; drawer opens, links open |
| T10 | Map: globe zoom, city chips, spoof panel per city (Agent 3's new work) | Tunnel | Pinch to globe and back; markers readable |
| T11 | `phone_test.md` Part 3 on **Android Chrome** (MAP, CAPTURE, DEX) | Tunnel | Same pass marks as iPhone |
| T12 | Part 4 and `?src=<panorama>&vfov=180`: **a real panorama** in the 360° viewer on iPhone and Android (H-D, M1 gate) | One real panorama | Level horizon, no seam in front, landmark centred |
| T13 | Part 5 clips and mic on Android; Safari MP4/AAC recording through STT (H-B, H-C) | Tunnel | Clips play with no gap; Android recording transcribes |
| T14 | Part 8 real server: capture at the Huxley Building for real (SRV checks), second capture of the same landmark, a too-far capture | Tunnel with mocks off | Badge awarded once; too-far says distance and direction |
| T15 | Time Machine with a real generated era: progress sheet ticks, panorama appears, narration plays, guide video plays | Real era (see 3.5) | M2 and M3 gates |

### 2.3 Gates (M-gates, `MASTER.md` section 9)

| Gate | Pass condition | State |
|---|---|---|
| M1 Risky parts proven | Every fal step once on a real photo; panorama on two phones | Not passed (panorama unseen on a phone, no 45 s clip) |
| M2 Vertical slice | One landmark, one year, real data, on a phone: capture, badge, 360°, narration, chat | Partly: real capture, Dex, chat and brief; missing panorama, narration, deploy |
| M3 Full loop | Worker runs a whole era; guide video; voice both ways; Dex complete; ungenerated year works | Not started |
| M4 Content complete | Every demo era pre-generated, briefs read, media backed up | Not started |
| M5 Demo ready | Three clean run-throughs, backup video, freeze | Not started |

## 3. Action list: what the AI needs to move forward

Grouped by who has to act. "Blocks" says who is waiting.

### 3.1 The human (the critical path: everything below waits on these)

| # | Action | Blocks |
|---|---|---|
| H1 | Give the team the **keys on the machine that serves the app**: `FAL_KEY` (Agent 1's `.env.local` has none), `MONGODB_URI`, `DEEPSEEK_API_KEY`; set `NEXT_PUBLIC_USE_MOCKS` empty and `VIDEO_GENERATION=off` until credits are known. Never in git | Agent 1 gates, T8, T14, T15 |
| H2 | Say **how many fal credits** exist (about $0.50 per era core, $4.25 per era with video) | Agent 2: which eras get video |
| H3 | Pick **voices and the talk model** (T4) | Agent 2: `VOICE_CATALOG`, the 45 s clip |
| H4 | Decide **colour or monochrome** for eras before about 1900 | Agent 2 scene and panorama prompts |
| H5 | Run a **stable tunnel or deploy** with mocks off and post the URL (the Cloudflare quick tunnel is mocks-only and cannot stream the chat, so the real chat needs another host: Vercel, or a named Cloudflare tunnel) | Agent 1 gates, all phone tests |
| H6 | Hand over the **H1 photos** (six landmarks, with GPS) or confirm stand-ins are acceptable | Agent 1 seed, Agent 2 scene base image, Agent 5 A5-12 |
| H7 | Decide which **new cities** (Singapore, Oslo) are in the demo; if yes, Agent 5 must research them, if no, drop them from the Dex | Agent 5 workload, Agent 1 seed |
| H8 | **Answer the open questions**: real deadline and judging criteria (H5/Q1), whose laptop runs the worker (Q5) | Everyone's schedule |
| H9 | Install **Node 24**; move the repo out of iCloud; rotate the Atlas password after the weekend | T1, git health, security |
| H10 | Edit `MASTER.md` section 7 (chat is DeepSeek, not Claude) and add Agent 5 to sections 3 and 11 (agents may not) | Documentation only |
| H11 | Optionally ask fal support to enable `fal-ai/ffmpeg-api` (merge-videos, extract-frame all return 403 on our key) | Stitched single-file guide video (the player works without it) |

### 3.2 Agent 1 (Core)

| # | Action | Blocks |
|---|---|---|
| A1-a | Commit the pending Archivist-data change (seed reads `data/`, Historian reads `notes.txt`); run `npm run seed` now that `data/landmarks/queens-tower.json` exists | Reference photo path, Agent 5's data reaching the app |
| A1-b | Run the capture, Dex, chat and generate gates against the tunnel URL when H5 lands; log each in `DEV_NOTEBOOK.md` | M2 |
| A1-c | Decide with Agent 5 whether the Historian re-runs on `data/eras/queens-tower_1893.notes.txt` (Agent 1 already stored its own brief: Thomas Reeves, hansom cab driver) | Era text consistency |
| A1-d | Run `npm run seed` after Agent 3's eleven-landmark fixtures change; update docs that still say six | Dex with eleven |
| A1-e | Briefs for the five new landmarks' eras if H7 says yes | Content for Singapore/Oslo |

### 3.3 Agent 2 (Studio)

| # | Action | Blocks |
|---|---|---|
| A2-a | Make the scene stage accept a relative `referencePhotoUrl` (`/reference/<id>.jpg`): read `public/`, `uploadToFal`, cache per landmark, reject `.svg` clearly. **Today the mock SVG would be sent to fal** | Any real scene or panorama |
| A2-b | Try Agent 5's two `same_view` images for Queen's Tower 1893 in a forward-view trial; report whether the panorama looks real | M1, realism |
| A2-c | Remove the two `placeholder-*` voice keys from `src/lib/fal/voices.ts`; finalise `VOICE_CATALOG` after H3 | Agent 1 fixtures |
| A2-d | Make the **45 s talk clip** once H3 is answered (about 15 minutes of Kling time for 45 s); split into two requests if a model refuses 45 s | M1 gate |
| A2-e | Real end-to-end check of hold to talk, STT and TTS on the tunnel (T8); report screen-side bugs to Agent 4 | A4-08 |
| A2-f | Run `scripts/pregenerate.ts` for the demo eras once reference photos and Agent 5's references exist; then `scripts/backup-media.ts` | M4 |
| A2-g | Commit the large uncommitted queue if not yet pushed (the board shows PR #3 merged; confirm nothing is left on `agent-2`) | Team can run it |

### 3.4 Agent 3 (Explorer)

| # | Action | Blocks |
|---|---|---|
| A3-a | Android pass (needs a human with the phone and the tunnel) | T11 |
| A3-b | MAP-10, MAP-11 and one real capture with mocks off | M2 |
| A3-c | Optional fal art (`npm run art:fal -- --yes`, needs `FAL_KEY`) | Polish only |
| A3-d | Make sure sprites and badges exist for any new city before demo day | Dex completeness |

### 3.5 Agent 4 (Time Machine, this agent)

| # | Action | Blocks |
|---|---|---|
| A4-a | Fix anything T7 to T9 and T15 turn up (phone pass, A4-10) | Demo polish |
| A4-b | Show licence and author for period images in the Sources drawer, from `data/ATTRIBUTION.md` (Agent 5's ask; CC BY and CC BY-SA require it) | Licence compliance |
| A4-c | If T8 shows the earpiece switch, release the mic after each recording | Voice quality |
| A4-d | Stretch only after M4: compass-aligned panorama (A4-S2), camera overlay (A4-S1) | Nothing |

### 3.6 Agent 5 (Archivist, Astra)

| # | Action | Blocks |
|---|---|---|
| A5-a | Take `queens-tower_1893` to `validated`: a verified plan or photo of the southern side, dome colour (new copper vs patina), brick and roof colour, road surface, lamp fuel, prices | Realism of the hero era |
| A5-b | A licensed present-day 16:9 reference photo for Queen's Tower, then the other landmarks (A5-07), or H1 photos (H6) | Agent 1 seed, Agent 2 scene |
| A5-c | Queen's Tower second year: 1962 or 1965 to 1966, with two dated images, daily life, three roles, a scene (the c.1960 photo is only 427x640) | Second era |
| A5-d | Huxley, Royal Albert Hall (needs a second year), Exhibition Road (2011 or 2012), V&A (1940 or 1941; second year), Natural History Museum (1862, 1881): one landmark at a time, post to Agent 2 as each first era lands | Eight more eras |
| A5-e | Post the A5-08 asks (Agent 1 notes route, Agent 4 attribution) | A1-c, A4-b |
| A5-f | `checks.test.ts` unit tests by hand (no subagents); audit each validated era manually; final report | A5-10, A5-11 |

## 4. Remaining feature list

Status: **Built** (works in mock mode, needs phone or real data), **Open** (to do), **Stretch** (after M4 only).

| # | Feature | Owner | Status |
|---|---|---|---|
| F1 | Real era generation end to end (brief, scene, panorama, headshot, narration) for Queen's Tower 1893 | 2, 1 | Open (blocked by A2-a, H1, H5) |
| F2 | Real panorama that looks like the year (realism rework, image critic) | 2, 5 | Built, never seen on a phone |
| F3 | 45 s guide talk clip and the three-clip guide video | 2 | Open (H3) |
| F4 | Stitched single-file guide video | 2 | Built, needs H11; the player works without it |
| F5 | Voice chat in both directions on a phone | 4, 2 | Built; real path unseen (T8) |
| F6 | Period ambience loops | 2, 4 | Built; listen (T5) |
| F7 | Capture, badge, Dex, map with eleven landmarks, globe zoom | 3 | Built; Android and real capture unseen |
| F8 | Sources drawer with licences and authors from `ATTRIBUTION.md` | 4 | Open (A4-b) |
| F9 | All demo eras pre-generated and backed up | 2 | Open (needs F1, Agent 5 data) |
| F10 | One live generation shown during the demo | 2, 4 | Built (progress sheet); needs a real run |
| F11 | Validated research data: 2 eras per landmark, 10 or more eras | 5 | Open (1 of about 12 started) |
| F12 | Stable public URL with mocks off | human, 1 | Open (H5) |
| F13 | Singapore and Oslo eras (research, briefs, generation) | 5, 1, 2 | Open, only if H7 says yes (decide: it may not fit the time) |
| F14 | Backup demo video, three run-throughs | human | Open (M5) |
| F15 | Compass-aligned panorama, camera overlay, walkable world, Street View strip | 4, 2 | Stretch |

**Suggested cut if time runs short** (in this order): F13, F15, F4, video for every era (keep one video per
landmark), second year for each landmark (keep one era per landmark plus the hero era).

## 5. Pseudo Gantt chart (in order of completion)

Each column is one hour starting at the time shown (Sunday 15 Nov). `█` = work, `▒` = waiting or checking,
`◆` = hard milestone. Rows are listed in the order they must finish; a row cannot finish before the rows it
depends on. **Freeze is 10:00.**

```
                                               01 02 03 04 05 06 07 08 09 10 11 12
 CRITICAL PATH
  H1  keys on the serving machine               █
  H2  fal credit count, H3 voices + talk model  █  █
  H4  colour or monochrome decision             █
  H5  stable URL, mocks off (named tunnel)         █  █
  A2-a relative referencePhotoUrl fix           █  █
  A5-a Queen's Tower 1893 to validated          █  █  █
  A5-b reference photo (stand-in or H1)               █  █
  A1-a seed with data/ and reference photo               █
  F1  real era: Queen's Tower 1893 core tier                █  █
  T12 panorama on two phones  (M1 gate)                        ▒  ◆
  A2-d 45 s talk clip + guide video (F3)                 █  █  █  █
  T15 Time Machine on a real era (M2 gate)                        ▒  ◆

 PARALLEL TRACKS
  A5-d second landmark data (Huxley, then RAH)             █  █  █  █  █
  A5-d remaining landmarks and years                                  █  █  █
  A4-b Sources drawer licences (F8)                     █  █
  A4-a phone fixes from T7-T9, T15                            ▒  █  █  █
  T7-T11 phone retest + Android                         ▒  ▒  ▒  ▒  ▒
  T8 real voice on a phone                                       ▒  ▒
  A3-a Android pass, A3-b real capture                          ▒  ▒
  T3 read era briefs (H7), T4/T5 listen        ▒  ▒  ▒

 CONTENT AND DEMO
  A1-b gate checks on the URL (M2, M3)                          █  █  ◆
  A2-f pregenerate demo eras (F9), cost log                           █  █  █  █
  A2-f backup-media (all assets local)                                         █  ◆
  A5-f audit + validate --online + final report                                   █  █
  FEATURE FREEZE                                                                  ◆
  F14 backup video, 3 run-throughs, polish                                           █  █
  SUBMISSION                                                                            ◆
```

### Order of completion (the same chart as a list)

1. **01:30 to 03:00, unblock:** H1 keys, H2 credits, H3 voices and talk model, H4 colour decision, A2-a relative-URL fix, A5-a Queen's Tower 1893.
2. **03:00 to 05:00, first real era:** H5 stable URL, A5-b reference photo, A1-a seed, then F1 (core tier for Queen's Tower 1893).
3. **05:00 to 06:00, M1 gate:** T12 the panorama on an iPhone and an Android phone; A2-d starts the 45 s clip in parallel.
4. **06:00 to 08:00, M2 gate:** T15 the whole Time Machine on a real era, T8 real voice, T7 to T11 retests; fix what breaks (A4-a).
5. **06:00 to 10:00, content in parallel:** Agent 5 lands one more landmark every hour or so; each lands, Agent 1 seeds, Agent 2 generates.
6. **08:00 to 10:00, M3 gate:** A1-b gate checks, guide video plays on a phone, Dex shows every landmark.
7. **10:00, freeze.** Nothing new after this.
8. **10:00 to 12:00, M4 and M5:** pre-generation finished and backed up, briefs read (T3), audit, backup video, three run-throughs, submit.

### Biggest risks to this schedule

- **Keys and credits (H1, H2):** until these land no real generation can run. Everything on the critical path waits on them.
- **Agent 5 throughput:** one era of validated data took about an hour of human-supervised work; at that rate three landmarks is realistic by 10:00, not eleven. Cut F13 first.
- **Guide video time:** about 15 minutes of Kling time per 45 s clip, plus walk clips: queue it early and run in the background.
- **No stable URL with mocks off (H5):** the quick tunnel cannot stream chat, so a named tunnel or Vercel is needed for T8 and T14.
- **Phone-only bugs:** each real phone test so far found something (recorder, replay, smoothing); leave time after T15 for fixes.
