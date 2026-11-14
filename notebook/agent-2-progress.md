# Agent 2 (Studio): progress summary

Written Sat 14 Nov 2026, about 17:50. A plain-language summary for the team. The full technical log is in [agent-2.md](agent-2.md).

Agent 2 owns everything generated with fal: the 1880s street scene, the 360° view, the guide's portrait, voice, video, and the worker that will run it all.

## 1. What Agent 2 has done so far

| Time | What happened | Problem solved or found |
|---|---|---|
| 15:45 | Read the plan and started the first test of fal | Found that the laptop had no Node.js and no fal key. Wrote the test code while waiting |
| 16:05 | Node.js installed (with permission) and the fal key added | Unblocked |
| 16:15 | **First fal call worked.** A modern photo of Exhibition Road became the same street around 1900 in about 20 seconds | Proved the key, the library and the result format. Committed on branch `agent-2` |
| 16:35 | **Picked the image model for the "then" scene.** Compared two models on the same photo by laying each result over the original | The "Pro" model keeps the camera position almost exactly, which the then/now slider needs. Also found that photos which are not 16:9 get cropped, so reference photos must be 16:9 first |
| 16:35 | **Made the first guide portrait** (a fictional 1880 flower seller) | Good enough to be the chat profile picture and to keep her face consistent in the video |
| 16:55 | **Worked out how to make the 360° view.** Tried four methods | The model the plan relied on (Hunyuan World) is listed by fal but no longer works. Found another method: put the scene in the middle of a blank canvas and have the model paint the rest of the sphere. Committed on branch `agent-2` |
| 17:10 | **Voice test:** the same guide script in 16 voices from two providers, each one checked automatically by speech-to-text | Every voice reads cleanly. Found that the planned script length gives about 40 seconds, not 45, so scripts need about 130 words |
| 17:25 | **Guide standing in the scene** | First try put her too far away for lip sync. Rewrote the instructions, and the second try is a clear close-up |
| 17:35 | **Talking-guide test:** 10 seconds on two lip-sync models | One model takes almost 4 minutes per 10 seconds, so a full 45-second clip takes about 15 minutes. It cannot be made live during the demo |
| 17:40 | **Walk-on test:** 5 seconds of the guide walking into the street | Found that fal blocks the frame-grabbing tool on our key, and that clips come out at slightly different sizes. Both have workarounds |

**Spent on fal so far: about $4.20** at list prices.

**Branch:** everything is on the local branch `agent-2`, in two commits. Nothing was committed to `main` or pushed. The A2-04 to A2-06 work is written but not yet committed, waiting for approval.

**Waiting on a person:** voices, lip sync and walking motion have to be judged by ear and eye. Agent 2 cannot play audio or video. They are all on one page: `spikes/agent-2/out/review.html`.

## 2. Progress across the repo

### Where each agent is

| Agent | Done | Now |
|---|---|---|
| 1 Core | The app skeleton (M0) is on `main`, plus the database layer, API routes and job queue (not yet tested against a real database) | Needs the MongoDB and Anthropic keys to seed the database and start the history writer and the chat |
| 2 Studio | All six fal experiments (A2-01 to A2-06) generated. Scene, portrait, panorama and speech-to-text models chosen | Needs the team's voice and lip-sync picks, then the full 45-second clip |
| 3 Explorer | Art style, pixel sprites and badges, and a map test | Starting the app shell and the map screen |
| 4 Time Machine | 360° viewer test | Needs a real-phone check. Can now start its screens on top of the skeleton |

### Milestones

| | Milestone | Target | Status |
|---|---|---|---|
| M0 | Foundation | Sat 16:15 | Built and on `main`. A person still needs to walk through it |
| M1 | Risky parts proven | Sat 17:45 | Mostly there. Every fal stage has run once. Still open: picking a voice and a lip-sync model, the 45-second clip, and the 360° view on real phones |
| M2 | Vertical slice | Sat 20:00 | Not started |
| M3 | Full loop | Sat 23:00 | Not started |
| M4 | Content complete | Sun 02:00 | Not started |
| M5 | Demo ready | Sun 10:00 | Not started |

### Agent 2's next steps

1. **The team picks the voices and the lip-sync model** (on the review page). Then Agent 2 writes the voice list and makes one full 45-second talking clip.
2. **Bring Agent 1's skeleton into the `agent-2` branch.** The rest of Agent 2's work lives inside the app (`src/lib/fal`, `src/lib/pipeline`, `src/worker`), which only exists on `main`. This needs a decision from the team on how to bring it in, since the instruction for now is no rebase.
3. **A2-07 to A2-11:** the real fal library, one function per stage, the pipeline that runs a whole era, the background worker, and the upload and voice routes.
4. **A2-12 to A2-14:** an automatic check of each image by Claude, the overnight pre-generation script, a backup of all media, and joining the three video clips into one.

### Needs from the team

- **Listen and watch** the review page, and choose the voices and the lip-sync model.
- **fal credits:** how much is there? The full plan (video for every era) is about $77 at list prices, plus retries.
- **The fal frame-grab tool is blocked (403) on our key.** It is optional, but useful if access can be enabled.
- **Keys for Agent 1:** MongoDB and Anthropic. Agent 2's pipeline cannot run end to end without them.
- **Landmark photos (H1)** in 16:9. The scene model crops anything else.
- **Phone checks:** the 360° view (Agent 4's viewer with Agent 2's panorama) and the map, on an iPhone and an Android phone.
- **Branch decision:** how Agent 2 should bring in the skeleton from `main` (step 2 above).
