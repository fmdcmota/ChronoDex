# Agent 2 notebook: Studio

Only Agent 2 writes here. Rules: `MASTER.md` section 8.5. Task details: `MASTER.md` section 11.
Questions and requests to other agents go on `BOARD.md`, not here.

## Current state

Rewrite this block before you stop, so a fresh session can continue from it alone.

- Last updated: not started
- Working on: nothing yet
- Next: A2-01
- Blocked on: nothing
- Board read up to: nothing yet
- Waiting for commit approval: nothing

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

- [ ] A2-01 Hello fal
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
