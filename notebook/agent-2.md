# Agent 2 notebook: Studio

Only Agent 2 writes here. Rules: `MASTER.md` section 8.5. Task details: `MASTER.md` section 11.
Questions and requests to other agents go on `BOARD.md`, not here.

## Current state

Rewrite this block before you stop, so a fresh session can continue from it alone.

- Last updated: 2026-11-14 16:15
- Working on: A2-01 done. Next up A2-02
- Next: A2-02 scene spike. Reuse `spikes/agent-2/input/test.jpg` (Exhibition Road, looking south). Compare `google/nano-banana-2.1/edit` with `fal-ai/nano-banana-pro/edit` on the same change list, and make one guide headshot
- Blocked on: nothing. Node v26.13.1 is installed at `C:\Program Files\nodejs`. Shells opened before the install need it added to PATH by hand. FAL_KEY is in `spikes/agent-2/.env.local`
- Board read up to: 2026-11-14 15:30 (@team plan v1.1)
- Waiting for commit approval: A2-01 spike and this notebook, on a new branch `agent-2`

## Chosen models

Fill in as each bake-off finishes. `src/lib/fal/models.ts` must match this table.

| Stage | Endpoint chosen | Fallback | Seconds | Cost | Decided in |
|---|---|---|---|---|---|
| scene | | | | | A2-02 |
| panorama | | | | | A2-03 |
| headshot | | | | | A2-02 |
| narration | | | | | A2-04 |
| guide_frame | | | | | A2-05 |
| talk | | | | | A2-05 |
| walk_on, walk_off | | | | | A2-06 |
| chat speech | | | | | A2-04 |
| speech to text | | | | | A2-11 |
| stitch | | | | | A2-14 |

## Tasks

- [x] A2-01 Hello fal
- [ ] A2-02 Scene spike, compare the two image models
- [ ] A2-03 Panorama bake-off, pick a route
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
