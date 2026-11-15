# Chronodex: tasks for the humans, one list per agent owner

Written Sun 15 Nov 2026 at 02:05 from `REMAINING_WORK.md` (sections 2 and 3.1) and
`notebook/agent-4-panorama-plan.md`. Each human owns the tasks closest to their agent's work. Tick a box when it
is done and tell your agent; your agent posts the result to `@team` on `BOARD.md`. Times assume a 10:00 freeze
and 12:00 submission (unconfirmed: see 1.3).

Never paste a key, token or connection string into git, the board or a notebook. Share them privately.

## Everyone

- [ ] **Node 24** on the machine you run checks on (`nvm use 24`, then `npm run check`). Node 26.13.1 fails every test file under the default pool (T1).
- [ ] Approve or reject your agent's commits and pushes as they come (H9 in `MASTER.md`).
- [ ] **10:00 to 12:00:** three clean run-throughs of the demo route, one recorded as the backup video (M5).

## 1. Agent 1's human (Core: data, API, Historian, chat, gates)

| Done | # | Task | Unblocks | How | By |
|---|---|---|---|---|---|
| [ ] | 1.1 | Put the keys on the machine that serves the app: `FAL_KEY` (Agent 1's `.env.local` has none), `MONGODB_URI`, `MONGODB_DB=chronodex`, `DEEPSEEK_API_KEY`; `NEXT_PUBLIC_USE_MOCKS` empty; `VIDEO_GENERATION=off` until 2.1 is answered (H1) | Every real test, the gates | Share privately with Agent 4's human (they run the tunnel) and Agent 2's human (they run the worker) | 02:30 |
| [ ] | 1.2 | Read the 10 era briefs in `briefs/*.md` for accuracy, or say yes to Agent 5's fact-check replacing your read (H7, T3). Known problems: queens-tower_1962 contradicts itself about the east wing; huxley-building_1885 and _1961 describe the Queen's Gate site, not today's building | Pre-generation spends credits only on checked text | Note each wrong fact on the board to Agent 1 | 05:00 |
| [ ] | 1.3 | Ask the organisers: real submission deadline, judging criteria, what the fal prize is judged on (H5/Q1, H8) | Everyone's schedule | Post the answer to `@all` on the board | 03:00 |
| [ ] | 1.4 | Walk the M2 and M3 gates on a phone with Agent 1 once the stable URL exists (A1-15) | Milestone record | Agent 1 gives you the checklist | 08:00, 10:00 |
| [ ] | 1.5 | Edit `MASTER.md` section 7 and 8.2 (chat and Historian run on DeepSeek, not Claude) and add Agent 5 to sections 3 and 11 (H10). Agents may not | Correct docs | Text is in `DEV_NOTEBOOK.md` D-026 and `AGENT5.md` | Any time |
| [ ] | 1.6 | After the weekend: rotate the Atlas password (it was pasted into chat) | Security | Atlas, Database Access | Monday |

## 2. Agent 2's human (Studio: everything made with fal, the worker)

| Done | # | Task | Unblocks | How | By |
|---|---|---|---|---|---|
| [ ] | 2.1 | Say **how many fal credits** we have (H2). About $0.50 per era for the core tier, $4.25 more for its guide video | Which eras get video; `VIDEO_GENERATION` | fal dashboard, billing | 02:30 |
| [ ] | 2.2 | **Pick 4 to 6 voices and one talk model** (H3, T4) | `VOICE_CATALOG`, the 45 s clip | Open `spikes/agent-2/out/review.html`: 16 voice clips, Kling against Fabric | 03:00 |
| [ ] | 2.3 | **Colour or monochrome** for eras before about 1900 (H4) | Every pre-1900 scene and panorama prompt | Compare `spikes/agent-2/out/realism/pano-colour-feather.jpg` with `pano-mono-ref.jpg` | 03:00 |
| [ ] | 2.4 | A panorama still flat after its retry: keep it, or fail the stage so it is retried? (H-M in Agent 2's notebook) | Pipeline rule | One word on the board | 03:00 |
| [ ] | 2.5 | **Run the worker** (`npm run worker`) on your machine with the keys from 1.1 and keep it up through the demo (Q5) | All live generation | Same `MONGODB_DB` as the served app | 03:00 onwards |
| [ ] | 2.6 | Listen to the 8 ambience loops in `public/audio/ambience/` and name any that sound wrong for their period (T5) | Ambience under the Time Machine and chat | Headphones; listen for clicks at the loop point | 06:00 |
| [ ] | 2.7 | Laptop mic test: `node spikes/agent-2/voice-test.mjs`, record in Chrome (T2) | Confidence in speech to text | Needs `FAL_KEY` | 06:00 |
| [ ] | 2.8 | Look at experiment E1 (one picture instead of two) next to the current result and say whether you can tell them apart (panorama plan, A2-j) | About 45 % less image spend | Agent 2 posts both on the board | When posted |
| [ ] | 2.9 | Optional: ask fal support to enable `fal-ai/ffmpeg-api` on our key (H11; merge-videos and extract-frame return 403) | Single-file guide video | fal support chat | Optional |

## 3. Agent 3's human (Explorer: map, capture, Dex)

| Done | # | Task | Unblocks | How | By |
|---|---|---|---|---|---|
| [ ] | 3.1 | **Reference photos** of the landmarks (H6, MASTER H1), or confirm Agent 5's stand-ins are acceptable. Landscape, location on so GPS is recorded, from the pavement where a player stands, whole subject in frame, three shots each. Queen's Tower first | Agent 1's seed, the first real scene and panorama | Hand the files to Agent 1 (not in git) | Queen's Tower by 04:00, first light for the rest |
| [ ] | 3.2 | Decide whether **Singapore and Oslo** are in the demo (H7). If yes Agent 5 must research them; if no they leave the Dex | Agent 5's workload, Agent 1's seed | One line on the board | 03:00 |
| [ ] | 3.3 | **Android pass**: `phone_test.md` Part 3 (MAP, CAPTURE, DEX) in Android Chrome (T11) | Android support | Tunnel URL from 4.1 | 07:00 |
| [ ] | 3.4 | Globe zoom, city chips and spoof per city on an iPhone (T10) | Agent 3's new map work | Tunnel URL | 07:00 |
| [ ] | 3.5 | **Real capture** at the Huxley Building with mocks off: first capture gives the badge, second says already collected, one from too far says distance and direction (T14) | M2 gate | Stand at the door with the phone | 08:00 |
| [ ] | 3.6 | Lend your Android phone to Agent 4's human for 4.3 and 4.5 if they have none | Android checks | | When asked |

## 4. Agent 4's human (Time Machine: 360° view, guide video, chat)

| Done | # | Task | Unblocks | How | By |
|---|---|---|---|---|---|
| [ ] | 4.1 | **Run a stable URL with mocks off** and post it on the board (H5). The quick Cloudflare tunnel cannot stream the chat, so use a named Cloudflare tunnel or Vercel, with the env from 1.1 | Every phone test, Agent 1's gates | README "Deploying to Vercel" lists the variables | 04:00 |
| [ ] | 4.2 | iPhone retest, `spikes/agent-4/PHONE_TEST.md` Test 5 rows 5.1 to 5.9 (gyro, zoom, recording sizes, earcons, reset, silhouette, ambience, duck, mute) (T7) | Agent 4's round 1 fixes | Mocks on is fine | 06:00 |
| [ ] | 4.3 | **First real panorama on an iPhone and an Android phone**: level horizon, no seam in front, landmark in the centre (T12, M1 gate) | M1 | Agent 4 posts the era when it is ready | 06:00 |
| [ ] | 4.4 | **Time Machine on a real era**: progress sheet ticks, panorama appears, narration plays, guide video when it exists. Open it a second time: it should load at once and generate nothing (panorama plan section 5) (T15) | M2 and M3 gates, the "made once, kept" check | Real era from Agent 2 | 08:00 |
| [ ] | 4.5 | Real voice on a phone with mocks off: hold to talk, your words appear, a streamed reply, the reply spoken in the guide's voice from the loudspeaker (T8, rows 5.10 and 5.11). Also Android clips and mic (T13) | Voice chat | Stable URL from 4.1 | 08:00 |
| [ ] | 4.6 | Then/Now slider and Sources drawer on a phone (T9, rows 4.7 and 4.8) | Polish | | 08:00 |
