# Agent 2 notebook: Studio

Only Agent 2 writes here. Rules: `MASTER.md` section 8.5. Task details: `MASTER.md` section 11.
Questions and requests to other agents go on `BOARD.md`, not here.

## Current state

Rewrite this block before you stop, so a fresh session can continue from it alone.

- Last updated: 2026-11-14 20:50
- Working on: A2-11 is complete: voice routes committed (ba010ee), uploads route written and tested live, not yet committed. A2-04 to A2-06 still wait on the human's voice and talk-model picks
- Next: A2-10 worker (`src/worker/index.ts`: claim loop calling runEraJob, clean shutdown, `npm run worker`). Then A2-12 Claude image checks (horizon, seam, leftover grey and modern objects), A2-13 pregenerate and backup scripts, A2-14 stitch. A human should run `node spikes/agent-2/voice-test.mjs` in Chrome to prove a real WebM recording
- Blocked on: the human's voice and talk-model picks (A2-04/A2-05) and the fal credit count. FAL_KEY is also in the root `.env.local` (copied 2026-11-14 20:58; mocks stay on, so set NEXT_PUBLIC_USE_MOCKS empty to hit real fal); Node v26.13.1 at `C:\Program Files\nodejs`.
- Board read up to: 2026-11-14 19:55 (@team review)
- Waiting for commit approval: A2-11 uploads route (src/app/api/uploads/*, this page, a board post)
- Review facts for A2-07+: 45 s needs ~130 words (measured ~2.9 words/s), not 105–120. `fal-ai/ffmpeg-api/extract-frame` returns 403 on this key. `merge-videos` uses the smallest input size, so scale every clip to 1280×720 first. Kling avatar standard ≈ 226 s per 10 s clip (~15 min for 45 s).

## Wanted from the human (compile into one list when asked)

The human said not to chase these now: note them here and give them the full list when they ask. Add to it as new ones appear; tick them off when answered.

| # | What | Why | How, in short |
|---|---|---|---|
| H-A | Pick 4 to 6 voices and one talk model | Unblocks `VOICE_CATALOG` (currently provisional) and the 45 s clip | Open `spikes/agent-2/out/review.html`: 16 voice clips, Kling vs Fabric 10 s clips, the walk-on clip |
| H-B | Real microphone test of speech to text in Chrome (and Safari on a Mac) | Only MP3 is proven; Chrome records WebM and Safari MP4, and the route renames them by their bytes | Run `npm run dev` and `node spikes/agent-2/voice-test.mjs`, open http://localhost:4000 in Chrome, record, report the output |
| H-C | The same on a real iPhone and Android phone | Phones need HTTPS, so this goes through the deployed app (A1-12) | Use the chat screen's hold to talk once deployed |
| H-D | Look at the panorama in Agent 4's 360 viewer on an iPhone and an Android phone | MASTER M1 gate; the panorama has never been seen on a phone | `?src=<url>&vfov=180`, URL in the A2-03 log entry |
| H-E | How many fal credits do we have? | Decides one video per landmark or all 18 eras (about $77 at list) | fal dashboard |
| H-F | Ask fal support to enable `fal-ai/ffmpeg-api/extract-frame` on our key (403 today) | Cleaner walk_off and for judging video as stills | Optional |
| H-G | Reference photos must be 16:9 (H1 photos) | The edit models centre-crop anything else | Agent 1's seed normalises; check the result by eye |
| H-H | Whose machine runs the worker, and an Anthropic key and MongoDB Atlas for a live end-to-end run | runEraJob has never run live end to end | MASTER Q5, H2 |
| H-I | Read the first real brief before the pipeline spends on video (H7) | Accuracy of the 45 s script | Later, at M4 |

## Chosen models

Fill in as each bake-off finishes. `src/lib/fal/models.ts` must match this table.

| Stage | Endpoint chosen | Fallback | Seconds | Cost | Decided in |
|---|---|---|---|---|---|
| scene | `fal-ai/nano-banana-pro/edit` (1K, 16:9, jpeg) | `google/nano-banana-2.1/edit` | 20.6 | $0.15 list | A2-02 |
| panorama | `fal-ai/nano-banana-pro/edit` outpainting a 2:1 canvas (route b2, 2K, aspect `auto`), then resize to exactly 2:1 | none proven; `fal-ai/hunyuan_world` is not served | 27.0 | $0.15 list | A2-03 |
| headshot | `google/nano-banana-2.1` (1K, 1:1, jpeg) | `fal-ai/nano-banana-pro` (not tested) | 18.1 | token-priced, see dashboard | A2-02 |
| narration | waiting for the human's ear: 8 Eleven v4 and 8 Gemini TTS clips made | | 11-14 | Eleven ~$0.05, Gemini ~$0.03 per 600 chars | A2-04 |
| guide_frame | `fal-ai/nano-banana-pro/edit` with [scene, headshot] | `google/nano-banana-2.1/edit` (untested) | ~20 | $0.15 list | A2-05 |
| talk | waiting for the human's eye: Kling avatar v2 standard vs Fabric 480p | | Kling 226 s / Fabric 53 s per 10 s clip | $0.056/s / $0.08/s | A2-05 |
| walk_on, walk_off | `kling/v4/image-to-video` 5 s 720p (made, waiting for the human's eye) | `blackforestlabs/flux-3/first-last-frame-to-video` | 163 | ~$0.79 | A2-06 |
| chat speech | `elevenlabs/tts/eleven-v4-turbo` | `elevenlabs/tts/eleven-v4` | 2.9 for 48 characters (v4: 3.9) | $0.04 per 1,000 characters | A2-07 |
| speech to text | `fal-ai/elevenlabs/speech-to-text/scribe-v2` (MP3 and 24 kHz WAV proven; rejects .webm and .mp4 file names, so the route renames uploads) | | 2-4 | $0.008/min | A2-04, A2-11 |
| stitch | | | | | A2-14 |

## Tasks

- [x] A2-01 Hello fal
- [x] A2-02 Scene spike, compare the two image models
- [x] A2-03 Panorama bake-off, pick a route (route b2; phone viewer check still due with Agent 4 at M1)
- [ ] A2-04 Voice bake-off, write `VOICE_CATALOG`
- [ ] A2-05 Talking-guide bake-off, one full 45 s clip
- [ ] A2-06 Walk-on spike
- [x] A2-07 fal library: `runFal`, models, voices, upload, speech, transcribe
- [x] A2-08 Stage functions and prompt builders (stitch comes with A2-14, image checks with A2-12)
- [x] A2-09 `runEraJob` orchestrator (never run live end to end: needs ANTHROPIC_API_KEY, a root FAL_KEY and, to share jobs with the dev server, MONGODB_URI)
- [ ] A2-10 Worker
- [x] A2-11 Routes: uploads, voice tts, voice stt (a real Chrome WebM and iOS MP4 recording through stt is still unproven)
- [ ] A2-12 Image checks with one corrective retry
- [ ] A2-13 Pregenerate and backup-media scripts
- [ ] A2-14 Stitch stage
- [ ] A2-S1 Stretch: walkable world (after M4 only)

## Log

Newest at the bottom. One entry per task or per session, in this shape:

    ### YYYY-MM-DD HH:MM, <task id>: <title>
    - Did:
    - Decided, and why:
    - Measured or verified:
    - Delegated to Haiku, and whether it was kept:
    - Problems:
    - Next:

### 2026-11-14 15:45, A2-01: Hello fal (in progress)
- Did: read MASTER.md, DEV_NOTEBOOK.md, BOARD.md, delegation sheet. Wrote `spikes/agent-2/` (package.json, hello-fal.ts, .env.example, .gitignore). The script uploads a local photo to fal storage, calls the edit model once at 1K / 16:9 / jpeg, logs queue timings and the raw result, saves the image to `out/`.
- Decided, and why: `fal.subscribe` for the spike (MASTER 5.3 allows it); explicit `aspect_ratio: "16:9"` per A7; `jpeg` output to keep files small.
- Measured or verified: fetched `google/nano-banana-2.1/edit/llms.txt`. Fields match MASTER 5.2. Extra optional fields not in the table: `num_images` (1-4), `seed`, `safety_tolerance` ("1"-"6", default "4"), `system_prompt`, `thinking_level` (minimal/medium/high), `enable_web_search`, `limit_generations`, `sync_mode`. Output also has `description` (string). Pricing: $1.764 per 1M input tokens, $8.823 per 1M output tokens; resolution changes cost a lot.
- Delegated to Haiku, and whether it was kept: nothing.
- Problems: no Node.js on this machine; no FAL_KEY. The script has not been run or type-checked.
- Next: run it, record result shape and seconds, then A2-02.

### 2026-11-14 16:15, A2-01: Hello fal (done)
- Did: installed Node v26.13.1 LTS through winget, with the human's permission. Ran `npm run hello` on `input/test.jpg`, a 1920×1271 photo of Exhibition Road looking south past Imperial College ("London - Exhibition Road - View South.jpg", Wikimedia Commons, CC BY-SA 4.0). Prompt: the same street in 1900. Type check with strict tsc passes.
- Decided, and why: `@fal-ai/client` plus `fal.storage.upload` plus `fal.subscribe` works as MASTER 5.3 describes. Nothing in the plan needs to change.
- Measured or verified:
  - Key and client work. Upload of a 731 KB file took 1.9 s. Edit took 19.5 s: first queue update at 0.5 s, then IN_PROGRESS (no IN_QUEUE seen), then COMPLETED. Request id 01a1dad2-642e-77e2-abc1-5b183c2375f4.
  - Result shape: `{ images: [{ url, content_type, file_name, file_size: null, width, height }], description: "" }`. `width` and `height` are returned, so the pipeline can fill `Panorama.widthPx`/`heightPx` without downloading. `file_size` comes back null.
  - `aspect_ratio: "16:9"` at `1K` gives **1376×768**, a ratio of 1.79, not exactly 1.78. The 2K/4K sizes are not checked yet.
  - Quality, judged by eye: strong. The camera position and the stucco terrace on the left are kept. The modern glass Imperial College frontage on the right is replaced by red-brick Victorian buildings, with horse-drawn cabs, an omnibus, a gas lamp and a dirt road. The tall lamp post moved slightly and the road is wider. This is a good base for the scene stage.
  - Cost: token-priced, not shown in the response. Read it on the fal dashboard for the request id above and add it here.
- Delegated to Haiku, and whether it was kept: nothing.
- Problems: npm 11 warns that esbuild's postinstall is not covered by `allowScripts`. tsx ran anyway. Bash needs `C:\Program Files\nodejs` on PATH until the shell is restarted.
- Next: A2-02.

### 2026-11-14 16:35, A2-02: scene spike and headshot (done)
- Did: added `spikes/agent-2/lib.ts` (upload, timed fal call, download, record), `prompts.ts` (prototype `buildScenePrompt(brief, year)` and `buildHeadshotPrompt(guide, year)`, taking the SceneBrief and Guide shapes), `scene-spike.ts` and a `tsconfig.json` (`npm run typecheck`). Ran `npm run scene`: one structured 1880 prompt through both edit models in parallel on `input/test.jpg`, plus one headshot of a fictional guide ("Martha Hale, flower seller"). The brief and guide are hand-written stand-ins, not researched. Made 50% blends of each edit over a 16:9 centre crop of the original, to judge framing (`out/blend-*.jpg`, `out/compare-1880.jpg`).
- Decided, and why:
  - **scene: Pro primary, 2.1 fallback.** In the blend, Pro's left terrace, columns, railings, kerb and horizon land almost exactly on the original's. 2.1 zoomed in and shifted the terrace, and its kerb drifts. Framing fidelity matters more than liveliness: the then/now slider overlays the two, and the panorama, guide_frame and walk clips are all grown from the scene. 2.1 made a busier, livelier street, which is a fair fallback.
  - **headshot: 2.1.** Clean, warm, period-correct and sharp, with the face unobstructed, so it is usable as the identity reference for guide_frame.
  - Prompt shape: KEEP / REMOVE / CHANGE / ADD BACK sections mapped one to one from `SceneBrief.changes`. Both models followed every section (glass frontage removed, a red-brick terrace with chimneys added back, gas lamps, granite setts, droppings, no road markings).
- Measured or verified:
  - Pro edit 20.6 s, 2.1 edit 20.3 s, headshot 18.1 s, all run at once. Request ids are in `out/scene-spike-1880.json` (pro 01a1dad9-f0f2-7781-be68-bc88cc641cc3, 2.1 01a1dad9-f0f5-7c20-967e-17721b2a6608, headshot 01a1dad9-f089-7700-bff5-35a01c73d03d).
  - Pro `/edit` also returns 1376×768 for 16:9 at 1K. Headshot 1:1 at 1K is 1024×1024.
  - The Pro schema allows only `thinking_level: "high"`. It also accepts `temperature`, `top_p`, `history`, `context` and `return_history`. The 2.1 text-to-image pricing is $1.764 per 1M input tokens and $35.294 per 1M output image tokens.
  - **Trap: given a 3:2 photo and `aspect_ratio: "16:9"`, the models centre-crop it.** Pro's output matched the centre crop. Reference photos must already be 16:9 (A1-08 normalises them), or the crop decides the framing.
- Delegated to Haiku, and whether it was kept: nothing.
- Problems: the headshot ignored "plain grey background" and put a blurred period street behind her. It looks good, but the prompt was not followed. If a plain background matters for the chat bubble, test `system_prompt` or move the background instruction to the first line.
- Next: A2-03 panorama bake-off, from `out/scene-1880-pro.jpg`.

### 2026-11-14 16:55, A2-03: panorama bake-off (done, phone check pending)
- Did: added `make_canvases.py` (Pillow, no network), which builds an empty 2:1 equirectangular grid and the scene pasted at the centre of a grey 2:1 canvas and a grey 21:9 canvas (scene one third of the width, scene horizon on the canvas equator). Added `buildPanoramaOutpaintPrompt` and `buildPanoramaGridPrompt` to `prompts.ts`, and `pano-spike.ts` (`npm run pano -- a b1 b2 c`). Ran every route from `out/scene-1880-pro.jpg`.
- Results:
  - **(a) `fal-ai/hunyuan_world`: not served.** The catalogue lists it as active (updated 2026-06-24, no retirement date), but the queue answers `Application "hunyuan_world" not found` for it, for `/image-to-world`, for `/image-to-panorama` and for the hyphenated spelling. Probes with an empty body cost nothing.
  - **(b1) grid as image 1, scene as image 2: fail.** 2912×1440, but it is a wide, flat street photo with one vanishing point and no view behind. It would smear on a sphere.
  - **(b2) outpaint a 2:1 canvas: pass.** 2912×1440 (2.022), so resize to 2880×1440 for an exact 2:1. It looks properly equirectangular: curved kerbs, level horizon at about 51% down, sky above, ground below, a cross street behind the viewer, and red-brick terraces at both edges. Wrap seam: the first and last columns differ about twice as much as typical neighbouring columns (19.5 against 8.7 mean abs per channel), but the seam is invisible by eye in a rolled crop (`out/pano-b2-seam.jpg`). Flaw: modern white dashed road markings on the left, because the panorama prompt did not carry the "not yet built" list.
  - **(c) 21:9 band: fail as 360°.** 3168×1344, a wide flat view again, and the edges do not match (stucco on one side, brick on the other). Usable as a 180° "wide view" only.
- Decided, and why: **route b2.** It is the only output that behaves like a sphere. For Agent 4: `vFovDeg: 180`, `widthPx: 2880`, `heightPx: 1440`. `centreBearingDeg` = `bearingDeg(landmark.photoSpot, landmark.subject)`, because the scene (photo spot facing subject) is pasted at the horizontal centre. The pipeline must resize to exactly 2:1 before upload. That needs an image library in the worker (sharp, or a fal resize model; decide in A2-08).
- Measured: all three Pro routes took about 27 s each, run in parallel. Request ids: b1 01a1dadd-016a-72f0-86c8-3cb34902875a, b2 01a1dadd-01d5-7d61-ab41-a8cb9f34c1d7, c 01a1dadd-01d5-7cc0-b446-77c0d4e353ce. All four records are in `out/pano-spike-1880-*.json`.
- For A2-08: pass `SceneBrief.changes.notYetBuilt` into the panorama prompt too. Consider a 32 px cross-fade of the left and right edges to remove the seam step. Try 4K ($0.30) if the phone view looks soft: 2880 px over 360° is only about 8 px per degree.
- Delegated to Haiku, and whether it was kept: nothing.
- Still open: the MASTER 5.4 pass mark needs a phone. `out/pano-1880-b2-2x1.jpg` is uploaded at https://v3b.fal.media/files/b/0ab2744b/pptkrvSGkOwD6o_RzIHjG_pano-1880-b2-2x1.jpg for Agent 4's viewer spike (`?src=<url>&vfov=180`). Added `upload.ts` (`npm run upload -- <files>`, free).
- Next: A2-04 voice bake-off.

### 2026-11-14 17:45, A2-04 to A2-06: voice, talk and walk spikes (generated, waiting for human judgement)
- Did: `voice-spike.ts` (`npm run voices`). One 114-word, 605-character guide script, read by Eleven v4 (Alice, Lily, Charlotte, George, Daniel, Callum, Brian, Bill; stability 0.4) and by Gemini 3.8 Flash TTS (Kore, Aoede, Leda, Gacrux with a female Cockney style instruction; Charon, Algieba, Iapetus, Rasalgethi with a male one). Every clip was transcribed with Scribe v2 and scored for word error against the script. `talk-spike.ts` (`npm run talk`): guide frame, a 10 s clip in Lily's voice, then Kling avatar v2 standard against Fabric 1.0 480p. `walk-spike.ts` (`npm run walk`): Kling 4.0 first-and-last-frame, 5 s, 720p. Added `buildGuideFramePrompt` and `buildWalkPrompt` to `prompts.ts`. `out/review.html` puts everything on one page.
- Measured or verified:
  - **Voices:** 16 of 16 succeeded, at 11-14 s each. Word error 0-1.8% for every voice, so all read the script cleanly. **Length: 37.2-41.2 s for 114 words, about 2.9 words a second.** MASTER section 7's "105 to 120 words, about 45 s" actually gives about 36-42 s. 45 s needs about 130 words. Tell Agent 1 (Historian rules). Eleven returns MP3 at 44.1 kHz, 128 kbps, mono (about 600 KB). Gemini returns WAV, 16-bit, 24 kHz, mono (about 1.9 MB), with `content_type` audio/wav (the schema example's "png" is wrong). Scribe v2 accepts both formats and returns `words[]` with `type` "word" or "spacing" and times in seconds.
  - **Guide frame, first try: fail.** It ignored "two metres, knees up" and placed her full-length about 8 m away, with a face about 40 px tall, too small for lip sync. **Second try: pass.** Putting "Medium close-up ... framed from the waist up ... large in the frame" first gave a face about 200 px tall that matches the headshot, with the scene unchanged except the lamp post and two cabs behind her. Both are 1376×768.
  - **Talk, 10 s:** Kling standard took 226 s and made 1280×720, 10.13 s, with audio. Fabric 480p took 53 s and made 864×480, 10.16 s. Kling at that speed means about 15 min for a 45 s clip, so the live-generation demo must not wait on it.
  - **Walk on:** 163 s, and the output is 5.04 s at **1280×716** (not 720), with an audio track. The stitch stage must scale every clip to 1280×720 (merge-videos picks the smallest size, F-006).
  - **`fal-ai/ffmpeg-api/extract-frame` returns 403 "You do not have permission to use this endpoint"** on this key. The walk_off plan, starting on the talk clip's last frame, needs another route: use guide_frame as the start (it is the talk clip's first frame), or ask the team about access. Installing a local ffmpeg (`ffmpeg-static`) was blocked by the session's permission check, so I cannot cut stills from the videos myself.
- Decided, and why: nothing final. Accents, lip sync and walking motion have to be judged by a person, and I cannot hear audio or play video here.
- Delegated to Haiku, and whether it was kept: nothing.
- Spend so far (list prices): A2-01 to A2-03 about $1, voices about $0.70, guide frame ×2 $0.30, talk tests about $1.40, walk-on about $0.79. **About $4.20 in total.**
- Next: the human's picks, then `VOICE_CATALOG`, then the 45 s clip.

### 2026-11-14 20:05, A2-07: src/lib/fal (done)
- Did: brought `main` into `agent-2` (a fast-forward: PR #1 had already merged agent-2 into main). Replaced the M0 stubs in `src/lib/fal/` with `run.ts` (`runFal`, `FalStageError`), `models.ts` (the registry, from the chosen-models table), `voices.ts` (provisional catalogue with provider voice name and stability, plus `getVoice`), and real `uploadToFal`, `synthesizeSpeech(text, key, { fast }, ctx?)` and `transcribe(url, ctx?)` in `index.ts`. Signatures from MASTER 4.4 are unchanged; the optional `ctx` parameter is an addition that lets the pipeline save request ids. Added `fal.test.ts` (15 tests) and a README.
- Decided, and why:
  - `runFal` uses `fal.queue.submit/status/result` and calls `onRequestId` before the first poll, so a restart resumes the same request (MASTER 5.3 rule 2). `onPoll` exists so the pipeline can call `heartbeatJob` during the 15-minute talk wait.
  - `VOICE_CATALOG` keeps the two `placeholder-*` keys, now mapped to real voices, because Agent 1's fixtures and tests name them. Agent 1 should rename them in `fixtures/eras.ts`.
  - The catalogue is Alice, Lily, George, Daniel. British accent is from memory and unconfirmed until a human listens.
- Measured or verified: `npm run check` passes (typecheck, lint, 195 tests). A live smoke run with the spike key: TTS of a 48-character line took 3.9 s on `eleven-v4` and 2.9 s on `eleven-v4-turbo`; Scribe transcribed both back correctly in 2.2 s and 1.7 s. Request ids were saved once per call. Cost is under one cent.
- Delegated to Haiku, and whether it was kept: nothing.
- Problems: the root `node_modules` held Linux-only native binaries (rolldown), so vitest would not start on Windows. A plain `npm install` fixed it and did not touch the lockfile. If another Windows machine hits "Cannot find native binding", run `npm install` there too. The first lint run failed on a missing doc description in `run.ts`; fixed.
- Next: A2-08.

### 2026-11-14 20:15, A2-08: pipeline stages (done)
- Did: `src/lib/pipeline/stages/` with one function per stage (scene, panorama, headshot, narration, guide_frame, walk on and off, talk), `prompts.ts` (the spike prompts ported as exported builders), `inputs.ts` (model input shapes, with the fallback models' different fields), `image.ts` (panorama canvas, resize to exact 2:1, leftover-grey measure), `types.ts`, a README and 18 tests. `src/lib/fal/index.ts` now also re-exports the size constants. Added `sharp` as a direct dependency: Next already installs it, but it was not declared, and the panorama stage needs it.
- Decided, and why:
  - Stages take plain inputs and return `{ url, model, requestId, elapsedMs }`, so the orchestrator owns all state and every stage is testable with a fake queue.
  - Walk off starts at the guide frame, not the last frame of talk, because `extract-frame` is 403 on our key.
  - The panorama prompt now repeats `notYetBuilt` (the first spike drew modern road markings).
  - Default horizon fraction 0.55 for a typical phone photo (the spike's 0.69 was for a tilted-up photo). Untested on other photos.
- Measured or verified: `npm run check` passes (typecheck, lint, 213 tests). **Live run of `runPanorama` through the production code, three times:** 34.7 s, 35.4 s and 36.0 s. Results: one good sphere (0.3% grey), one valid sphere with the horizon about 10% too low (1% grey), and one bad picture, a mirrored two-row layout with the bottom third left as grey canvas (12.6% grey). Only one of three was fully good, so the model is not reliable here.
- Fixed because of it: `runPanorama` now measures leftover grey and retries once above 3% (worst case two requests, about $0.30), keeping the better one, and reports `attempts` and `unpaintedFraction`. The grey measure separates the runs cleanly (0.3% and 1% against 12.6%). The low horizon is not caught: A2-12's Claude check should judge horizon height, the seam and leftover modern objects.
- Bug the tests caught: a portrait-shaped scene made `sharp` refuse to composite onto the canvas; the scene is now fitted inside it.
- Delegated to Haiku, and whether it was kept: nothing.
- Spend this session: panorama runs about $0.45, voice smoke test under $0.01. Total so far about $4.70 at list prices.
- Next: A2-09.

### 2026-11-14 20:25, A2-09: runEraJob (done, not run live end to end)
- Did: `src/lib/pipeline/run.ts` (the orchestrator), `deps.ts` (the Historian plus eight stage functions as one swappable object, with a real set and a no-spend dry-run set), `index.ts`, a README and 10 tests on the in-memory database and queue. Stages now also return `durationS` for video clips.
- Decided, and why:
  - **Never pay twice, two ways.** A core stage whose output is already on the Era is skipped. Every stage saves its request id on the job stage and a re-claimed job passes it back to `runFal`, so fal returns the finished result. The guide frame has no Era field (contracts are frozen), so this is the only way it survives a worker restart.
  - **A failed stage does not stop independent ones.** Dependants are `skipped`. Core `state` is `failed` unless scene, panorama, headshot and narration all exist; `videoState` is separate. Asking again repeats only what is missing.
  - **Reused outputs are marked `skipped`, not `done`**, since nothing ran. If the progress sheet should show them as done, say so.
  - **Dry run is chosen by `NEXT_PUBLIC_USE_MOCKS=1`**, not by a missing key: a deployment that lost its key must fail loudly, not store "Placeholder" text as a real era.
  - **Edited Agent 1's `src/lib/jobs/jobs.test.ts`** (3 lines: stub the mocks flag for its 'pipeline stub, end to end' test, and unstub in afterEach). It ran `runEraJob` with no keys and expected fixtures. The human approved this exception to the ownership rule; Agent 1 is told on the board.
  - Talk clip length: the model's `duration` if given, otherwise words divided by 2.9 per second.
- Measured or verified: `npm run check` passes (typecheck, lint, 224 tests). The tests cover the happy path with both tiers, stage records (model, request id, times), a failed scene (panorama skipped, headshot and narration kept), a failed brief, a failed clip, a failed guide frame, a second job repeating only what is missing, a re-claimed job passing saved request ids (including the guide frame), and the dry run. No live end-to-end run: that needs `ANTHROPIC_API_KEY` for the brief and about $0.50 plus $0.25-0.60 for the core tier alone, and about $4 more for the video tier.
- Delegated to Haiku, and whether it was kept: nothing.
- Problems: the first lint run wanted doc comments on arrow functions inside exported objects; fixed by naming them. `stitch` stays `skipped` until A2-14.
- Next: A2-10.

### 2026-11-14 20:40, A2-11 (voice routes): tts and stt done, uploads still to do
- Did: `POST /api/voice/tts` and `POST /api/voice/stt` in `src/app/api/voice/` (moved to the front of the queue because Agent 4's voice screens were blocked on them), shared helpers in `_lib/voice.ts`, spend guards in `src/lib/fal/guards.ts` (a per-caller rate limit and a speech cache), audio sniffing and upload naming in `src/lib/fal/audio.ts`, a README, 25 tests, and `spikes/agent-2/voice-test.mjs` (a browser page that records with a real microphone and posts to the app).
- Decided, and why:
  - The tts route takes only `{ eraId, text }` and picks the voice from the era's guide, as the contract says. It uses the chat model (`eleven-v4-turbo`), 404s an unknown era and 409s an era with no guide.
  - Two spend guards, because these are public endpoints on our credits (MASTER 5.3 rule 1): 30 tts and 20 stt per caller per minute, and a cache so replaying a reply costs nothing. Both are per process; on Vercel the true ceiling is a multiple.
  - 503 `voice_unavailable` when there is no FAL_KEY and mocks are off, so a missing key reads as "not configured", not a crash.
- Measured or verified (live, `next dev` with the real key, in-memory database): tts for `queens-tower_1893` answered in 5.4 s, and the same text again in 34 ms from the cache. stt transcribed "Good afternoon. Mind your step on the pavement" correctly in 3.9 s.
- **Found live: fal's speech to text rejects `.webm` and `.mp4` with a 422** ("Supported formats are .mp3, .wav, .m4a, .ogg, .flac, .aac"). Chrome records WebM and iOS Safari records MP4, and the client names the file by that, so voice input would have failed on both. The check is on the file name only: the same MP3 bytes under `.ogg`, `.m4a` and `.aac` transcribed fine, under `.mp4` and `.webm` they were refused. So the route renames the upload from the real bytes (WebM becomes `.ogg`, MP4 becomes `.m4a`). Verified: MP3 bytes labelled webm, mp4 and ogg all transcribe. **Not verified:** a real Chrome WebM/Opus or iOS MP4/AAC recording, because there is no encoder on this machine. `voice-test.mjs` is for that.
- Delegated to Haiku, and whether it was kept: nothing.
- Problems: Next only allows HTTP-method exports from a route file, so the helper `isAcceptableAudioType` lives in `_lib`. Two shell heredocs failed on quoting; the files were written with the file tool instead.
- Next: uploads route, then the worker (A2-10).

### 2026-11-14 20:50, A2-11 (uploads route): done
- Did: `POST /api/uploads` in `src/app/api/uploads/` (route, `_lib/limits.ts`, README, 7 tests). Multipart `file`, JPEG only, up to 4 MB, returns `{ url }`.
- Decided, and why: JPEG is checked from the file's first bytes (FF D8 FF), not the claimed MIME type, because a browser's type is not trusted and the contract allows JPEG only. The upload is stored as `capture.jpg` whatever the browser called it. 20 uploads per caller per minute. It reuses the voice routes' 429, 502 and 503 helpers, so the 503 code is `voice_unavailable` (slightly odd name, same meaning: no key on this server).
- Measured or verified: `npm run check` passes (246 tests). Live with the real key: a 731 KB JPEG uploaded in 3.0 s, and the returned fal URL fetched back as 748,172 bytes of image/jpeg.
- Delegated to Haiku, and whether it was kept: nothing.
- Problems: none.
- Next: A2-10, the worker.
