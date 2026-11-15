# Agent 4 notebook: Time Machine

Only Agent 4 writes here. Rules: `MASTER.md` section 8.5. Task details: `MASTER.md` section 11.
Questions and requests to other agents go on `BOARD.md`, not here.

## Your human's tasks (2026-11-15 02:05)

Your human's own list is section 4 of `HUMAN_TASKS.md` (plus "Everyone"). When one of those blocks you, remind them by its number (for example 4.1) rather than asking again from scratch, and post each answer they give to `@team` on the board.

## From the human: priorities for Sunday (2026-11-15 01:50, read first)

Added by the human on Sun 15 Nov 2026 at 01:50, from `REMAINING_WORK.md` (tests, actions, Gantt) and `notebook/agent-4-panorama-plan.md` (the 360° view made once with fal and kept). Work top to bottom. Move each item into your Tasks list as you take it, log it, and leave this section in place. Freeze is assumed at 10:00, submission 12:00 (still unconfirmed).

**Main priority: the real 360° view of the past, generated once with fal and kept for ever.** Read
`notebook/agent-4-panorama-plan.md` first. Every generated file (scene, panorama, headshot, narration, clips) must
be saved by us the moment it exists, so no player and no visit ever pays fal for it again, and the 7-day fal
expiry never forces a regeneration. The human grants you two new paths for this: `src/lib/media/` and
`src/app/api/media/`, plus the new script `scripts/persist-media.ts`.

1. **A4-11** Media store: `src/lib/media/` with GridFS (Atlas) and folder backends, the `media_assets` ledger, `persistFromUrl`, `toFalUrl`, tests, README. Post the API to Agent 2 on the board as soon as the signatures are fixed, so A2-h can start.
2. **A4-14** Browser cache: `mediaCache.ts` (Cache Storage), prefetch of the landmark's other ready years, era snapshot in localStorage; wire into PanoramaView, ThenNowSlider, GuidePlayer and Avatar. No keys needed.
3. **A4-12** `GET /api/media/[mediaId]`: stream, `immutable` cache header, ETag, Range 206 (iOS needs it for audio and video).
4. **A4-13** `scripts/persist-media.ts`: copy existing eras' fal URLs into the store and rewrite the Era; run it on the dev databases (Queen's Tower 1893 already has real media there) before the 7 days run out.
5. **A4-15** First real panorama on an iPhone and an Android phone (T12, M1 gate) as soon as A2-a and a reference photo land: level horizon, no seam in front, landmark centred. Fix the viewer if not.
6. **A4-16** Time Machine on a real era (T15, M2/M3 gates): progress sheet ticks live, panorama appears, narration plays from `/api/media`, guide video when it exists.
7. **A4-b** Sources drawer: licence and author for period images from `data/ATTRIBUTION.md` (CC BY and CC BY-SA require it).
8. **A4-a** Fix whatever T7 to T9 (round 1 retest, Then/Now, Sources) and T15 turn up.
9. **A4-c** If T8 shows the iPhone switching to the earpiece after the mic, release the mic after each recording.
10. **A4-10** Phone pass and polish. Then stop at the 10:00 freeze. Stretch (A4-S1, A4-S2) only after M4.

## From the human: phone test round 1 and next steps (2026-11-14 23:35, read first)

Added by the human after the first run of `phone_test.md`. Device: iPhone, iOS 26.5.1, Safari. Android not tested yet. Move these into your Tasks and log as you take them. Leave this section in place.

**The key finding for everyone.** The chat test (Part 6) ran on your spike page, and the voice test (Part 2) ran with `NEXT_PUBLIC_USE_MOCKS=1`. The canned replies, the beep instead of a voice and the fixed transcript were mock behaviour, not bugs in the real routes. **The real chat, TTS and STT have not yet been seen working from a phone.** The fixes below go into the real app (`src/components/chat`, `src/components/time-machine`). Mirror them in the spike only where a retest needs it.

**Part 4, the 360° viewer spike: VIEW-1 to VIEW-10 all work.** The human's notes: the delay and smoothing are a bit strong, so reduce the anti-jitter; and the field of view is a bit wide, so narrow it a little.

**Part 5, the media spike:**

- MEDIA-1: `made walk_on`, `made talk` and `made walk_off` all came out as `video/mp4; codecs=avc1.42000a,mp4a.40.2`.
- MEDIA-3: `clip 1 talk playing, gap 20 ms`, `clip 2 walk_off playing, gap 21 ms`, then `all clips finished`. Pass.
- MEDIA-5: `secure context: true, MediaRecorder: true, audio type: audio/webm; codecs=opus`. **iOS 26.5.1 records WebM/Opus, not MP4.** The first recording was `4.0s, 92278 bytes`. **Bug:** later recordings sometimes come out at 5 bytes. It did not happen after a refresh.
- MEDIA-6: **Bug:** the recording plays sound only the second time play is tapped.
- MEDIA-7 works, and the human said MEDIA-6 is otherwise "good". MEDIA-9: `beep 1 (new element): played` and `beep 2 (unlocked element): played`, so delayed reply audio works on this iPhone.
- MEDIA-2, MEDIA-4 and MEDIA-8 were not reported.

**Part 6, the chat spike (Edith).** The human's list, in their words:

1. Edith has no profile picture.
2. Speaking into the mic does not recognise what was said; it sends a sample message.
3. Edith does not give real AI replies; they come from a set of sample replies.
4. Make it play music; give it more ambience for the time.
5. When she speaks it is just a bleep.
6. On reset, make her send the first message again: short typing dots, then the message.
7. Pressing voice on or off plays a sound that is not nice. Make it a proper mic-on or mic-off sound.
8. When reloading, the chat stays.

Items 1, 2, 3 and 5 are what the spike does by design (initials avatar, canned STT, canned replies, beep for TTS). The human expects the real thing, so the job is to make sure the real chat does it, and to put it in front of them.

Next, in order:

1. **360° view (`PanoramaView.tsx`).** Change the gyroscope plugin's `moveMode: 'smooth'` to `'fast'`, or a lighter smoothing if PSV 5.15 has a setting for it (check the plugin's options). Narrow the view by raising `DEFAULT_ZOOM_LVL` from 30 to about 45, and tune it on a phone. Make the same change in the spike so the human can retest VIEW-4 like for like.
2. **Recorder (`recorder.ts`): the 5-byte recordings.** The likely cause is that the mic stream stays open between presses and iOS ends or mutes the track. Before `start()`, check that every audio track is `readyState === 'live'` and not muted, and reopen `getUserMedia` if not. Start with a timeslice (for example 250 ms) so data flushes as it goes. A blob under about 1 KB is never sent: show "Didn't catch that, hold the mic again". Agent 2 will also answer `400 empty_recording`. Add `audio/webm;codecs=opus` from iOS 26 to your type table, named `voice.webm`.
3. **Audio that only plays on the second tap.** After setting `src` on an audio element, call `load()` before `play()`. Await `play()` and retry once if it fails. Check the reply player in `ChatScreen` too, or the first spoken reply may be silent.
4. **The voice on/off sound (item 7).** The unlock tone is audible and harsh. Replace it with two short, soft earcons: "mic on" is two rising notes of about 80 ms each, faded in and out so it does not click; "mic off" is the same falling. Play them inside the tap so they still unlock iOS. Use them for hold-to-talk start and stop too, if that fits.
5. **Reset (item 6).** After ↺, clear the thread, show the typing dots for about 1 s, then the greeting arrives as a new bubble, read aloud if voice is on.
6. **Profile picture (item 1).** Check that the real header shows `guide.headshotUrl` when there is one (the mock hero era has `MOCK_HEADSHOT_URL`). Keep polling the era while its headshot stage runs, so the picture appears without a reload. If it is quick, make the fallback a period silhouette rather than initials.
7. **Ambience (item 4, new).** A quiet period loop under the chat, and under the Time Machine if it fits. Agent 2 is making `public/audio/ambience/<bucket>.mp3` with fal, with buckets `1850-1899`, `1900-1945`, `1946-1979` and `1980-now`; pick the bucket from the era's year. Start it on the first tap (iOS), loop it, keep it low (about 0.15 volume), and drop it to about 0.05 while the guide speaks (TTS reply, narration or talk clip). Add a mute toggle saved per device. Build against a placeholder until Agent 2's files land.
8. **Real voice and replies (items 2, 3 and 5).** With mocks off and a real era (Agents 1 and 2 are making Queen's Tower 1893 real), test the whole path: hold to talk, `/api/voice/stt`, your own words appear as the player's bubble, a streamed DeepSeek reply, then TTS in the guide's voice. On an empty transcript show "Didn't catch that" rather than sending. A phone needs the deploy (A1-12).
9. **Item 8.** Keeping history across a reload is CHAT-5's pass mark, and the human listed it without asking for a change. Keep it unless they say otherwise on the board.

Then A4-10, the phone pass.

## Current state

Rewrite this block before you stop, so a fresh session can continue from it alone.

- Last updated: 2026-11-15 02:10
- Working on: nothing in progress. Sunday priorities 1 to 4 (A4-11, A4-14, A4-12, A4-13) are done and pushed. Real Queen's Tower 1893 media is copied into GridFS in chronodex_dev_agent2 (Eras not rewritten yet).
- Next (Sunday list): rerun `scripts/persist-media.ts` without `--copy-only` after Agent 2's A2-h; A4-15 real panorama on two phones (needs a human and a server on a database with real media); A4-16; A4-a, A4-c, A4-10. Older: (1) the real voice path (item 8, PHONE_TEST.md 5.10 and 5.11) now belongs to Agent 2 by the human's call; fix any screen-side bug they post. (2) Phone results for PHONE_TEST.md Test 5 (round 1 retest). (3) When Agent 2's `public/audio/ambience/*.mp3` land, check they replace the placeholder noise (no code change expected). (4) A4-10 phone polish.
- Blocked on: keys or the deploy for the real voice path; a human with a phone for Test 5.
- Board read up to: my own timekeeping post at the bottom (origin/main fetched 00:21, nothing new for Agent 4).
- Standing instruction from the human (20:25, repeated 2026-11-15 00:00): commit and push to main without asking each time; do not stop per task; stop only for a merge conflict, a failing check, or a real wall. Never force-push.
- Tooling trap: on this machine (Node 26.13.1) `vitest run` fails every file with "Cannot read properties of undefined (reading 'config')" under the default pool; `npx vitest run --pool=vmThreads` passes. Typecheck and lint are fine. Reported to Agent 1 on the board.

## Tasks

- [x] A4-01 360° viewer spike on a real phone (VIEW-1 to VIEW-10 pass on iPhone, iOS 26.5.1, phone test round 1)
- [x] A4-02 Time Machine screen and year bar (desktop, mock mode; phone check asked in PHONE_TEST.md Test 4)
- [x] A4-03 360° view component (desktop, mock mode; phone check asked in PHONE_TEST.md Test 4)
- [x] A4-04 Guide player: clips in order, narration fallback, captions (desktop, mock mode; phone check asked in PHONE_TEST.md Test 4)
- [x] A4-05 Progress sheet (desktop, mock mode; phone check asked in PHONE_TEST.md Test 4)
- [x] A4-06 Then/now slider (desktop, mock mode; phone check still to ask)
- [x] A4-07 Chat screen (desktop, mock mode; phone check asked in PHONE_TEST.md Test 4)
- [ ] A4-08 Voice in and out (screens call the real routes; recorder, playback and cues fixed after phone round 1; real path not yet seen, PHONE_TEST.md 5.10)
- [x] A4-09 Sources drawer and next-step prompts (desktop, mock mode; phone check still to ask)
- [x] R1-1 Gyro smoothing 'fast', zoom 45 (app and spike)
- [x] R1-2 Recorder: reopen a dead or muted mic, 250 ms timeslice, never send under 1 KB
- [x] R1-3 Audio: load() before play(), retry once (chat replies; spike recording playback)
- [x] R1-4 Soft mic on/off earcons for the voice switch and hold-to-talk
- [x] R1-5 Reset: typing dots, then the greeting (read aloud if voice is on)
- [x] R1-6 Headshot: poll while the era's job runs; period silhouette fallback
- [x] R1-7 Period ambience with ducking and a saved mute (placeholder noise until Agent 2's loops land)
- [ ] R1-8 Real voice and replies on a phone: handed to Agent 2 by the human (board ASK, 2026-11-15; first posted to Agent 1, then corrected)
- [x] A4-11 Media store `src/lib/media/` (GridFS + folder + memory backends, ledger, persistFromUrl, toFalUrl; GridFS checked on Atlas)
- [x] A4-12 `GET /api/media/[mediaId]` (immutable, ETag, Range 206, 304, HEAD)
- [x] A4-13 `scripts/persist-media.ts` (copy-only run done on chronodex_dev_agent2; Era rewrite waits for A2-h)
- [x] A4-14 Browser media cache, year prefetch, era snapshot
- [ ] A4-15 First real panorama on two phones
- [ ] A4-16 Time Machine on a real era
- [x] A4-b Picture credits in the Sources drawer and Then/Now (GET /api/media/credits/[eraId])
- [x] A4-r2-1 Ambience: real two-layer loops, quieter in chat, silent while recording and while a reply speaks
- [ ] A4-r2-2 Switch the phone server to chronodex now (Agent 6's 8 demo eras), reference photo in public/reference
- [ ] A4-r2-8 Cache /demo/ files in the browser
- [ ] A4-r2-9 WAV narration and replies on iOS (Gemini voices)
- [ ] A4-r2-3 Then/Now check after Agent 2 regenerates the scene from the reference photo
- [x] A4-r2-4 Map zoom-fade polish (Agent 3's handoff): tiles kept loading while zooming, bigger cache
- [ ] A4-r2-5 Real guide video on a phone
- [ ] A4-r2-6 Voice input on the real chat, second phone
- [ ] A4-10 Phone pass and polish (A4-r2-7 Android)
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

### 2026-11-14 20:30, real API check with mocks off, small fixes
- Did: pushed 58d120a and 4382e09 to main (fast-forward, no conflict). Ran both screens with `NEXT_PUBLIC_USE_MOCKS=0` against Agent 1's routes on the in-memory store (no keys, so no spend). Time Machine: the hero era loads from /api, a missing year sends one POST generate and then polls every 3 s. Chat: /api/chat with no DeepSeek key ends with an error event, shown as a notice, no hang. Fixed three things this showed: (1) `queueNote` in ProgressSheet: a queued job says "Waiting in line for the studio", and after 60 s that the studio may be offline, because with no worker a job stays queued for ever and "0/5" looked frozen; (2) the in-progress year marker is a pulsing ink dot, because the gold one vanished on the selected gold chip; (3) `failureNotice` in chat/notice.ts stops "Try asking again in a moment. Try again." Added rows 4.7 to 4.10 to PHONE_TEST.md Test 4.
- Decided, and why: the queue note says "studio" not "worker", in the game's words; it does not offer a retry, since the job is already queued and generate would return the same job.
- Measured or verified: `npm run check` passes (210 tests). All three fixes seen in the browser pane at 375x812 with mocks off.
- Delegated to Haiku, and whether it was kept: nothing.
- Problems: none new. A4-08 still waits on Agent 2.
- Next: see Current state.

### 2026-11-14 20:31, outside my tasks: Agent 5 brief, phone tunnel
- Did: at the human's request, put the app online for a phone test (production build in mock mode on port 3105, SSH tunnel through localhost.run; no keys in .env.local, so nothing can spend). Then, also at the human's request, wrote `AGENT5.md`: a brief for a fifth agent that finds, acquires and validates the pipeline's input data, with output formats matched to the contracts and to the Historian's research-notes format, a validator spec, a source catalogue, a work loop and ready prompts. Created `notebook/agent-5.md` and `skills/haiku-delegate/agent-5.md`, and added Agent 5 to the skill's index.
- Decided, and why: Agent 5 writes data files only; its data reaches the app through small ASKs to Agents 1 and 2 (seed reads data/landmarks, Historian accepts pre-made notes), so no frozen contract changes. I did not edit MASTER.md or CLAUDE.md (human-owned); the human was told what to add.
- Problems: AGENT5.md section 7's API parameters were written from memory and not run; the brief tells Agent 5 to verify them first.
- Next: unchanged (A4-08 when the voice routes land; phone results).

### 2026-11-15 00:25, phone test round 1: items 1 to 7
- Did: (1) PanoramaView: gyroscope `moveMode` 'fast' (PSV 5.15 has only 'smooth', which eases at speed 3, and 'fast' at 10; no finer setting), `DEFAULT_ZOOM_LVL` 30 to 45; same in the spike. (2) `recorder.ts`: `streamIsUsable` checks every audio track is live, unmuted and enabled before each press and reopens the mic if not; `start(250)`; a blob under `MIN_RECORDING_BYTES` (1 KB) closes the stream and the chat shows "Didn't catch that" instead of sending. Copied into the spike's recorder unchanged; media page logs a near-empty recording and calls `load()` after setting the playback src (MEDIA-6). (3) New `chat/audio.ts`: `playUrl` (pause, src, load, play, retry once after canplay) for TTS replies. (4) `tone.ts`: `notesWav`, `earconWav('on'|'off')` (E5 to A5 rising or falling, 80 ms notes, 20 ms gap, 15 ms raised-cosine fades, peak 0.22) and `silenceWav`; `playCue` plays them on the shared reply element, so every tap still unlocks it for iOS. Voice switch: rising/falling; mic press: rising, release: falling (played after the recorder has stopped); Send and listen: silence. (5) Reset clears, shows the dots for `GREETING_DELAY_MS` (1 s), then the greeting, read aloud if voice is on. (6) The chat polls the era while a job runs and the guide or headshot is missing ("Your guide is on the way" before the guide exists); Avatar falls back to a 16x16 pixel silhouette in a bowler hat. (7) `ambience.ts` (bucket by year, gain 0.15 / 0.05 ducked / 0 muted, a brown-noise placeholder loop with a crossfaded seam) and `useAmbience.ts` (Web Audio buffer source through a gain node, unlocked and resumed on document taps, mute in localStorage through useSyncExternalStore), `AmbienceToggle.tsx` ♪ in both headers. GuidePlayer reports `onPlayingChange` so the Time Machine ducks during narration or the clips; the chat ducks while a reply is spoken. PHONE_TEST.md Test 5 lists the retest.
- Decided, and why: Web Audio, not `<audio loop>`, for ambience, because iOS ignores `HTMLMediaElement.volume` (no quiet level, no duck) and element loops gap. Ambience follows the year bar's selected year, not the loaded era, so it does not stop and restart while a year loads. The mic-on earcon plays at press; on later presses recording starts at once, so it may be faintly recorded. Echo cancellation is on and Scribe ignores tones, so I did not delay recording (that would clip first words). Placeholder noise rather than silence so the duck and mute can be tested before Agent 2's files land.
- Measured or verified: typecheck and lint pass; `vitest --pool=vmThreads` 356 tests pass (new: earcon envelope, pitch direction, length, silence; hasAudio; streamIsUsable; ambience buckets, gain, placeholder length and seam). Headless Chrome at 375x812 against the dev server in mock mode, with a fake mic: voice switch plays the cue and starts ambience at 0.15; mic hold runs `MediaRecorder.start(250)` with `audio/webm;codecs=opus` and sends the mock transcript; reset shows the dots then the greeting; the ♪ switch sets gain 0 and persists into the Time Machine; Meet Albert ducks to 0.05 and Skip restores 0.15; the ambience file 404s and the placeholder plays. Nothing seen on a phone yet.
- Delegated to Haiku, and whether it was kept: nothing; each piece needed the screen code in view.
- Problems: default vitest pool broken on this machine (see Current state). A dev server from this repo was already on port 3000, so the check used it. Item 8 could not run: no keys here.
- Next: see Current state.

### 2026-11-15 02:05, A4-11 and A4-12: media store and /api/media
- Did: `src/lib/media/`: content-addressed store (id = first 32 hex of SHA-256), three backends (GridFS bucket `media` + ledger `media_assets` when MONGODB_URI is set; folder `MEDIA_DIR`, default `.media/`, which writes its own `.gitignore`; memory for tests). `persistFromUrl` (fal/http download once, `/public` path from disk, own URL passthrough, dedupe by source URL and by bytes), `persistBytes`, `toFalUrl` (reuses the recorded fal copy while over a day is left, else re-uploads free and records it; stores and uploads `/reference/*.jpg` once; refuses SVG), `openMedia`. `GET`/`HEAD /api/media/[mediaId]`: `Cache-Control: public, max-age=31536000, immutable`, ETag = id, Range 206, 416, 304. README.
- Decided, and why: content hash as id, so dedupe is free and the URL can be cached for ever. Own MongoClient in gridfs.ts because src/lib/db exposes collections, not the Db. Assumed fal lifetime 6 days (fal says at least 7) and a re-upload under 1 day left. Old eras get `falUrlExpiresAt: null` so toFalUrl never trusts a guess.
- Measured or verified: 21 new tests (store, folder backend, range, etag, route). GridFS backend run once on real Atlas in a throwaway database `chronodex_media_check_agent4` (put twice, get, find by source, whole and range read, fal URL update), then dropped. Full suite 473 pass with `--pool=vmThreads`; typecheck and lint pass.
- Delegated to Haiku, and whether it was kept: nothing.
- Problems: the mongodb driver types GridFS ids as ObjectId; cast, any _id works.
- Next: A4-14 browser cache, then A4-13 persist script.

### 2026-11-15 02:10, A4-14 and A4-13: browser cache, persist script
- Did: A4-14 `mediaCache.ts` (Cache Storage `chronodex-media-v1` for `/api/media` and fal files, object URLs, shared in-flight downloads, `prefetchMedia`, `useCachedMediaUrl`) wired into TimeMachineScreen (panorama, scene), ThenNowSlider, GuidePlayer (narration only; clips stream) and Avatar. `eraSnapshot.ts`: the last ready, job-free era per id in localStorage, shown until the server answers. Other ready years prefetched 1.5 s after the year list. A4-13 `src/lib/media/eraMedia.ts` (which URLs need persisting, the Era patch) and `scripts/persist-media.ts` (`--dry-run`, `--only`, `--no-video`, `--copy-only`; re-reads each era before patching).
- Decided, and why: generation only ever starts from the server's era (`liveEra`), never a snapshot, so a stale copy cannot spend credits. Video clips stay out of Cache Storage: tens of MB and they need Range; the route's immutable header covers them. Added `--copy-only` because rewriting Eras to `/api/media` before A2-h would make a later stage hand a relative URL to fal.
- Measured or verified: browser pane against the dev server (no keys, memory DB, folder store): planted a snapshot whose panorama is an `/api/media` file; first visit fetched it once and Cache Storage held it; reload made no `/api/media` request; the panorama rendered; no console errors. Route over HTTP: 206 with `bytes 0-3/551993` (JPEG magic), HEAD immutable + ETag. Persist script: dry runs on chronodex, chronodex_dev_alex (nothing to copy) and chronodex_dev_agent2; then `--copy-only` on chronodex_dev_agent2 copied Queen's Tower 1893 scene, panorama, narration and headshot (3.2 MB) into GridFS. Full suite 481 pass with `--pool=vmThreads`.
- Delegated to Haiku, and whether it was kept: nothing.
- Problems: none.
- Next: once A2-h lands, rerun `persist-media.ts` without `--copy-only` on each database to rewrite the Eras (no downloads, files already stored). Then A4-15 with a phone.

### 2026-11-15 02:15, A4-b: picture credits
- Did: `src/lib/media/credits.ts` reads the Archivist's `data/landmarks/<id>.json` referencePhoto (only a Commons stand-in, not H1) and `data/eras/<eraId>.json` referenceImages, with licence deed links; `GET /api/media/credits/[eraId]` (5 min cache); `usePictureCredits` hook. The Sources drawer has a "Pictures" section (title linked to the file page, author, licence linked to its deed, and whether it is shown or only guided the AI); the Then/Now slider shows "Present-day photo: David Richfield, CC BY-SA 4.0" under the pictures.
- Decided, and why: read the JSON, not the generated ATTRIBUTION.md, so a format change in the markdown cannot break it; the route lives under /api/media, the only API path granted to me. Credits fail silently.
- Measured or verified: 3 new tests (incl. the real Queen's Tower 1893 delivery). Browser pane, dev server, /time/queens-tower: the drawer lists the CC BY-SA photo, the CC0 Rijksmuseum photograph and the public-domain postcard; Then/Now shows the photo credit. Typecheck and lint pass.
- Delegated to Haiku, and whether it was kept: nothing.
- Problems: none.
- Next: A4-15 and A4-16 need a human with a phone and a server on a database with real media.

### 2026-11-15 02:45, A4-03: damped motion in the 360° view
- Did: the human found the view jittery on the phone. `gyroDamping.ts`: per-angle dead zone (0.25°, roll 0.8°) then exponential smoothing (0.25 a frame), camera speed 5 (roll 8), between PSV's 'smooth' 3 and 'fast' 10. `attachGyroDamping` wraps the plugin instance's `__onBeforeRender` and swaps `dynamics.position.goto` and `roll.goto` for filtered ones during that call only; the filter resets when motion is switched on. 8 tests.
- Decided, and why: wrap rather than fork the plugin, so a PSV upgrade that renames the handler just falls back to undamped motion. Not mirrored into the spike: the human now tests the real app.
- Measured or verified: unit tests only. Tremor needs a real phone (PHONE_TEST.md 6.3).
- Delegated to Haiku, and whether it was kept: nothing.
- Problems: found while answering the human: no guide video exists for any era. The video tier is off and Agent 2's talk-model and voice picks (their H-A) are still open. Also Agent 2's ambience files are `<bucket>.m4a` plus `<bucket>-street.mp3`, while my player asks for `<bucket>.mp3`, so the placeholder noise still plays. Next for me.
- Next: fix the ambience file names (two layers); phone results for Test 6.

### 2026-11-15 03:05, A4-04: guide video preview (stand-in)
- Did: the human asked for a sample video with the narration audio and captions until the real guide video exists. `GuideStandIn.tsx`: over the era's scene, the guide's headshot (Avatar, so the silhouette when missing) with a name plate walks on (1.8 s, step bob), pulses while the real narration plays with GuidePlayer's captions, walks off, then the chat is offered. Labelled "Preview · guide video coming". Web Animations API, fades only under reduced motion. GuidePlayer narration mode drives it; the tap plays and pauses the narration to unlock it for iOS, and it resumes when the guide has arrived.
- Decided, and why: no sample clips exist on this machine (Agent 2's spike clips were made elsewhere) and a real clip costs about $4, so the preview is built from what the core tier already paid for. When `guideVideo` exists, the real clips play instead with no change.
- Measured or verified: production build through the tunnel on chronodex_dev_agent2, 375x812: tap, portrait on stage (elementFromPoint), captions follow the narration, after about 40 s the stand-in left and "Chat with Albert" appeared, no errors. The pane's phone-size screenshots are cropped, so layout was checked by measurement. Not yet heard on an iPhone (PHONE_TEST 6.4).
- Delegated to Haiku, and whether it was kept: nothing.
- Problems: none.
- Next: ambience file names; phone results.

### 2026-11-15 03:10, phone tests 1 to 6 results, REMAINING_WORK_2.md
- Did: the human sent the iPhone results; recorded in `REMAINING_WORK_2.md` section 2. Wrote that file at the human's request: tasks for Agents 1 to 4 and the humans, plus a new Gantt from 03:00. My tasks are A4-r2-1 to A4-r2-7 above.
- Results: 6.1 to 6.3, 6.6 to 6.9 pass; 6.4 works but the ambience is too loud in the chat; 6.5 fails (Then/Now pictures are different viewpoints: the scene predates the reference photo); 5.1 fixed by the damping; 5.4 ambience too loud, it gets into the recording; test 2 and test 3 pass (voice input failed once, probably the phone); test 1 pass.
- Next: A4-r2-1.

### 2026-11-15 03:35, A4-r2-1: ambience fixed (phone tests 5.4 and 6.4)
- Did: the player asked for `<bucket>.mp3`, which does not exist, so every phone heard the brown-noise placeholder at near full scale. It now plays Agent 2's two layers, `<bucket>.m4a` music and `<bucket>-street.mp3` street, each through its own gain under one master, each crossfaded end into start (`crossfadeLoop`, 1.5 s) so the music has no join. Levels by scene and mode (`AMBIENCE_LEVELS`): Time Machine 0.12 normal, 0.03 while the guide speaks; chat 0.05 normal, 0 while a reply is spoken; 0 everywhere while the mic records (fade time constant 30 ms). Composer reports `onMicOpenChange` at press, before the mic opens. A missing street file falls back to the placeholder, a missing music file stays silent.
- Measured: decoded in Chrome, 1850-1899 music 45 s stereo RMS 0.127, street 30 s stereo RMS 0.011, so `LAYER_MIX` lifts the street (music 0.6, street 2.5). Both files load 200 on the dev server. 521 tests pass with `--pool=vmThreads`; typecheck and lint pass. Not heard on a phone yet: PHONE_TEST 6.10 to 6.13.
- Next: phone retest; then A4-r2-4 map fade polish while Agent 2 regenerates the scene (A4-r2-3).

### 2026-11-15 03:50, A4-r2-4: map zoom polish (Agent 3's handoff)
- Did: in MapScreen.tsx (Agent 3's file, edit granted in their 05:30-stamped HANDOFF post), `cancelPendingTileRequestsWhileZooming: false` and `maxTileCacheSize: 400`, so the destination zoom's tiles keep loading during a pinch and zooming back reuses cached tiles instead of loading and popping again.
- Decided, and why: MapLibre has no fade for vector tiles (`fadeDuration` is for labels only), and the water and park outlines swapping at whole zoom levels is the tiles' own generalisation; a real cross-fade would need two copies of the source at offset zooms, which is too risky for the time left. Left as is; the human called the rest "otherwise perfect".
- Measured or verified: typecheck and lint pass; the map renders in the dev preview with all markers. Smoothness needs a phone.
- Next: A4-r2-3 when Agent 2 regenerates the scene; A4-r2-2 when Agent 1 says chronodex is ready.

### 2026-11-15 04:05, plan update and delegation
- Did: at the human's request pulled main (Agent 6's 8-era demo set in chronodex, A2-h done, Queen's Tower 1893 regenerated, real capture and greyed-out landmarks, final voices, $14.97 credit, guide video on hold) and updated `REMAINING_WORK_2.md`: statuses, new tasks for Agents 1 to 6 and the humans, a Gantt from 04:00. Added a "round 2 tasks" pointer section to the top of notebooks 1, 2, 3, 5 and 6, as the human did before.
- Next: A4-r2-2, switch the phone server to chronodex.
