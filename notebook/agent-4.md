# Agent 4 notebook: Time Machine

Only Agent 4 writes here. Rules: `MASTER.md` section 8.5. Task details: `MASTER.md` section 11.
Questions and requests to other agents go on `BOARD.md`, not here.

## Current state

Rewrite this block before you stop, so a fresh session can continue from it alone.

- Last updated: 2026-11-14 16:25
- Working on: waiting for M0. Spikes for A4-01 (360°), A4-04 (clip player) and A4-08 (mic, delayed reply audio) are built in `spikes/agent-4/` and checked on desktop.
- Next: a human runs `spikes/agent-4/PHONE_TEST.md` (Tests 1 and 2) on an iPhone and an Android phone. Tick A4-01 on a pass. When M0 lands on main: A4-02, lifting `panoData.ts` (A4-03), `media/segmentPlayer.ts` (A4-04) and `media/recorder.ts` (A4-08) into `src/components/`.
- Blocked on: M0 scaffold from Agent 1 (A4-02 onward). Phone results from a human.
- Board read up to: 2026-11-14 15:55 @agent-4 A4-01 post
- Waiting for commit approval: nothing. Media spike committed on branch agent-4, not pushed. (A4-01 spike is on main as 7de1d9b.)

## Tasks

- [ ] A4-01 360° viewer spike on a real phone
- [ ] A4-02 Time Machine screen and year bar
- [ ] A4-03 360° view component
- [ ] A4-04 Guide player: clips in order, narration fallback, captions
- [ ] A4-05 Progress sheet
- [ ] A4-06 Then/now slider
- [ ] A4-07 Chat screen
- [ ] A4-08 Voice in and out
- [ ] A4-09 Sources drawer and next-step prompts
- [ ] A4-10 Phone pass and polish
- [ ] A4-S1 Stretch: overlay on the live camera (after M4 only)
- [ ] A4-S2 Stretch: compass-aligned panorama (after M4 only)

## Log

Newest at the bottom. One entry per task or per session, in this shape:

    ### YYYY-MM-DD HH:MM, <task id>: <title>
    - Did:
    - Decided, and why:
    - Measured or verified:
    - Delegated to Haiku, and whether it was kept:
    - Problems:
    - Next:

### 2026-11-14 15:55, A4-01: 360° viewer spike
- Did: Vite + TypeScript spike in `spikes/agent-4/` with Photo Sphere Viewer 5.15.1 and `@photo-sphere-viewer/gyroscope-plugin` 5.15.1 (package names confirmed on npm, so the MASTER section 14 item about `@photo-sphere-viewer/core` is now verified). Synthetic labelled test panoramas drawn on a canvas: full 2:1 (vFov 180), 21:9 full turn (vFov 154), 21:9 half turn (vFov 77). `?src=&vfov=` loads any real image. "Enable motion" button starts the gyroscope from a tap for iOS. Reset button, "AI reconstruction" label, on-screen log.
- Decided, and why: `panoDataFor()` maps the `Panorama` contract to PSV's `panoData` assuming square pixels and a band centred on the horizon and the image centre. Only `vFovDeg` is needed; pixel size is read from the loaded image. Bands within 2 % of a full turn snap to 360°, because a rounded vFov (154 vs 154.29) otherwise leaves a seam. Pitch and, for partial bands, yaw are clamped in PSV's `before-rotate` event, which covers drag and gyroscope in one place. Pinned `three` to 0.185.1, PSV's peer version.
- Measured or verified: `npm run check` (tsc + 9 vitest tests) passes. Production build OK (one chunk over 500 kB, expected for three.js). In the desktop browser pane: full sphere renders with the horizon level and FRONT centred; the pitch clamp stops at the band top; the yaw clamp stops at the half-turn band's edge with no black. Not seen on a phone yet.
- Delegated to Haiku, and whether it was kept: nothing. The viewer and gyroscope are on the keep-for-yourself list.
- Problems: the browser pane does not trust the self-signed cert, so desktop checks use `HTTP=1`. Phones must accept the cert warning; if iOS refuses motion over a self-signed cert, use a tunnel or wait for the Vercel deploy (A1-12). Also: the haiku-delegate skill lives in `skills/`, not `.claude/skills/` as MASTER says.
- Next: phone check by a human, then A4-02 once M0 lands.

### 2026-11-14 16:25, A4-04 and A4-08 spikes, phone test sheet
- Did: wrote `spikes/agent-4/PHONE_TEST.md`, a step-by-step check sheet for the human (360° viewer and media page, what passes, what to report). Added `media.html` with three tests: (2A) `SegmentPlayer`, two stacked videos with the next clip preloaded underneath and swapped on `ended`; test clips are made in the browser from a canvas plus a tone with MediaRecorder, since there is no ffmpeg here and no downloads; `?clips=` takes real fal clips. (2B) `HoldToTalkRecorder`, MediaRecorder with pointer capture, picks webm/opus or audio/mp4, keeps the mic open between presses, drops presses under 400 ms. (2C) a beep 3 s after a tap, once from a new Audio element and once from an element unlocked by the tap, to show which pattern iOS allows for TTS replies.
- Decided, and why: two video elements rather than one with `src` swaps (one element blanks while loading). The standby element is primed inside the first tap, because iOS only allows sound on elements first played from a gesture. Chat replies will reuse one element unlocked on the send tap, for the same reason.
- Measured or verified: `npm run check` passes (11 tests). Desktop Chrome in the browser pane: the clips record as `video/mp4;codecs=avc1,opus` (the first as vp9 in mp4); gaps between clips measured 1 ms and 2 ms; both delayed beeps played (desktop does not block, as expected). Mic not tried on desktop. Nothing seen on a phone yet.
- Delegated to Haiku, and whether it was kept: nothing.
- Problems: `TaskStop` on an `npx vite` background job left the server process running; it had to be stopped by PID.
- Next: phone results, then M0.
