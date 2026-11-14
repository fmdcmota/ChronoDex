# Agent 2 notebook: Studio

Only Agent 2 writes here. Rules: `MASTER.md` section 8.5. Task details: `MASTER.md` section 11.
Questions and requests to other agents go on `BOARD.md`, not here.

## Current state

Rewrite this block before you stop, so a fresh session can continue from it alone.

- Last updated: 2026-11-14 16:55
- Working on: A2-02 and A2-03 done. Next up A2-04
- Next: A2-04 voice bake-off (Eleven v4 voices against Gemini TTS on one script). Then A2-05 guide frame and talk, from `out/scene-1880-pro.jpg` and `out/scene-1880-headshot.jpg`
- Blocked on: nothing. Node v26.13.1 is installed at `C:\Program Files\nodejs`. Shells opened before the install need it added to PATH by hand. FAL_KEY is in `spikes/agent-2/.env.local`
- Board read up to: 2026-11-14 15:55 (@agent-4 A4-01 viewer spike)
- Waiting for commit approval: A2-02 and A2-03 spikes plus this notebook (A2-01 is committed as 33b7d6d on `agent-2`, not pushed)

## Chosen models

Fill in as each bake-off finishes. `src/lib/fal/models.ts` must match this table.

| Stage | Endpoint chosen | Fallback | Seconds | Cost | Decided in |
|---|---|---|---|---|---|
| scene | `fal-ai/nano-banana-pro/edit` (1K, 16:9, jpeg) | `google/nano-banana-2.1/edit` | 20.6 | $0.15 list | A2-02 |
| panorama | `fal-ai/nano-banana-pro/edit` outpainting a 2:1 canvas (route b2, 2K, aspect `auto`), then resize to exactly 2:1 | none proven; `fal-ai/hunyuan_world` is not served | 27.0 | $0.15 list | A2-03 |
| headshot | `google/nano-banana-2.1` (1K, 1:1, jpeg) | `fal-ai/nano-banana-pro` (not tested) | 18.1 | token-priced, see dashboard | A2-02 |
| narration | | | | | A2-04 |
| guide_frame | | | | | A2-05 |
| talk | | | | | A2-05 |
| walk_on, walk_off | | | | | A2-06 |
| chat speech | | | | | A2-04 |
| speech to text | | | | | A2-11 |
| stitch | | | | | A2-14 |

## Tasks

- [x] A2-01 Hello fal
- [x] A2-02 Scene spike, compare the two image models
- [x] A2-03 Panorama bake-off, pick a route (route b2; phone viewer check still due with Agent 4 at M1)
- [ ] A2-04 Voice bake-off, write `VOICE_CATALOG`
- [ ] A2-05 Talking-guide bake-off, one full 45 s clip
- [ ] A2-06 Walk-on spike
- [ ] A2-07 fal library: `runFal`, models, voices, upload, speech, transcribe
- [ ] A2-08 Stage functions and prompt builders
- [ ] A2-09 `runEraJob` orchestrator
- [ ] A2-10 Worker
- [ ] A2-11 Routes: uploads, voice tts, voice stt
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
