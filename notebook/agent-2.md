# Agent 2 notebook: Studio

Only Agent 2 writes here. Rules: `MASTER.md` section 8.5. Task details: `MASTER.md` section 11.
Questions and requests to other agents go on `BOARD.md`, not here.

## From the human: priorities for Sunday (2026-11-15 01:50, read first)

Added by the human on Sun 15 Nov 2026 at 01:50, from `REMAINING_WORK.md` (tests, actions, Gantt) and `notebook/agent-4-panorama-plan.md` (the 360° view made once with fal and kept). Work top to bottom. Move each item into your Tasks list as you take it, log it, and leave this section in place. Freeze is assumed at 10:00, submission 12:00 (still unconfirmed).

**Read `notebook/agent-4-panorama-plan.md`.** The human made "never generate the same thing twice" the top
priority. Agent 4 builds the media store (`src/lib/media/`: `persistFromUrl`, `toFalUrl`); your part is in the
pipeline.

1. **A2-a** Scene stage accepts a relative `referencePhotoUrl` (`/reference/<id>.jpg`): read it, upload to fal once per landmark, reject `.svg` clearly. **Today the mock SVG would be sent to fal.** When Agent 4's `toFalUrl` lands, use it here.
2. **A2-h** (new) In `runEraJob`, persist each stage's output with `persistFromUrl` before `patchEra`, so the Era stores `/api/media/<id>`, and pass every stage input through `toFalUrl`.
3. **A2-i** (new, saves credits) Free local checks (aspect ratio, file size) before the paid critic; downscale period references to 1024 px on the long side before upload; never ask for 4K.
4. **A2-b** Forward-view trial with Agent 5's two `same_view` images for Queen's Tower 1893; then the core tier for Queen's Tower 1893 for real (F1), so Agent 4 can run T12 on two phones.
5. **A2-j** (new) Experiment E1: one panorama request from the reference photo, crop the centre as the scene; compare with the two-step result and report cost and look on the board. Adopt only if the human cannot tell them apart (saves about 45 % of image spend).
6. **A2-c** Remove the two `placeholder-*` voice keys; finalise `VOICE_CATALOG` once the human picks voices (H3).
7. **A2-d** The 45 s talk clip once the talk model is picked; split in two requests if refused. Queue it early: about 15 minutes of Kling time.
8. **A2-e** Real end-to-end hold to talk, STT and TTS on the stable URL (T8); post screen-side bugs to Agent 4.
9. **A2-f** `scripts/pregenerate.ts` for the demo eras once reference photos and Agent 5's references exist (core tier for all, video per the credit count), then `scripts/backup-media.ts`.
10. **A2-g** Make sure nothing is left uncommitted on `agent-2`.

## From the human: phone test round 1 and next steps (2026-11-14 23:35, read first)

Added by the human after the first run of `phone_test.md`. Device: iPhone, iOS 26.5.1, Safari. Android not tested yet. Move these into your Tasks and log as you take them. Leave this section in place.

**The key finding for everyone.** The chat test (Part 6) ran on Agent 4's spike page, and the voice test (Part 2) ran with `NEXT_PUBLIC_USE_MOCKS=1`. The canned replies, the beep instead of a voice and the fixed transcript were mock behaviour, not bugs in the real routes. **The real chat, TTS and STT have not yet been seen working from a phone.**

Results that concern you:

- **Test 8, the human's words: "the AI panoramic 360 reconstruction is very unrealistic".** They want it much more realistic and true to the chosen era. This is your top item.
- **Part 2, STT:** the human recorded `32174 bytes as audio/webm;codecs=opus` in Chrome and got `HTTP 200 in 76 ms {"text":"What was daily life like here?"}`. That is your mock `transcribe()`, so real STT from a browser is still unproven (H-B). They tried several sentences and always got the same text.
- **iPhone iOS 26.5.1 Safari records `audio/webm;codecs=opus`**, not `audio/mp4` as we assumed (MEDIA-5). Check that `isAcceptableAudioType` and `uploadNameFor` accept it.
- On the iPhone, a second recording sometimes comes out at **5 bytes** (Agent 4 is fixing the recorder).
- Clips recorded on the iPhone came out as `video/mp4; codecs=avc1.42000a,mp4a.40.2`. Gaps between the three clips were 20 to 21 ms, which is fine for the three-clip guide video.
- MEDIA-9: both delayed beeps played on the iPhone, so TTS replies can play on their own after a reply arrives.
- H-D (panorama on a phone, VIEW-10): the viewer works. The image itself is the problem.

Next, in order:

1. **Panorama realism (new, top).** Today `nano-banana-pro/edit` outpaints a 2:1 canvas around the scene with `buildPanoramaPrompt`. Bake off on one era (Queen's Tower 1893) and show the best two to the human on a phone through Agent 4's viewer (`?src=<url>&vfov=180`). Log the cost of each try. Things to try:
   - a. **A period-specific prompt.** Turn `sceneBrief.surroundings` and `changes` into concrete period detail: the street surface, the lighting (gas lamps or none), the traffic (horse-drawn cabs, carts), shop signs, what passers-by wear, the weather and the light. Ask for a documentary photograph. Rule out the CGI look in words: no gloss, no oversaturation, no HDR, no illustration, no painting, no fantasy architecture. Keep it a named builder with a unit test (MASTER 8.4 rule 4). Apply the same rules to `buildScenePrompt`, because the scene is what the panorama grows from.
   - b. **Real period images as references.** Pass `sceneBrief.referenceImageUrls` (public-domain archive photos, which Agent 5 collects in `data/`) as extra `image_urls`, so the model copies real textures. Never Google imagery.
   - c. **Sharper output.** Try 2K, or `fal-ai/seedvr/upscale/image` (read its llms.txt first). The viewer shows a small part of the image at a time, so softness reads as fake.
   - d. **The catalogue again.** Search for a model that turns an image into a panorama or 360° view (`https://api.fal.ai/v1/models?q=panorama`, `?q=360`). `hunyuan_world` was not being served earlier.
   - e. **A2-12 as a realism critic.** Look for anachronisms, modern objects, a CGI look, the seam and the horizon, with one corrective retry.
   - **Ask the human on the board:** should eras before about 1900 look like colour photographs (the current prompts ban sepia) or like real monochrome photographs of the period? It changes every prompt.
2. **Make mock mode impossible to mistake.** Have mock `transcribe()` return text that says it is a mock, for example `[mock transcript] What was daily life like here?`, and update `voice.test.ts`. Log one warning at server start when mocks are on and `FAL_KEY` is also set. That is the setup that fooled the human.
3. **STT guard.** Refuse a recording under about 1 KB with `400 empty_recording` before spending on fal. Tell Agent 4 the code.
4. **Live end to end.** Once Agent 1 seeds `chronodex`, run the worker on Queen's Tower 1893's core tier: brief, scene, panorama, headshot, narration. The headshot is the chat profile picture the human missed. The narration and TTS are the guide's real voice, in place of the spike's beep. Then ask the human to rerun Part 2 with mocks off and paste the output.
5. **Ambience loops (new, for Agent 4).** The human wants period music and ambience playing in the chat. Find a music or sound model in the catalogue (`?q=music`, `?q=sound effects`, `?category=text-to-audio`) and read its llms.txt. Generate one quiet loop of 30 to 60 s for each period bucket: `1850-1899` (Victorian street: hooves, carriage wheels, a distant brass band or music-hall piano), `1900-1945` (a 1940s dance band on a wireless, distant traffic), `1946-1979` (a 1960s street, period-style pop on a distant radio), `1980-now`. Instrumental only, original, no vocals, nothing that imitates a real song. Script it as `scripts/ambience.ts` (yours, logs the cost) and download the MP3s to `public/audio/ambience/<bucket>.mp3`. The human gives you that folder; Agent 4 owns playback. Post the file names to Agent 4. It also adds to the "made with fal" story.
6. Then the queue as before: A2-12, A2-13, A2-14. The voice and talk-model picks (H-A) and the credit count (H-E) are still open with the human.

## Current state

Rewrite this block before you stop, so a fresh session can continue from it alone.

- Last updated: 2026-11-15 01:15
- Working on: the human's whole post-phone-test queue is built and uncommitted on `agent-2` (realism rework, mock-mode and STT guards, the image critic, ambience loops, `pregenerate` and `backup-media` scripts, the stitch stage). A2-01 to A2-14 are all done except where noted: A2-04 to A2-06 still wait on the human's voice and talk-model picks, and no 45 s talk clip has been made.
- Next: (1) wait for the human's decisions in "Wanted from the human" (colour or monochrome, voice and talk-model picks, fal ffmpeg access, ambience listening). (2) Make the 45 s talk clip once the model is picked (A2-05). (3) Run `scripts/pregenerate.ts` for the demo eras when Agent 1 has seeded `chronodex` with real reference photos and Agent 5's period references. (4) Rename the two `placeholder-*` voice keys once Agent 1 does. (5) Stretch A2-S1 only after M4.
- Blocked on: the human's voice and talk-model picks (A2-04/A2-05) and the fal credit count. FAL_KEY is also in the root `.env.local` (copied 2026-11-14 20:58; mocks stay on, so set NEXT_PUBLIC_USE_MOCKS empty to hit real fal); Node v26.13.1 at `C:\Program Files\nodejs`.
- Board read up to: 2026-11-14 19:55 (@team review)
- Waiting for commit approval: everything since A2-10 (committed as 9ad0ae3): realism rework, mock-mode and STT guards, image critic, ambience loops and audio, pregenerate and backup scripts, stitch stage, this page, a board post. The human asked for one commit at the end
- Review facts for A2-07+: 45 s needs ~130 words (measured ~2.9 words/s), not 105–120. `fal-ai/ffmpeg-api/extract-frame` returns 403 on this key. `merge-videos` uses the smallest input size, so scale every clip to 1280×720 first. Kling avatar standard ≈ 226 s per 10 s clip (~15 min for 45 s).

## Wanted from the human (compile into one list when asked)

The human said not to chase these now: note them here and give them the full list when they ask. Add to it as new ones appear; tick them off when answered.

| # | What | Why | How, in short |
|---|---|---|---|
| H-A | Pick 4 to 6 voices and one talk model | Unblocks `VOICE_CATALOG` (currently provisional) and the 45 s clip | Open `spikes/agent-2/out/review.html`: 16 voice clips, Kling vs Fabric 10 s clips, the walk-on clip |
| H-B | **DONE for WebM (2026-11-14).** The human supplied `recording.webm` (WebM/Opus, 152 KB); it transcribed correctly through the stt route. Still open: Safari MP4/AAC (a Mac or an iPhone) | Chrome records WebM and Safari MP4, and the route renames them by their bytes | Run `npm run dev` and `node spikes/agent-2/voice-test.mjs`, open http://localhost:4000 in Chrome, record, report the output |
| H-C | The same on a real iPhone and Android phone | Phones need HTTPS, so this goes through the deployed app (A1-12) | Use the chat screen's hold to talk once deployed |
| H-D | Look at the panorama in Agent 4's 360 viewer on an iPhone and an Android phone | MASTER M1 gate; the panorama has never been seen on a phone | `?src=<url>&vfov=180`, URL in the A2-03 log entry |
| H-E | How many fal credits do we have? | Decides one video per landmark or all 18 eras (about $77 at list) | fal dashboard |
| H-F | Ask fal support to enable the `fal-ai/ffmpeg-api` endpoints on our key: merge-videos, extract-frame, compose (all 403 when they run) | Stitching the three guide clips into one file, a cleaner walk_off, judging video as stills | Optional. The stitch stage is built and starts working when access is enabled |
| H-G | Reference photos must be 16:9 (H1 photos) | The edit models centre-crop anything else | Agent 1's seed normalises; check the result by eye |
| H-H | Whose machine runs the worker. (The live end-to-end run is DONE in a dev database with the DeepSeek and Atlas keys now in `.env.local`; no Anthropic key is needed.) | runEraJob has never run live end to end | MASTER Q5, H2 |
| H-I | Read the first real brief before the pipeline spends on video (H7) | Accuracy of the 45 s script | Later, at M4. The real Queen's Tower 1893 brief is in my dev database and in `spikes/agent-2/out/e2e-era.json` |
| H-J | **Colour or monochrome for eras before about 1900?** | Every pre-1900 prompt. Monochrome looks most like a real photograph; restrained colour is safer. Default is colour; `PERIOD_LOOK=monochrome` switches it | Compare `spikes/agent-2/out/realism/pano-colour-feather.jpg` with `pano-mono-ref.jpg`, or the scenes `scene-colour.jpg` and `scene-mono.jpg` |
| H-K | Listen to the 8 ambience files and say which period sounds wrong | I could verify length and format only, not the sound | `public/audio/ambience/` (4 music `.m4a`, 4 street `.mp3`) |
| H-L | Look at the live Queen's Tower 1893 era in the app on a phone | The first real generated era, never seen in the app | Run the app with `MONGODB_DB=chronodex_dev_agent2` and `NEXT_PUBLIC_USE_MOCKS=` empty |
| H-M | A panorama still flat after the retry: keep it, or fail the stage so the era is retried? | About one run in five ends flat. Currently kept and flagged | Decide once |

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
- [x] A2-10 Worker (not run live: needs Atlas and keys; real Ctrl+C untested on Windows)
- [x] A2-11 Routes: uploads, voice tts, voice stt (a real browser WebM/Opus recording is proven; only an iOS MP4/AAC one is still unproven)
- [x] A2-12 Image checks with one corrective retry (Sonnet critic through fal; hard failures only)
- [x] A2-13 Pregenerate and backup-media scripts
- [x] A2-14 Stitch stage (built and tested; fal ffmpeg API returns 403 on our key, so it cannot stitch yet)
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

### 2026-11-14 21:10, A2-10: worker (done, not run live)
- Did: merged `main` into `agent-2` (a merge, not a rebase, as asked). Agent 1 had replaced the Historian's Claude call with DeepSeek and removed `HISTORIAN_MODEL`, which broke my `run.ts` import; fixed by calling `historianModel()`, and updated my comments, README and one test that named Claude. Then built `src/worker/loop.ts` (`runWorker`: N slots that claim, run, repeat, with abortable sleeps and a summary), `src/worker/index.ts` (startup checks, signals, logging), a README and 8 tests.
- Decided, and why:
  - The loop is separate from the entry point so it can be tested with fake claim and run functions. The entry point does the process-level work.
  - Fail fast at startup: no `MONGODB_URI` (the worker could not see the API's jobs), or mocks off with no `FAL_KEY` or `DEEPSEEK_API_KEY`. The first log line states dry run or real, because real mode spends money.
  - Concurrency defaults to 1 (`WORKER_CONCURRENCY` raises it). Jobs mostly wait on fal, so more is cheap, but one is the safe default for credits.
  - Shutdown: stop claiming, 20 s grace for a running job, then exit. The job keeps its saved fal request ids and is re-claimed after its 10 minute lease. I did not add a way to release the lease because `src/lib/jobs` is Agent 1's: a `releaseJob` would make a restart resume at once.
- Measured or verified: `npm run check` passes (typecheck, lint, 341 tests, 8 of them the loop). Ran the real entry point: it refuses without `MONGODB_URI` (exit 1), starts and idles in dry-run mode on a private queue, and names a missing `DEEPSEEK_API_KEY` when mocks are off. The unit tests cover queue order, concurrency limit, stop on abort, a running job finishing after abort, an idle slot waking at once on abort, surviving a failed claim and a crashing run, and one end-to-end dry run of a core and video job on the in-memory queue.
- Not verified: a live run against Atlas with real keys, and a real Ctrl+C (a bash shell on Windows cannot deliver SIGINT to the process, so the signal path is untested; only the loop behind it is).
- Delegated to Haiku, and whether it was kept: nothing.
- Problems: the merge briefly broke the typecheck (above). `WORKER_CONCURRENCY` and `WORKER_ALLOW_MEMORY` are not in `.env.example`, which is Agent 1's file (MASTER 8.4 rule 8): asked on the board.
- Next: A2-12.

### 2026-11-14 22:55, speech to text on a real WebM recording (human-supplied)
- Did: the human put a real recording at the repo root as `recording.webm`. Checked its bytes (EBML header, an Opus audio track, 152,541 bytes) and ran it through the real `POST /api/voice/stt` handler with mocks off and the real fal key.
- Measured or verified: HTTP 200 in 5.0 s with MIME type `audio/webm;codecs=opus` and 3.8 s with no type, both transcribing to "This is a file for Ishan. See if Falcon Voice recognize this. Bing bong, bing bong" (the speaker said "fal voice"; the model heard "Falcon Voice", the only slip). So a real browser WebM/Opus recording works end to end, renamed to `.ogg` by the route. This closes the Chrome half of the open risk from A2-11.
- Still unproven: iOS Safari MP4/AAC (sent as `.m4a`). It needs an iPhone over HTTPS.
- Housekeeping: `recording.webm` is untracked at the repo root. It is a personal voice recording, so it should not be committed; `spikes/agent-2/input/` is git-ignored and is a safe place for it.

### 2026-11-15 00:30, human-assigned queue after phone test round 1: items 1 (realism), 2, 3, and A2-12

Merged `main` into `agent-2` first (a fast-forward to b967460). Spend this session: about $2.75 at list prices (scenes and panoramas about $2.05, critic calibration about $0.21, SeedVR2 $0.017, smaller smoke tests the rest). Total for the project so far about $7.5.

**Item 2, mock mode impossible to mistake (done).** Mock `transcribe()` now returns `[mock transcript] What was daily life like here?` (`MOCK_TRANSCRIPT_TEXT`). A new `src/instrumentation.ts` calls `warnIfMocksShadowKey()` once at server start, and the worker calls it at startup: when `NEXT_PUBLIC_USE_MOCKS=1` and a real `FAL_KEY` are both set it prints that voice, upload and generation answer from FIXTURES. Checked on a production build: the warning prints at start. Note Agent 1's client mock (`src/lib/client/mock.ts`, `MOCK_TRANSCRIPT`) still returns the untagged sentence; Agent 1 should tag it the same way.

**Item 3, STT guard (done).** `POST /api/voice/stt` refuses a recording under 1 KB (`MIN_RECORDING_BYTES`) with `400 empty_recording` before anything is sent to fal, checked before the key check and the MIME type. Agent 4 should treat that code as "hold the button a little longer".

**Item 1, panorama realism bake-off for Queen's Tower 1893 (done; the human must choose colour or monochrome).**
- Inputs, all openly licensed from Wikimedia Commons: a present-day photo of the tower with the modern library (CC BY-SA 4.0) as the base, and three real photographs of the Imperial Institute as references (a Rijksmuseum print, CC0; a 1903 postcard and a 1897 to 1899 jubilee print, public domain). Files are in `spikes/agent-2/input/refs/` and `out/realism/` (git-ignored); `refs.json` there was overwritten by a later download, but the sources are: `RP-F-00-4232` (CC0), `1903-11-04 front Imperial Institute London.jpg` (PD), `Commonwealth Institute QE1 35.jpg` (PD), base `Imperial College Central Library, Imperial College Road.jpg` (CC BY-SA 4.0). Agent 5 had produced no photos yet.
- Findings, 11 generations, about $1.5:
  1. **The prompt rewrite is the biggest lever.** The old prompt invented a polished red-and-cream striped Dutch-gabled palace with a green dome: the film-set look the human called unrealistic. The new prompt (period cues, an explicit ban on gloss, HDR, oversaturation and fantasy architecture, a documentary look) with no references already gave a convincing period street.
  2. **Real period photographs as references make the vanished building look like the real one** (pale stone, domed corner turrets, a tall tower, banded brick) instead of a plausible invention. Trade-off: with references the model reframes the view, so the camera position no longer matches the present-day photo and the then/now slider may not line up.
  3. **Monochrome looks most like a real photograph** (the scene read as a genuine albumen print). Colour, done restrained ("colourised the way museum restorers do it"), is safer and more consistent. **Needs the human's choice (asked on the board).**
  4. **The panorama inherits its realism from the scene.** References on the panorama itself made little visible difference once the scene was reference-guided.
  5. **SeedVR2 upscaling makes faces, lamps and brickwork clearly sharper** for $0.001 per output megapixel. 2x gives 5760 px wide, which risks the 4096 px texture limit of older phones, so the pipeline uses 1.4x (4032x2016).
  6. **A hard-edged pasted rectangle showed in the middle of the finished panorama.** Fading the pasted scene into the grey canvas (`featherPx`, 90 px) removed it: in the last six live runs with feathering, references and the period prompt, five were true spheres at the first attempt. It is now the default. One monochrome run earlier had returned a flat photo with feathering, so feathering alone does not guarantee a sphere.
  7. `fal-ai/hunyuan_world` is still not served. No other panorama model exists in the catalogue. Topaz upscalers exist (`topaz/upscale/image/precision`, $0.08 per 24 MP) but are untested.
- Built: `buildScenePrompt` and `buildPanoramaPrompt` take a `PromptStyle` (`look`, `referenceCount`); `periodCues(year)`; `scene` and `panorama` stages pass up to 3 `sceneBrief.referenceImageUrls` (Google addresses and anything but http(s) are dropped, including googleusercontent and gstatic); `PERIOD_LOOK=monochrome` in the environment switches the look (default colour); `runPanorama` upscales at 1.4x and keeps the unenlarged image if the upscale fails.
- Bugs the new tests caught in my code: the Google filter missed `googleusercontent.com`; sharp's `removeAlpha` runs after `joinChannel` and silently stripped the feather's fade.

**A2-12, the image critic (done, with an honest accuracy figure).**
- The critic is a vision model through `openrouter/router/vision` on fal, so it needs only the fal key, not an Anthropic key. Default model `anthropic/claude-sonnet-5` (`CRITIC_MODEL_ID`, override with `IMAGE_CHECK_MODEL`). MASTER names Haiku; on eight labelled panoramas **Haiku agreed with me on 4 and Sonnet on 6** (cost $0.0006 against $0.0125 a picture), so Sonnet is the default. Opus 5.5 is not usable as-is: the endpoint insists on reasoning mode.
- It judges the scene (anachronisms, a computer-generated look), the panorama (projection, seams, horizon, edges, anachronisms) and the guide frame (face large and clear, same person as the portrait, street undistorted). Each stage generates, judges, repeats once with the critic's one-line fix added to the prompt if it found a HARD failure, and keeps the better picture (`checked.ts`).
- **Hard versus soft.** Sonnet raised soft opinions ("glossy, CGI look", "edges do not quite match") on every panorama, including ones that look right to a human, so acting on all of them regenerated everything for no gain. Only a wrong projection (flat photo, tiled panels), a visible seam, a leftover-grey canvas, an anachronism, a CGI look on a scene, or a wrong guide frame trigger the retry. Soft notes are kept in the report and the worker log.
- Live result with the final rules, three runs: two passed at the first attempt (about 70 s, $0.19 each including the upscale), one was a flat wide photograph at both attempts and was kept, flagged, at about 109 s and $0.35. A critic that cannot answer counts as a pass and never blocks generation. `IMAGE_CHECKS=off` switches it off.
- **Known weakness:** a panorama that is still flat after the retry is kept (it looks fine as a picture but is wrong on a sphere). A human decision is open: keep it, or fail the stage so the era is retried later.
- A cheap pixel measure of the wrap seam did not separate real from flat panoramas (ratios overlapped), so it was not used.
- Cost per checked picture about $0.0125; per era about $0.19 for the panorama, $0.16 for the scene and $0.16 for the guide frame when everything passes first time.

Delegated to Haiku: nothing. Problems: two shell commands were blocked by the permission check (one with an `rm`, one that only contained `$$` inside a heredoc); worked around by writing files with the file tool and keeping temp scripts outside the repo, with no removal done.

### 2026-11-15 01:15, items 4 and 5 of the human's queue, A2-13 and A2-14

**Item 4, live end to end (done once, in my own dev database `chronodex_dev_agent2`, not the shared one).** Seeded that database with `npm run seed`, gave Queen's Tower a real reference photo (the present-day photo from the bake-off, because the H1 photos do not exist) and injected the three period photographs as `referenceImageUrls` (Agent 5's job later), then ran the real worker loop on `queens-tower_1893`, core tier. Result: **succeeded in 339 s**, era `ready`. The real Historian (DeepSeek) took 166 s and wrote "The Queen Opens the Imperial Institute", a guide "Albert Neale, hansom cab driver" (voice `eleven-daniel`), a 110-word script and 5 sources; scene 57 s (2 attempts, passed the critic), panorama 115 s (2 attempts; the critic's "flat" verdict was a false positive that the refined critic prompt later fixed), headshot 16 s, narration 12 s. The scene shows opening-day bunting and the Institute's stone lions, the panorama is a true sphere with the Royal Albert Hall dome behind the viewer. The era's media is saved locally by `scripts/backup-media.ts` under `spikes/agent-2/out/media-backup/`. Estimated spend about $0.85. The human can look at it by running the app with `MONGODB_DB=chronodex_dev_agent2` and `NEXT_PUBLIC_USE_MOCKS=` (empty); the shared `chronodex` database was not touched.
- Findings for others: the Historian's script came out at 110 words, which is about 38 s spoken, not 45 (see the 130-word note; Agent 1). The Historian wrote an era-accurate scene brief by itself (flags on the Institute, the lions), so Agent 5's references mostly add architectural fidelity.
- Critic fix found by this run: the first critic prompt called a real sphere "flat" (false positive, a $0.15 wasted retry). Describing what a gentle equirectangular curve looks like and what "one direction only" means fixed it: **10 of 10** on a labelled set of ten panoramas, for both Sonnet and Haiku. Caveat: tuned on the same ten images, so real accuracy on new ones is unproven. Haiku (20x cheaper) also gets projection right but falsely reports seams, so Sonnet stays the default.

**Item 5, ambience loops (done, files made; nobody has listened yet).** `scripts/ambience.ts` made, for each of `1850-1899`, `1900-1945`, `1946-1979`, `1980-now`, a 45 s instrumental music loop (`<bucket>.m4a`, AAC, Sonilo text-to-music, licensed as commercial-use-safe, $0.11) and a 30 s street-sound loop (`<bucket>-street.mp3`, ElevenLabs sound effects with the smooth-loop option, $0.06), in `public/audio/ambience/`, with `manifest.json` (models, request ids, lengths, costs). Total $0.69, 7.4 MB. Prompts are named builders in `src/lib/fal/ambience.ts`: instrumental only, "an original composition, not based on any existing song", quiet and loopable, and a test checks no real artist or song is named. `ambienceBucketFor(year)` maps an era to its bucket. **For Agent 4:** the music files are `.m4a` (plays in Safari and Chrome), the street files `.mp3`; mix them as two layers. I could only verify length (exactly 45.0 s and 30.1 s) and format, not the sound: a human must listen, and the music loop may have an audible join when it repeats (Sonilo has no loop option), so a short crossfade in the player is advisable.

**A2-13 (done).** `scripts/pregenerate.ts`: queues every era that is not ready through the API's own rule, runs the same worker loop and `runEraJob`, exits when the queue is empty, prints a table and writes `spikes/agent-2/out/pregenerate-log.json`. `--dry-run` prints the plan and an estimate (about $0.62 per era core, so about $5.6 for the nine eras not yet made), `--video` (needs `VIDEO_GENERATION=on`), `--only`, `--concurrency` (default 2), `--max-usd`. Safe to re-run: it repeats only what is missing. Dry run tested live against my dev database. `scripts/backup-media.ts`: downloads every media URL of every era plus landmark reference photos to `spikes/agent-2/out/media-backup/` (git-ignored) with `index.json`; `--dry-run` lists them; skips files already saved. Tested live: 5 files saved, second run skipped all. Bug found by running it: the dry run hung because an open MongoDB connection keeps the process alive; both scripts now always close it.

**A2-14 (built, blocked by fal).** Probed the whole `fal-ai/ffmpeg-api` family: merge-videos, extract-frame, compose and merge-audio-video are accepted into the queue and then fail with **403 "You do not have permission to use this endpoint"**. So no clip joining and no last-frame extraction on our key (the human's list item H-F, now broader). Built `runStitch` anyway so it works the moment access is enabled: it merges at an explicit 1280x720, downloads the result, reads its MP4 boxes (`video.ts`, no ffmpeg needed, tested on a real Kling clip) and only accepts it if it has video and audio tracks and a length within 1.5 s of the clips' total, else it returns a null output and a reason. `runEraJob` marks the video ready from the three clips first, then tries the stitch, and records a failed stitch as `skipped` with the reason, so it can never fail the job. The player plays three clips in order (about 20 ms gap on an iPhone) meanwhile.

**Open for the human (added to the table above):** colour or monochrome for pre-1900 eras (`PERIOD_LOOK`); listen to the ambience; ask fal for ffmpeg API access; keep or fail a panorama that is still flat after the retry; look at the live era in the app.

Spend this session by my estimate: about $4.3 (bake-off $1.5, three-run panorama checks about $1.6, critic calibration about $0.35, live era about $0.85, ambience $0.69). Project total about $9.
