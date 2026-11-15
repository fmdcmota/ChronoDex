# src/lib/pipeline/stages

Owner: Agent 2 (Studio). One function per fal stage: plain inputs in, a URL out. A stage never touches the database or the job. The orchestrator (A2-09) calls them in the order of MASTER.md 5.1, saves the request id, stores the result on the Era and updates the job stage.

## Entry points (`index.ts`)

| Stage | Function | Model (see `src/lib/fal/models.ts`) |
|---|---|---|
| scene | `runScene({ referencePhotoUrl, brief, year })` | Nano Banana Pro edit |
| panorama | `runPanorama({ sceneUrl, brief, year })` | Nano Banana Pro edit, then `sharp` resize to 2880x1440 |
| headshot | `runHeadshot({ guide, year })` | Nano Banana 2.1 |
| narration | `runNarration({ guide })` | Eleven v4 |
| guide_frame | `runGuideFrame({ sceneUrl, headshotUrl, guide, year })` | Nano Banana Pro edit |
| walk_on, walk_off | `runWalkOn`, `runWalkOff({ sceneUrl, guideFrameUrl, guide })` | Kling 4.0 image to video |
| talk | `runTalk({ guideFrameUrl, narrationUrl })` | Kling AI Avatar v2 (provisional) |
| stitch | `runStitch({ clipUrls, expectedDurationS })` | fal ffmpeg merge. Blocked on our key (403); returns `{ output: null, reason }` instead of throwing, and only accepts a file whose audio and length survive |

**Checked stages** (scene, panorama, guide_frame) generate, have a vision critic judge the picture (`critic.ts`, `checked.ts`), repeat once with the critic's advice if it finds a hard failure, and keep the better one. The report is on `output.check`. `IMAGE_CHECKS=off` or `ctx.checks: 'off'` turns it off. Hard failures: a wrong panorama projection, a visible seam, an anachronism, a computer-generated scene, a wrong guide frame, a canvas left grey. Soft notes are recorded only.

**Realism settings:** `PERIOD_LOOK=monochrome` switches the look (default colour); up to 3 `sceneBrief.referenceImageUrls` are passed to the scene and panorama; the panorama is enlarged 1.4x with SeedVR2 and the pasted scene is feathered 90 px; `IMAGE_CHECK_MODEL` overrides the critic.

Every stage takes a `StageContext` last: `onRequestId`, `resumeRequestId`, `onPoll` (pass `heartbeatJob`), and `endpoint` to use the fallback model. Prompts are in `prompts.ts`, model input shapes in `inputs.ts`, panorama image work in `image.ts`.

## Run and test

    npm run test -- src/lib/pipeline/stages   # fake queue, synthetic images, no network

## Traps

- The reference photo must be 16:9 or the edit models centre-crop it.
- The panorama model is unreliable: about one run in four to six is a flat wide photograph or has a seam. The critic catches it and `runPanorama` retries once; a panorama still flat after the retry is kept and flagged in `output.check`.
- Walk clips come out 1280x716, talk 1280x720: scale before stitching (A2-14).
- Stitching needs the ffmpeg API enabled on the fal key (403 today).
- The critic costs about $0.0125 a picture (Sonnet through fal) and never blocks generation: if it cannot answer, the picture is kept unchecked.
