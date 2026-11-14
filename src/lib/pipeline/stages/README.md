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

Every stage takes a `StageContext` last: `onRequestId`, `resumeRequestId`, `onPoll` (pass `heartbeatJob`), and `endpoint` to use the fallback model. Prompts are in `prompts.ts`, model input shapes in `inputs.ts`, panorama image work in `image.ts`.

## Run and test

    npm run test -- src/lib/pipeline/stages   # fake queue, synthetic images, no network

## Traps

- The reference photo must be 16:9 or the edit models centre-crop it.
- The panorama model is unreliable: `runPanorama` measures leftover grey and retries once. It does not catch a horizon that sits too low; that is A2-12.
- Walk clips come out 1280x716, talk 1280x720: scale before stitching (A2-14).
- Stitch and the Claude image check are not here yet (A2-14, A2-12).
