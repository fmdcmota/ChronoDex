# Demo video (Agent 2 spike)

Records the running app and assembles the 2-minute competition video. Never imported by `src/`. Script: `SCRIPT.md`.

## Pieces

- `cdp.mjs`: drives headless Chrome over the DevTools protocol at phone size (390x844 @2x) and records timestamped
  frames. Hides the dev overlay, the MOCK DATA tag and the spoof panel in the recording browser only.
- `scenes.mjs`: the scenes (`welcome map capture time chat`); `capture` also records `memory`, `time` also `guide`.
- `timeline.mjs`: sections, which slice of which recording, on-screen text, sound cues. Edit this to retime.
- `cards.mjs`: renders the backgrounds, phone bezel, Edith's lower third and the end card (app's pixel font).
- `make-earcons.mts`: the chat's real chimes from `src/components/chat/tone.ts`.
- `build.mjs`: frames to clips, clips into cards, the sound mix, `out/chronodex-demo.mp4`. No network, no spend.

## Run (repo root)

    npm install --prefix spikes/agent-2/demo-video          # ffmpeg-static, once
    # dev server on https://localhost:3000 (mocks on) for every scene but chat; chat needs real data:
    NEXT_PUBLIC_USE_MOCKS= NEXT_PUBLIC_DEV_TOOLS= npm run build
    MONGODB_DB=chronodex VIDEO_GENERATION=off NEXT_PUBLIC_USE_MOCKS= npx next start -p 3100
    cd spikes/agent-2/demo-video
    node scenes.mjs welcome map capture time
    DEMO_BASE=http://localhost:3100 node scenes.mjs chat    # one fal call: Edith's spoken reply, a few cents
    node --import tsx make-earcons.mts && node cards.mjs && node build.mjs [--vo voiceover.mp3]

Sound effects and the camera feed (`assets/`, `rah-camera.mjpeg`) are made with ffmpeg; commands in the notebook.

## Traps

- Git Bash rewrites arguments that start with `/` into Windows paths: pass routes without the leading slash.
- The screencast sends frames only when the screen changes; `build.mjs` holds each frame until the next.
- In the 360° view, drags go through CDP round trips, so six drags take about 20 s: the cut speeds the part up.
- Never run the chat scene against mocks: the mock reply is canned and its voice is a beep.
