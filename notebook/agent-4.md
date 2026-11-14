# Agent 4 notebook: Time Machine

Only Agent 4 writes here. Rules: `MASTER.md` section 8.5. Task details: `MASTER.md` section 11.
Questions and requests to other agents go on `BOARD.md`, not here.

## Current state

Rewrite this block before you stop, so a fresh session can continue from it alone.

- Last updated: 2026-11-14 20:20
- Working on: nothing in progress. Restyle of the Time Machine and chat in Agent 3's game look is done in the working tree (not committed). A4-06 and A4-09 are committed as 58d120a on branch claude/agent-4-task-review-2470e2 (based on main at a505547); nothing pushed.
- Next: A4-08 needs Agent 2's real /api/voice routes to finish. Phone results from `spikes/agent-4/PHONE_TEST.md` Tests 1 to 4 (add the slider, drawer and new look to Test 4). Switch mocks off once real eras exist (M2). A4-10 phone polish after that.
- Blocked on: Agent 2's voice routes (A4-08), phone results from a human, commit approval.
- Board read up to: 2026-11-14 19:55 @team review post (main at a505547).
- Waiting for commit approval: the restyle (pixel.ts, 14 component files, two READMEs, this page, BOARD.md).

## Tasks

- [ ] A4-01 360° viewer spike on a real phone
- [x] A4-02 Time Machine screen and year bar (desktop, mock mode; phone check asked in PHONE_TEST.md Test 4)
- [x] A4-03 360° view component (desktop, mock mode; phone check asked in PHONE_TEST.md Test 4)
- [x] A4-04 Guide player: clips in order, narration fallback, captions (desktop, mock mode; phone check asked in PHONE_TEST.md Test 4)
- [x] A4-05 Progress sheet (desktop, mock mode; phone check asked in PHONE_TEST.md Test 4)
- [x] A4-06 Then/now slider (desktop, mock mode; phone check still to ask)
- [x] A4-07 Chat screen (desktop, mock mode; phone check asked in PHONE_TEST.md Test 4)
- [ ] A4-08 Voice in and out
- [x] A4-09 Sources drawer and next-step prompts (desktop, mock mode; phone check still to ask)
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

### 2026-11-14 16:31, A4-07 and A4-08: chat screen spike
- Did: `chat.html` in the spike package (React 19.3.1, Tailwind 4.3.5, @vitejs/plugin-react 6.3.0): ChatScreen, ChatHeader, MessageBubble, TypingIndicator, Composer (text, or hold-to-talk mic when empty), Avatar with an initials fallback while `headshotUrl` is null. `api.ts` streams POST /api/chat through the SSE parser and wraps TTS and STT; its mock emits SSE in random-sized chunks so the real parsing path runs. A fixture guide (fictional, Queen's Tower 1893). Added PHONE_TEST.md Test 3.
- Decided, and why: replies are spoken through one `<audio>` element unlocked on the send tap or the voice toggle (iOS, see media test 2C). Text input is 16 px so iOS does not zoom. History is saved after each player message and each reply, so a reload mid-reply keeps the question. A stream that ends without `done` keeps the partial text. Read-aloud is a per-device setting.
- Measured or verified: `npm run check` passes (44 tests). In the browser pane at 375x812: greeting, typing dots, word-by-word streaming, history kept across a reload, the mock error message, read-aloud playing after a reply and the setting saved. Mic and iOS not checked.
- Delegated to Haiku, and whether it was kept: `src/chat/sse.ts` + 19 tests and `src/chat/history.ts` + 14 tests, two delegates in parallel. Read both files in full; both correct and documented; kept unchanged. Agent 1's client turned out to have its own SSE parser, so `sse.ts` stays in the spike only.
- Problems: the error notice doubled a full stop; fixed. The pane drops viewport emulation mid-batch, so some checks were done by page text.
- Next: rebase on M0, then A4-02 and A4-07 in `src/`.

### 2026-11-14 16:50, A4-02 to A4-05 and A4-07: Time Machine and chat in the app
- Did: committed the chat spike on agent-4 (human said commit to a branch, not main) and rebased agent-4 on M0 (a7880a4) with no conflict. Built `src/components/time-machine/` (TimeMachineScreen, PanoramaView, GuidePlayer, ProgressSheet, YearBar, plus panoData and segmentPlayer lifted from the spikes) and `src/components/chat/` (ChatScreen on `@/lib/client`, Composer, header, bubbles, avatar, history, recorder, tone). Replaced both placeholder pages with thin client pages. README in each folder. PHONE_TEST.md Test 4.
- Decided, and why: a missing era asks for the core tier once per visit, then for the video tier once; the server's VIDEO_GENERATION switch decides whether video is spent, and a refused video tier is silent because the narration stands in. Both screens are `fixed inset-0 z-40` over the shell (immersive, own back link). The progress sheet collapses to a pill for the video tier, which runs for minutes while the player already looks around. Guide clips letterbox (object-contain) so a portrait phone never crops the guide. Used Agent 1's client SSE parser; the spike's stays in the spike.
- Measured or verified: `npm run check` passes (typecheck, lint with the jsdoc rule, 105 tests). Mock mode in the browser pane at 375x812: hero era 1893 shows the panorama, "Meet Albert" plays walk_on, talk with captions, walk_off, then "Chat with Albert"; 1962 and Royal Albert Hall 1871 generate from missing with the live sheet (stage, model, seconds), then the video tier starts on its own; chat loads the guide, streams a reply, saves history, back link goes to /time/<landmark>; a chat for an era with no guide says so.
- Delegated to Haiku, and whether it was kept: `captions.ts` + 17 tests. Kept after one fix: it split sentences with a lookbehind regex, which Safari before iOS 16.4 cannot parse; replaced with a mark-and-split.
- Problems: PanoramaView's box had both `relative` and `absolute`, so the viewer was 0 px tall; the caller now sets position. The React compiler lint forbids setState in an effect; per-era resets moved to the year tap. The browser pane was hidden, so long checks ran as short page scripts.
- Next: A4-06, A4-09.
- Timekeeping: my 16:45 board post (A4-07 spike) was stamped ahead of the clock; it was committed at 16:31. Corrected in the next board post. Times on this page now come from `date` and git.

### 2026-11-14 18:10, progress report and move to a new worktree
- Did: wrote `notebook/agent-4-report.md` (timeline of this agent's work, whole-project status from main at db4e25e). Checked nothing was lost after the human's `git pull`: it fast-forwarded local main only. The session moved to worktree `elated-bohr-7cf6f2`, which may not write to `agent-4-work-f800bd`, so the uncommitted work was copied here on top of the agent-4 commits (byte-identical) and committed here.
- Checked: main since a7880a4 touches none of Agent 4's files, nor `src/lib/client`, `src/lib/contracts`, the layout or package.json, so a later rebase should be clean.
- Problems: a script edited the old worktree's notebook and board (timestamp fixes) before the worktree guard stopped file writes there. Those edits are the ones carried into this commit. The old worktree still holds the same changes uncommitted.
- Next: the human decides when to bring this onto main. Then try Agent 2's real panorama, A4-06, A4-09.

### 2026-11-14 19:55, A4-06: then/now slider
- Did: `ThenNowSlider.tsx`, a full-screen overlay inside the Time Machine: the reference photo underneath, the era scene on top clipped with `clip-path: inset()` to the left of a divider. Drag anywhere on the image (pointer capture), or focus the divider (role slider) and use arrows, Home and End. Pure maths in `thenNow.ts` with 8 unit tests. A "Then / Now" button in the header appears when the era has `sceneImageUrl` and the landmark has `referencePhotoUrl`; changing year closes it.
- Decided, and why: clip-path rather than resizing the top image's width, so the two images never drift out of alignment; both are `object-cover` in one 16:9 box (D-007, both images are 16:9 by design). Then on the left, now on the right, like a timeline. An overlay rather than a mode of the panorama: the panorama is 360° and has no fixed framing to compare against.
- Measured or verified: `npm run check` passes (189 tests). Mock mode in the browser pane at 375x812, /time/queens-tower 1893: button shows, overlay opens with both mock images and labels, a drag to x=150 put the divider at 20 %, End moved it to 100 %.
- Delegated to Haiku, and whether it was kept: nothing; too small to be worth a hand-off.
- Problems: the jsdoc lint wants each destructured prop as its own @param; added.
- Next: A4-09.

### 2026-11-14 20:00, A4-09: sources drawer and next-step prompts
- Did: `SourcesDrawer.tsx`, a bottom sheet opened from a "Sources" button in the Time Machine header (shown when the era has a summary, a fact or a source): title, year, summary, fun facts, sources with their host, and the AI reconstruction and fictional-guide note (assumption A9). `sources.ts` + 7 tests. In the chat, `NextStopCard.tsx` appears once the player has asked something and the guide has answered: "Next stop: <landmark> is 200 m north-west from here", linking to the map, or "Every badge collected" linking to the Dex. `nextStop.ts` + 7 tests. The after-video prompt to chat already existed from A4-04.
- Decided, and why: source links pass through `safeSourceUrl` (http and https only) and open with noopener, because the Historian takes URLs from web search. The next stop is measured from the current landmark's photo spot, not live GPS: the chat never asks for location and the player has usually just captured this landmark. Reused Agent 3's `nearestLandmark` and `directionHint` (imported, not edited) so the chat and the map hint agree. The card fails silently: a missing suggestion is not worth an error in a chat thread.
- Measured or verified: `npm run check` passes (202 tests). Mock mode at 375x812: the drawer lists the hero era's summary, three facts and two Wikipedia links with target _blank and rel noopener noreferrer; a mock chat reply was followed by "Huxley Building is 200 m north-west from here. Map ›".
- Delegated to Haiku, and whether it was kept: nothing; each piece was small and needed the screen code in view.
- Problems: Agent 3's global `h2` rule (pixel font, 1.7rem) is unlayered and beats Tailwind, so the drawer title uses the game's heading look. Fine for now; noted in the README. The browser pane's screenshots came back zoomed at phone size, so layout was checked with page scripts.
- Next: theme restyle, then A4-08 once the voice routes exist.

### 2026-11-14 20:20, theme: Time Machine and chat in the game look
- Did: answered Agent 3's 19:50 post. New `src/components/time-machine/pixel.ts`: class strings over Agent 3's CSS variables (pixel font, pixel frame, ink, paper, gold, brick, verdigris), plus their global `.btn` for primary buttons. Time Machine: ink background, gold pixel title, paper pixel buttons, year chips with square state markers (verdigris ready, gold pulsing in progress, brick failed, hollow missing), progress sheet and drawer as ink panels with a gold pixel outline, "Then / Now" shortened to "Then/Now" so the landmark name fits. Chat: ink header with the guide's name in gold pixel type, paper background, white guide bubbles, gold player bubbles, paper-shade composer with framed send and mic buttons, the next-stop card as a framed game card with the landmark sprite.
- Decided, and why: Tailwind utilities over Agent 3's variables rather than new global classes, because globals.css is Agent 3's and a palette change there should flow through. Chat bubbles keep rounded corners: the spec asks for a text-message look, and the pixel frame goes on the game elements around them. The Time Machine stays dark, since it sits over imagery.
- Measured or verified: `npm run check` passes (202 tests). Mock mode at 375x812: Queen's Tower 1893 header, panorama controls, "Meet Albert" button and year bar; the sources drawer; Royal Albert Hall 1871 progress sheet (its gold frame was clipped by the scrolling wrapper, fixed with 3 px padding); the chat thread with a reply and the next-stop card.
- Delegated to Haiku, and whether it was kept: nothing. The colour swap was a scripted replace I read back; the rest needed eyes on the screen.
- Problems: the first colour pass turned the send button's arrow paper-on-gold; caught and fixed before the check.
- Next: A4-08 when the voice routes land; phone pass.
