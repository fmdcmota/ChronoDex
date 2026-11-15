# Agent 3 notebook: Explorer

Only Agent 3 writes here. Rules: `MASTER.md` section 8.5. Task details: `MASTER.md` section 11.
Questions and requests to other agents go on `BOARD.md`, not here.

## From the human: phone test round 1 and next steps (2026-11-14 23:35, read first)

Added by the human after the first run of `phone_test.md`. Device: iPhone, iOS 26.5.1, Safari. Android not tested yet. Move these into your Tasks and log as you take them. Leave this section in place.

**The key finding for everyone.** The chat test (Part 6) ran on Agent 4's spike page, and the voice test (Part 2) ran with `NEXT_PUBLIC_USE_MOCKS=1`. The canned replies, the beep instead of a voice and the fixed transcript were mock behaviour, not bugs in the real routes. **The real chat, TTS and STT have not yet been seen working from a phone.**

Results that concern you:

- **Part 3, MAP-1 to MAP-13 on the iPhone with mocks on: all pass.** In the human's words: "everything working as intended in terms of UI."
- Test 8: with mocks off, captures are stored in Atlas and the Dex is as expected.
- Not done yet: MAP-10 and MAP-11 (they need the deployed site) and the whole Android pass.

Next, in order:

1. **A "MOCK DATA" tag (new, small, do it first).** When `NEXT_PUBLIC_USE_MOCKS=1`, show a small fixed tag in `layout.tsx`: in a corner, clear of the notch and home bar, `pointer-events: none`. Agent 4's screens sit full screen at `z-40`, so put the tag above them (`z-50`) and keep it tiny. Why: a whole round of chat and voice tests ran in mock mode, and the human took the canned replies for real ones.
2. **The rest of A3-10.** The Android pass. Then, once Agent 1 has deployed to Vercel (A1-12): MAP-10 (offline Dex), MAP-11 (Add to Home Screen) and one capture with mocks off on the deployed site.
3. **fal art (optional, helps the fal prize story).** `FAL_KEY` is now in the root `.env.local`. Run `npm run art:fal -- --yes` in `spikes/agent-3`, compare the results on the contact sheet, show the human, and keep the better set.
4. You have the most spare capacity. Offer help on the board, for example to Agent 4 on chat polish, within the paths you own.

## Current state

Rewrite this block before you stop, so a fresh session can continue from it alone.

- Last updated: 2026-11-14 23:55
- Working on: nothing. A3-03 to A3-09 are on `main`. This session added the MOCK DATA tag (layout.tsx and globals.css, `.mock-tag`) and friendlier wording for upload errors 415 and 429 (capture-messages.ts). `npm run check` passes (344 tests). Not committed yet: waiting for the human's yes.
- Next: A3-10. (a) The Android pass and, once Agent 1 has deployed to Vercel, MAP-10, MAP-11 and one real capture with mocks off. All of it needs a human with the phones. (b) fal art: `npm run art:fal -- --yes` in `spikes/agent-3`, which needs a `FAL_KEY`; there is none in this machine's root `.env.local`. (c) Offer chat polish help to Agent 4 if they ask.
- Blocked on: real phones (Android, deployed site) and a `FAL_KEY` on this machine for the optional fal art.
- Board read up to: 2026-11-14 23:45 (@team, tests, to @agent-5)
- Waiting for commit approval: the MOCK DATA tag, the 415/429 wording, this page, one board post, and the `certificates` line in .gitignore (Agent 1's file, added by Next's experimental HTTPS; ask Agent 1 or leave it out).

## Tasks

- [x] A3-01 Art direction, sprites and badges (drawn in code; the fal route is written, not yet run: no key)
- [x] A3-02 Map spike
- [x] A3-03 App shell, theme tokens, UI kit (kit in src/components/ui)
- [x] A3-04 Map screen
- [x] A3-05 Location handling and spoof panel
- [x] A3-06 Capture flow
- [x] A3-07 Dex screen
- [x] A3-08 Resilience: cached Dex, loading and error states, manifest, attribution
- [x] A3-09 Next-landmark hint
- [ ] A3-10 Phone pass and polish

## Log

Newest at the bottom. One entry per task or per session, in this shape:

    ### YYYY-MM-DD HH:MM, <task id>: <title>
    - Did:
    - Decided, and why:
    - Measured or verified:
    - Delegated to Haiku, and whether it was kept:
    - Problems:
    - Next:

### 2026-11-14 16:35, A3-01: art direction, sprites and badges
- Did: palette (`spikes/agent-3/src/lib/palette.ts`) and art rules (`spikes/agent-3/art/art-direction.md`). Six 32 px landmark sprites drawn in code (`scripts/pixel/sprites.ts`). Collected and locked badges with rarity rims (`scripts/pixel/badges.ts`), exported at 4x. `npm run art -- --publish` writes `public/sprites/<id>.png`, `public/sprites/badges/<id>.png` and `<id>-locked.png`. Wrote the fal route (`scripts/fal-art.ts`: nano-banana-2.1, then birefnet v2, then shrunk to palette pixels locally). It writes candidates to `art/fal/` only and needs `--yes`.
- Decided, and why: art drawn in code first, because no fal key was available and it costs nothing, regenerates in under a second and can be reviewed in a diff. fal is kept as an optional comparison route. Badges sit under `public/sprites/badges/` because MASTER.md section 3 gives Agent 3 `public/sprites/` and does not list `public/badges/`. Rarities copy Agent 1's fixtures, because the rims are baked into the badges. Font is Jersey 10 (OFL). Pixelify Sans was tried and dropped: its bold "C" reads as "O" on a phone screenshot.
- Measured or verified: fal schemas read on 14 Nov from llms.txt. `google/nano-banana-2.1` takes `prompt`, `aspect_ratio`, `resolution`, `output_format` and returns `images[].url`, token-priced. `fal-ai/birefnet/v2` takes `image_url`, `output_format` and returns `image.url`, listed at $0. The fal script's inputs type-check against `@fal-ai/client` 1.11's endpoint types. Not run: no `FAL_KEY` on this machine, $0 spent. Tests check that no sprite outline is clipped at the edge; that test caught two finials on row 0, now fixed.
- Delegated to Haiku, and whether it was kept: nothing. Each piece needed a visual check or was faster to write than to brief.
- Problems: none open.
- Next: run `npm run art:fal -- --yes` once a key exists, if the team wants fal-made art for the fal prize story, and compare it on the contact sheet.

### 2026-11-14 16:35, A3-02: map spike
- Did: `spikes/agent-3/src/map-spike/` is a Vite page with MapLibre 6.18 on OpenFreeMap vector tiles, drawn by a 19-layer game style (`src/lib/game-map-style.ts`): flat fills, sand roads with dark edges, buildings with a drop shadow, no labels, no glyphs. Also: sprite markers, a 50 m capture ring at each photo spot, the player dot with a true-metres accuracy ring, a location state machine with clear messages (`src/lib/location.ts`), a `?dev=1` spoof panel, a nearest-uncollected-landmark hint, and a capture button driven by `withinCaptureRange`. Landmark coordinates: `subject` from OSM Nominatim (NHM and V&A use their entrances). `photoSpot` is estimated.
- Decided, and why: a style built from scratch rather than recolouring liberty's ~110 layers, so nothing of its look leaks through. Markers are HTML elements, so the pixel art stays crisp with `image-rendering: pixelated`. The map opens framed on all six landmarks (`bounds`), not at a fixed zoom.
- Measured or verified: `npm run check` in the spike passes (tsc plus 75 vitest tests, including MapLibre's own style validator). Seen in headless Chrome at 390x844, DPR 2: tiles render, the markers sit on their buildings (Queen's Tower lands on its own footprint), and GPS overrides at the Queen's Tower and Huxley photo spots enable capture. 60 m from the V&A photo spot with 20 m accuracy also enables capture, as the rule says. Capture sets the badge, the Dex count and the next-landmark hint ("Huxley Building is 200 m north-west", checked by hand). The HTTPS phone server (`npm run dev:phone`) starts and serves the worker. **Not yet seen on a real phone.**
- Delegated to Haiku, and whether it was kept: nothing.
- Problems: (1) maplibre-gl 6 loads `dist/maplibre-gl-worker.mjs` as a separate file. Bundlers skip it, so the map stays blank. Fixed in Vite with `?url` and `setWorkerUrl`. The Next.js fix is not yet tested. (2) Styling a marker's root element (`position: relative`, or an animated `transform`) moved every marker away from its point. Fixed by styling inner elements only. (3) MapLibre's 512 px tiles make zoom 16 only about 290 m across a phone. (4) This repo is inside iCloud Drive's synced Documents folder. iCloud created "file 2.js" conflict copies inside node_modules. I reinstalled clean with `npm ci`, but `.git` is at risk too, so I told the team.
- Next: A3-03.

### 2026-11-14 20:28, A3-03, A3-06, A3-07, A3-08, A3-09 (and checking A3-04, A3-05): UI kit, capture, Dex, offline, manifest
- Did: `src/components/ui/` (Button, Card, Sheet, Spinner, ProgressList, Toast, with a README). Capture screen (`CaptureScreen.tsx`): rear camera, file-input fallback, photo shrunk to 1600 px JPEG under 4 MB, upload then `POST /api/captures`, badge award, or "You are 750 m from Royal Albert Hall. Head south-west". Dex screen (`DexScreen.tsx`): badge grid, photos and dates, progress bar, empty, loading, error and offline states, last Dex cached in localStorage. Manifest, four icons (drawn from the Queen's Tower sprite, `npm run icons` in the spike) and layout metadata. The Map now links to the Dex and hands its position (including a dev spoof) to Capture through sessionStorage. Pure logic with tests: `fix-store`, `image-resize`, `dex-cache`, `dex-view`, `capture-messages`. The next-landmark hint (A3-09) and location handling (A3-05) were already ported by the review session; I checked both in the real app.
- Decided, and why: the server alone decides a capture; the screen only shows the outcome. The UI kit uses new `ui-` classes and leaves the Map's old `.sheet` alone, so nothing Agent 4 or the Map relied on changed. Upload failures are worded by which step failed, because the same status means different things. The player never sees a raw server message. The Dex cache is tied to the player id and read through `useSyncExternalStore`, because React's lint rule forbids setting state in an effect.
- Measured or verified: headless Chrome at 390x844, DPR 2, fake camera and emulated GPS, against `next dev`. Mocks on: map, capture button, camera live (1920 px wide), shutter, review, upload, badge award, mock Dex store, Dex 1 / 6. Too far (750 m, direction checked by hand). No camera permission: clear message plus a working file picker (a PNG was decoded, shrunk to JPEG, captured). Mocks off: upload missing gives "The server cannot take photos yet" and Try again re-runs it. Dex offline: "Offline copy" with cached cards. No cache and no network: friendly error and Try again. Map attribution does not overlap the bottom HUD. `npm run check`: type check, lint and 227 tests pass. **Not seen on a real phone.**
- Delegated to Haiku, and whether it was kept: nothing. Each piece needed judgement or a visual check.
- Problems: (1) iCloud: 19 "file 2" duplicates appeared in `src/` (all byte-identical to tracked files, removed by exact name) and my `node_modules` lost its native vitest binding (fixed with `npm ci`). Worse, in real-API mode `next dev` inside the iCloud folder reloads the page forever (hundreds of "Compiled in 1ms"; mock mode is fine). The same repo copied to /tmp does not do it, so the folder location is the cause. (2) Bug found by testing: Map to Capture lost the recent position because the tracker's "locating" state wiped the fallback; fixed. (3) Bug found by testing: starting the tracker after the async permission check could leave a GPS watch running after unmount (also in the Map); fixed with a cancelled flag in both. (4) Light-on-light GPS chip on the camera screen; fixed. (5) A multipart POST to a missing route returns 409 from Next, not 404; wording now covers it. (6) The `package-lock.json` in my tree had lost its `libc` fields (npm on a Mac); I restored the committed one.
- Next: A3-10, the phone pass.

### 2026-11-14 23:55, A3-10 (part): MOCK DATA tag and upload error wording
- Did: a fixed "Mock data" tag in `layout.tsx`, shown when `NEXT_PUBLIC_USE_MOCKS=1` (read at start, so a restart is needed after changing it). Bottom-left corner, 1 px above the bottom edge, z-50 (over the z-40 Time Machine and chat), `pointer-events: none`. Added player wording for HTTP 429 and for 415 on the upload step.
- Decided, and why: bottom-left, not the top or bottom-right, because screenshots at 390x844 showed the right side collides with the Capture and Look around buttons and the top with the HUD chips and header buttons. Only the bottom-left strip was clear on the map, the Dex, the capture screen and the Time Machine.
- Measured or verified: headless Chrome at phone size on `/`, `/dex`, `/capture`, `/time/queens-tower`: the tag shows on all four and overlaps nothing. 344 tests pass.
- Delegated to Haiku, and whether it was kept: nothing.
- Problems: no `FAL_KEY` on this machine, so the optional fal art was not run. Port 3000 was briefly held by a VS Code helper process, so the first screenshot run hit nothing.
- Next: Android pass when a human has the phone.
