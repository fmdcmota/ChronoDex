# Agent 3 notebook: Explorer

Only Agent 3 writes here. Rules: `MASTER.md` section 8.5. Task details: `MASTER.md` section 11.
Questions and requests to other agents go on `BOARD.md`, not here.

## From the human: round 3, run until only the videos are left (2026-11-15 04:15, read first)

Added by Agent 4 at the human's request. Goal: everything works, so the project's last step is switching video
generation on and running one command. The finish line (V1 to V10), your queue and the rules are in
`REMAINING_WORK_2.md` section 0. Your queue, in order: R3-3a, R3-3b, R3-3c. Keep working through it without stopping between
tasks. **When you wait on another agent: post BLOCKED on the board and tell your human in one line, "Waiting on
Agent N's <task> (<what>); please ask Agent N's human to prioritise it", then do your next unblocked task.**
This replaces the round 2 list below.

## Round 2 tasks (04:05, replaced by round 3 above)

Added by Agent 4 at the human's request. Your tasks are in `REMAINING_WORK_2.md` section 3 (statuses at 04:05,
Gantt in section 4); this list replaces the 01:50 priorities below where they differ. In order: A3-r2-5 (once Agent 4 posts that the server reads chronodex: exactly the 8 demo landmarks light up on the tunnel, the rest grey), then A3-r2-3 Android and A3-r2-6 Add to Home Screen when a human has the phone; polish only, nothing new after 10:00.
Log each as usual and leave this section in place.

## Your human's tasks (2026-11-15 02:05)

Your human's own list is section 3 of `HUMAN_TASKS.md` (plus "Everyone"). When one of those blocks you, remind them by its number (for example 3.1) rather than asking again from scratch, and post each answer they give to `@team` on the board.

## From the human: priorities for Sunday (2026-11-15 01:50, read first)

Added by the human on Sun 15 Nov 2026 at 01:50, from `REMAINING_WORK.md` (tests, actions, Gantt) and `notebook/agent-4-panorama-plan.md` (the 360° view made once with fal and kept). Work top to bottom. Move each item into your Tasks list as you take it, log it, and leave this section in place. Freeze is assumed at 10:00, submission 12:00 (still unconfirmed).

1. **A3-a** Android pass of `phone_test.md` Part 3 (MAP, CAPTURE, DEX) with a human and the tunnel (T11).
2. **A3-b** MAP-10, MAP-11 and one real capture with mocks off at the Huxley Building (T14): badge once, second capture says already collected, a too-far capture gives distance and direction.
3. **A3-e** (new) Retest the globe zoom, city chips and per-city spoof on an iPhone (T10). Keep markers readable.
4. **A3-d** Sprites and badges for every landmark that stays in the demo. If the human drops Singapore and Oslo (H7), hide them from the Dex rather than show empty slots.
5. **A3-c** Optional fal art (`npm run art:fal -- --yes`, needs `FAL_KEY`). Polish only, after the above.
6. **A3-10** Phone polish until the 10:00 freeze.

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

- Last updated: 2026-11-15 04:45 (real clock; some board stamps run hours ahead)
- Working on: nothing open that I can do alone. Everything of mine is pushed except one polish item (the Dom Luís bridge sprite, see the last log entry). A3-01 to A3-09 are done; the extras the human asked for are done and on `main`: Singapore, Oslo, Cambridge and Beijing landmarks with sprites, the city-aware map and hint, spoof rows per city, the globe zoom with a space backdrop, the detail fade by zoom (polish now Agent 4's), the three voyage ducks, the MOCK DATA tag, and the greying-out of landmarks with no ready era (`lib/era-ready.ts`).
- Next, from `REMAINING_WORK_2.md` section 3.3: A3-r2-3 Android pass and A3-r2-6 Add to Home Screen on a real iPhone (both need a human and a phone; `spikes/agent-3/PHONE_TEST.md` lists the checks); R3-3c Map and Dex polish for the demo route Agent 6 writes (no `DEMO.md` yet); nothing new after 10:00. Optional: `npm run art:fal -- --yes` in `spikes/agent-3` needs a `FAL_KEY` in this machine's root `.env.local`.
- Blocked on: a human with an Android phone and an iPhone; Agent 6's demo route.
- Board read up to: 2026-11-15 09:00 (@agent-1, A1-r2-2, REPLY) and 04:12 (@agent-4, A4-r2-2)
- Waiting for commit approval: the bridge sprite polish, this page and one board post.

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

### 2026-11-15 01:05, global maps: more cities with no map generation
- Did: `lib/map-region.ts` (group landmarks into regions within 30 km, open on the one nearest the player, jump instead of fly for far moves) with 11 tests; MapScreen now frames one region and limits panning to landmarks plus 2 km instead of a hard-coded South Kensington box; `?at=lat,lng` in the map spike; `spikes/agent-3/ADD_A_CITY.md`.
- Decided, and why: no per-city map generation at all. The style is already a recolour of planet-wide OpenFreeMap tiles, so Singapore and Bergen render in the same look at once, streamed live, for 0 tokens. The real per-city work is landmark data, sprites (code-drawn, free) and eras.
- Measured or verified: headless Chrome at 390x844 rendered Marina Bay and Bergen in the identical style. `npm run check` passes (381 tests). Not seen: a second city in the real app, because the fixtures only hold London.
- Delegated to Haiku, and whether it was kept: nothing.
- Problems: the hint card would say "9,000 km away" with landmarks in several cities; noted in ADD_A_CITY.md, not changed (geo-format.ts is shared with Agent 4's NextStopCard).
- Next: sprite functions for new landmarks once Agent 5/1 have the data.

### 2026-11-15 01:40, global maps: Singapore and Oslo landmarks, sprites, badges
- Did: five landmarks drawn as sprites and badges (code-drawn, free) and published to `public/sprites/`: Raffles' Landing Site, Raffles Hotel, Merlion Park (Singapore); Viking Ship Museum (Oseberg, Oslo), Akershus Fortress (Oslo). Data for all five is in `spikes/agent-3/src/lib/landmarks.ts` (`CITY_LANDMARKS`): OSM Nominatim subjects, photo spots read off the rendered game map at zoom 18, candidate years (1819; 1887; 1972; 834 and 1904; 1299 and 1624). The London map spike is unchanged. 80 spike tests pass.
- Decided, and why: Oslo's Viking Age is the Oseberg ship (burial 834), the museum is a precise, public place. I dropped a "Medieval Park" point because I could not confirm what the building at its coordinates was. Akershus uses the gatehouse end read from the map, because Nominatim's point lies in the grounds. Photo spots are estimates, like London's.
- Not done, and why: the five entries are NOT yet in `fixtures/landmarks.ts` (Agent 1's file): the permission guard blocked my edit, so they wait for Agent 1 or the human's go-ahead. `fixtures/fixtures.test.ts` asserts exactly six landmarks and several other tests and READMEs say "six", so Agent 1 needs to change those too. Until then the app shows London only.
- Next: once the fixtures hold them, check the Map, Dex and hint card with 11 landmarks; limit the "Next:" hint to the player's region.

### 2026-11-15 02:10, global maps: landmarks added to the app
- Did: with the human's go-ahead added the five Singapore and Oslo landmarks to `fixtures/landmarks.ts` (Agent 1's file) and changed the four tests that asserted exactly six (`fixtures.test.ts`, `routes.test.ts`, `mock.test.ts`, `geo-format.test.ts`) to eleven; no check was weakened. Map: the spoof buttons are grouped one row per city and a spoof moves the camera into that city (jump when far, fly when near); the "Next:" hint only points at landmarks in the player's own city, with new wording when a city is finished or everything is collected; the dev panel scrolls (max 45 % of the screen). Doc lines that said "six" were updated.
- Measured or verified: headless Chrome at 390x844 with mocks on: Dex shows 0 / 11, the panel has three city rows, spoofing to Merlion Park, Viking Ship Museum, Akershus Fortress and back to Queen's Tower each re-centres the map and shows "Capture <name>"; the Akershus sprite and ring sit on the castle. `npm run check` passes (381 tests).
- Problems: none new. Real-API mode needs `npm run seed` to add the five landmarks and their eras to the database (Agent 1's script; I have not run it against the shared Atlas).
- Next: ask Agent 1 to seed; era briefs for the new years (Agent 5 notes, Historian); real photo spots on site.

### 2026-11-15 02:40, globe zoom
- Did: the map now zooms out to the whole globe. MapLibre's globe projection (`setProjection({type:'globe'})` on style load) curves into the usual flat game map as you zoom in; `minZoom` went from 14 to 1 and the old pan limits (`maxBounds`) are gone. A World / City chip in the top bar flies out to zoom 1.6 or back in to the player's city (nearest region, else the biggest). Below zoom 13 landmark markers shrink to half size (`.zoomed-out`, set on the map container) so they do not pile up.
- Decided, and why: the globe projection instead of a flat world map, because it is one call and "see the whole globe" is literal; the tiles and style are planet-wide already (ADD_A_CITY.md). Pan limits were dropped because they would stop the zoom-out; the cost is a player can pan off to empty sea.
- Measured or verified: headless Chrome at 390x844: World then City round trip works, the chip label flips, globe screenshot shows Europe with Oslo and London pins; `npm run check` passes (381 tests). Not seen: a real phone's pinch gesture on the globe.
- Problems: the dev server served stale CSS for a few minutes after edits (an edit forced a rebuild); a hard reload on the phone may be needed after changes.

### 2026-11-15 03:05, space behind the globe
- Did: zoomed far out, the area around the globe is now space: an indigo sky, tiled stars, a sun in the upper right and a drifting purple galaxy band, all pure CSS on `.map-root` (no images, no cost). The flat map covers it, so nothing changes when zoomed in. The galaxy is a `::before` (a `::after` is painted over the globe because it comes later than the canvas); its drift animation is switched off for reduced-motion.
- Problems: a stray `}` from my first edit broke the stylesheet for a few minutes (Next showed a CssSyntaxError); fixed. The dev server again lagged on CSS; a touch of globals.css forced a rebuild.
- Verified: headless Chrome screenshot at the globe view. `npm run check` passes (381 tests).

### 2026-11-15 03:30, space v2: no haze, darker, 8-bit stars
- Did: removed the purple haze over the globe (the old galaxy layer was a `::after`, which paints over the map canvas; the galaxy is now a `::before` with `z-index: -1`, behind the canvas, and cool blue instead of purple). Sky is near-black blue (#03040b to #0a0f24). Stars are now two tiles of hard-edged square pixels with a few plus-shaped sparkles, as inline SVG data URIs with `crispEdges` (no images to load). Sun kept.
- Problems: raw double quotes in the data URIs broke the stylesheet (Next 500, "Parsing CSS source code failed") until they were percent-encoded. The dev server also serves stale CSS for a while after edits; a content edit forces a rebuild.
- Verified: headless Chrome globe screenshot, no tint over the ocean or land; `npm run check` passes (381 tests).

### 2026-11-15 04:00, Emmanuel College, Cambridge, and its duck
- Did: added `emmanuel-college` (rarity epic, candidate years 1584 for the founding and 1677 for Wren's chapel) to `fixtures/landmarks.ts`, `CITY_LANDMARKS` and the sprite list. Its sprite is the duck: a mallard in a tiny mortarboard with a duckling, on the garden pond (the "Emma ducks"). The subject is the pond itself (the OSM point lies in the Paddock; the pond was read off the rendered map) and the photo spot a path beside it, about 20 m away. Landmark count tests went from eleven to twelve.
- Decided, and why: Cambridge is its own region on the Map (80 km from London, over the 30 km gap), so it gets its own spoof row and the hint stays inside the city. The pond is inside the college grounds, which are open to visitors in the daytime: check that before a real capture; the photo spot is an estimate like the others.
- Verified: headless Chrome, mocks on: Dex 0 / 12, four spoof rows, spoofing to Emmanuel College shows the duck on the pond inside its ring and "Capture Emmanuel College". `npm run check` passes (445 tests, 1 skipped).

### 2026-11-15 04:30, map detail fades in with zoom
- Did: roads, paths, rail and buildings now fade in smoothly as you zoom, like Google Maps, instead of popping on. Each detail layer has a zoom-interpolated opacity (`fadeIn(from, to)` and `DETAIL_FADE` in `game-map-style.ts`): major roads, parks, water always solid; mid roads 11 to 13; minor roads 12.5 to 14.5; paths and pedestrian squares 13.5 to 15.5; rail 10 to 12; buildings and shadows 13 to 15. Everything is solid by 15.5, so the map looks exactly as before at the zoom a player stands at. A dev-only `window.__chronodexMap` hook (only with `NEXT_PUBLIC_DEV_TOOLS=1`) lets a test driver set the zoom.
- Decided, and why: opacity ramps, not layer `minzoom`, because minzoom switches a layer on in one frame, which is the popping. Not done: fading whole vector tiles as they load (MapLibre does not do that for vector fills) and symbol or label fades (the style has no labels).
- Measured or verified: headless Chrome montage at zoom 12.5, 13.6, 14.4, 15.2 and 16.5 on South Kensington: roads then buildings come in gradually, no pop. 5 new tests; `npm run check` passes (450 tests, 1 skipped). The spike's copy of the style is unchanged.

### 2026-11-15 04:50, smoother detail fade
- Did: the fade ramps are now eased (ease-in-out cubic bezier, `fadeIn` in `game-map-style.ts`) instead of linear, and each is about three zoom levels wide instead of two: mid roads 10.5 to 14, minor roads 12 to 15.5, paths 13 to 16, rail 9.5 to 12.5, buildings 12.5 to 15.5. Solid from zoom 16 up, so the street-level look is unchanged.
- Decided, and why: a linear ramp has visible corners where it starts and stops, which reads as a flicker; an S-curve starts and ends gently, and the wider range stretches the dissolve over more of a pinch or scroll.
- Verified: headless Chrome at zoom 12, 13, 13.8, 14.6, 15.4 and 16.2: detail builds up gradually, no step between frames; MapLibre accepted the style with no errors; `npm run check` passes (451 tests, 1 skipped). Not seen: the motion on a real phone, and vector tiles that load late still appear at once (MapLibre does not fade those).

### 2026-11-15 05:20, fade aligned to where the tile data appears
- Did: found the real cause of "suddenly appearing". A zoom sweep over South Kensington counting rendered features per layer showed new data arrives at WHOLE zoom levels (minor and mid roads at 12, footpaths and plazas at 13, most buildings at 14: for example buildings 4 features at 13.75, 67 at 14.0), and my fades started mid-level, so that data appeared already half visible. Every fade now starts at the whole zoom where its data arrives, at opacity 0, then eases in: mid roads 12 to 14.5, minor roads 12 to 15.5, paths and plazas 13 to 16, rail 10 to 12.5, buildings 14 to 15.8.
- Decided, and why: starting on the level is the only way an opacity fade can hide a data pop. Trade-off: below zoom 12 only major roads show, and buildings only start to appear at 14. Players stand at zoom 17 and the map opens there, so the opening look is unchanged (checked). Added a test that every fade starts on a whole zoom level.
- Not fixable here: the geometry of water and parks is replaced by a more detailed version when a level changes (a subtle shape change), and late-loading tiles appear at once; MapLibre does not fade vector tiles.
- Verified: zoom sweep before the change (counts above); `npm run check` passes (452 tests, 1 skipped); opening screenshot at zoom 17. Not yet seen on a phone.

### 2026-11-15 05:30, push, and the fade polish handed to Agent 4
- Did: the human approved the Emmanuel College and map fade work as "otherwise perfect" and asked for it to go to main, and for the remaining fade smoothness to be given to Agent 4. Posted the handoff on the board (state, what is left, what Agent 4 may edit). I own nothing open now except the Android and deployed-site checks, which Agent 2 holds.

### 2026-11-15 06:10, the Emma duck (walks across the map), built to be reversible
- Did: a small duck in a mortarboard now wanders across the Map screen: it waits 8 to 25 s (first walk 4 to 9 s), walks in from a random side at a random height in the middle band of the screen (clear of the top buttons and the bottom bar) at 34 to 52 px/s, sometimes stops for 1.2 to 2.6 s, walks off the other side, repeats. Two-frame waddle (legs swap, body bobs), mirrored when walking left, never catches a tap, off under reduced motion and while the tab is hidden.
- Reversible by design (any one): set `DUCK_ENABLED = false` at the top of `DuckWalker.tsx`; or delete the `<DuckWalker />` line and import in `MapScreen.tsx`; or delete `DuckWalker.tsx` and `public/sprites/duck/`; or `git revert` the one commit. The feature touches: new `src/components/explore/DuckWalker.tsx` (logic, styles and docs in one file), new `public/sprites/duck/walk.png`, two lines in `MapScreen.tsx`, and the art source in `spikes/agent-3` (`duckWalkFrame` in `scripts/pixel/sprites.ts`, the sheet in `make-pixel-art.ts`, `art/sprites/duck/walk.png`). No change to globals.css, config, env vars, dependencies or any other agent's file.
- Decided, and why: styles live in a `<style>` inside the component, not a CSS module, because this repo's Turbopack rule sends every `.css` file through Tailwind and that leaves CSS-module class names empty (first try rendered an unstyled duck), and global CSS may only be imported from the root layout. Web Animations API plus refs, so no React state and no re-renders. No new env var, because `.env.example` is Agent 1's and every variable must be listed there; the constant is the switch.
- Verified: headless Chrome at 390x844: the duck crosses the map at about 300 px height, frames alternate (0 px and -48 px), mirrors when walking left, `pointer-events: none`, hidden between walks; no console errors; `npm run check` passes (487 tests, 1 skipped). Not seen on a real phone; the pause-in-the-middle path ran in code but I did not catch one in a screenshot.

### 2026-11-15 07:00, three voyage ducks replace the random walker
- Did: replaced the duck that walked randomly across the screen with three scripted, costumed ducks that travel fixed routes on the map itself, so you see them when you zoom out to the globe: a British duck (top hat, red-white-blue scarf) sailing the Atlantic from Plymouth to New York in a little boat; a Saharan duck (white ghutra with a black agal, indigo robe) walking from Adrar in Mauritania across the Algerian and Libyan desert to Siwa in Egypt; a Chinese duck (conical straw hat, red jacket with gold trim) walking the Great Wall from Shanhaiguan to Jiayuguan. Each goes out, rests 4 s, comes back facing the other way, rests, and repeats. Crossing times 110 s, 100 s and 80 s; the ducks start at different points of their cycle.
- How: `duck-voyages.ts` makes three MapLibre markers and sets each position from the clock every animation frame (so there is no state and no re-render, and they sit in the map and move with it); `lib/route-path.ts` has the tested maths (distance-steady interpolation along a polyline, ping-pong with rests, east or west heading to decide which way the duck faces). Art: `voyageDuckFrame` in `spikes/agent-3/scripts/pixel/sprites.ts`, three 2-frame sheets in `public/sprites/duck/`. `DuckWalker.tsx` and its `walk.png` are removed (git history keeps them).
- Reversible (any one): set `VOYAGES_ENABLED = false` in `duck-voyages.ts`; or remove the import and the two uses (start and cleanup) in `MapScreen.tsx`; or delete `duck-voyages.ts`, `lib/route-path.ts` (and test) and `public/sprites/duck/`; or `git revert` the commit (which brings the random walker back). No change to globals.css, config, env vars, dependencies or other agents' files.
- Decided, and why: ducks live on the map, not the screen, because the routes are geographic; they are decoration for the zoomed-out globe, not something you meet at street level. Not shown under reduced motion. Marker roots take no styles (MapLibre positions them), styles are injected as one `<style>` (CSS modules are broken here, see the earlier duck entry).
- Verified: headless Chrome at 390x844 with the dev hook: three markers, `pointer-events: none`; the boat moved west about 11 px in 2 s and faces left; the Saharan duck walks east; the Wall duck walks west and faces left; all three seen at their places (Atlantic, Sahara, north China). `npm run check` passes (502 tests, 1 skipped). Not seen on a real phone or on the curved globe at zoom 1.6; route waypoints were placed by hand and the Atlantic and wall lines are straight legs between them.

### 2026-11-15 07:40, ducks faster, looping and smaller; Great Wall landmark
- Did: (1) the voyage ducks cross faster (Atlantic 70 s, Sahara 62 s, Wall 50 s, from 110, 100, 80) and now LOOP one way: each travels its route, fades out over the last 4 %, reappears at the start, fades in and goes again, with no rests and no turning back (so the Atlantic duck always sails west, the Saharan duck always walks east, the Wall duck always walks west). The back-and-forth maths (`pingPong`) was replaced by `loopFraction` and `edgeFade` in `lib/route-path.ts`, tested. (2) The ducks are 60 by 48 px (1.5x art), down from 80 by 64; frame swap is a bit quicker too. (3) A real Great Wall landmark, `great-wall-badaling` (rarity legendary, candidate year 1505), with its own sprite and badges: a brick wall with battlements climbing a green ridge, two watchtowers. It is in `fixtures/landmarks.ts`, `CITY_LANDMARKS` and the sprite list, as a fifth city on the map (Beijing); landmark count tests now say thirteen.
- Decided, and why: Badaling, because the Chinese duck's route already passes it and it is the best-known stretch; the subject is the OpenStreetMap "steps" node on the wall, the photo spot a point on the wall's walkway about 22 m along it, both read off the rendered map (Badaling is a ticketed site: check access before a real capture). Looping one way, not back and forth, is my reading of "loop them"; say if you wanted the back-and-forth. 1.5x is exactly 3 device pixels per art pixel on a 2x phone, so it stays sharp; on a 1x desktop screen pixels are slightly uneven.
- Verified: headless Chrome: the Wall duck's box is 60 by 48, it crosses the view, its opacity falls to 0.02 at the end, it reappears at the start of the route (x jumps from 18 to 307) at 0.48 and is solid by 1 s later, still facing west; spoofing to Great Wall at Badaling shows the sprite on the wall with its ring, Dex 0 / 13, a new spoof row. `npm run check` passes (504 tests, 1 skipped); spike tests 82 pass. Not seen on a real phone.
- Problems: `src/lib/db/README.md` (Agent 1) still says 12 landmarks and 19 eras; now 13 and 20. Told Agent 1 on the board.

### 2026-11-15 08:30, REMAINING_WORK_2 tasks A3-r2-1, A3-r2-2, A3-r2-4
- A3-r2-1: done earlier (everything of mine is pushed; `.gitignore` is gone from my tree).
- A3-r2-2, real capture with mocks off through Agent 4's tunnel (https://members-polo-subsequently-glass.trycloudflare.com, `chronodex_dev_agent2`, no human needed): headless Chrome at 390x844 with a fake camera and GPS emulated at Queen's Tower's photo spot, test player `a3-test-1794712950868`. PASS: the map loads over HTTPS (6 markers, no MOCK DATA tag, hint "You are at Queen's Tower"); the camera opens; the photo uploads through `/api/uploads` (fal storage), `POST /api/captures` accepts it, "Badge collected!" with "Open Time Machine"; the Dex then shows 1 / 6 with the date and my photo, and survives a reload; Open Time Machine lands on the real 1893 era ("The Queen Opens the Imperial Institute", Meet Albert, 1893 and 1962). This wrote ONE test capture (and one small fal upload) into `chronodex_dev_agent2`; it can be deleted. MAP-10 (Dex offline), simulated by blocking `/api/*` after a normal load: "Offline copy" chip and the cached cards. MAP-11 (Add to Home Screen): manifest, the four icons, apple-touch-icon, theme colour and the capable meta tag all serve over HTTPS; the install itself needs a real phone. The tunnel server is the older six-landmark build (no globe, ducks or new cities).
- A3-r2-4, no tap into an empty Time Machine: new `lib/era-ready.ts` and `lib/use-era-ready.ts`: a landmark has a Time Machine when at least one era is `ready`; the Map, the capture award and the Dex read the eras (one small request per landmark, cached 30 s) and, for a landmark with none, grey the marker, say "Time Machine: coming soon" and drop the "Open Time Machine" link or button (the Dex card stays but no longer links). The badge can still be collected. Data-driven, so no demo list is needed: whatever Agent 2 generates lights up by itself. Fails open: if the eras cannot be read, or mocks are on, nothing is greyed. 6 new tests; `npm run check` passes (524 tests, 1 skipped).
- Verified: dev server with mocks off and the in-memory store (Queen's Tower 1893 ready, the rest missing): 13 markers, 12 greyed, Queen's Tower not; Huxley card (collected) says "Time Machine: coming soon" and "Badge collected. Its Time Machine is coming soon." with no link; Queen's Tower card has "Open Time Machine"; the Dex has one link (Queen's Tower) and Huxley as a plain card saying "Time Machine coming soon". Not seen on a real phone, and the capture-award variant was checked by code, not screenshot (a mocks-off capture there needs a fal key for the upload).
- Problems: an attempt to build a second production copy in /tmp for testing failed (a symlinked node_modules is refused by Turbopack, and copying iCloud-synced node_modules stalled); I tested on the dev server with environment overrides instead.
- Next: A3-r2-3, the Android pass, needs a human with an Android phone. A3-r2-5: polish only from here.

### 2026-11-15 04:45, A3-r2-5 on the tunnel, and the Dom Luís bridge polish
- A3-r2-5: the phone server now reads `chronodex` at https://url-poems-screens-poll.trycloudflare.com (A4-r2-2). Checked in headless Chrome at 390x844 with GPS at Queen's Tower: 15 markers, 6 lit and 9 grey. Lit: Queen's Tower, Royal Albert Hall, Natural History Museum, Raffles' Landing Site, Zócalo and Metropolitan Cathedral, Dom Luís I Bridge. Grey: Huxley Building, Exhibition Road, V&A, Raffles Hotel, Merlion Park, Viking Ship Museum, Akershus Fortress, Emmanuel College, Great Wall at Badaling. That matches the API: eight ready eras across those six landmarks (Queen's Tower 2, Natural History Museum 2, the others 1), so "the 8 demo landmarks" in the plan are 8 eras on 6 landmarks. Dex 0 / 15 with 15 cards; no sprite or badge image fails to load; no MOCK DATA tag; the globe chip and three voyage ducks are present, so this server has the current build.
- Polish (A3-r2-7): Agent 6 drew the Zócalo and Dom Luís sprites in my sprite file; the bridge read poorly (a dark mass with columns, abutments clipped by the sprite edge). Redrew it as a double-deck iron arch with a light truss spaced four apart (so the outline pass leaves sky between), a visible arch under the upper deck, and terracotta houses on granite banks, all inside the edge. `npm test` in the spike passes (84), art republished. The Zócalo sprite looks fine.
- Not done: A3-r2-3 and A3-r2-6 need people and phones; R3-3c waits for the demo route.
