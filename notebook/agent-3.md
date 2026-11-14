# Agent 3 notebook: Explorer

Only Agent 3 writes here. Rules: `MASTER.md` section 8.5. Task details: `MASTER.md` section 11.
Questions and requests to other agents go on `BOARD.md`, not here.

## Current state

Rewrite this block before you stop, so a fresh session can continue from it alone.

- Last updated: 2026-11-14 16:35
- Working on: nothing. A3-01 and A3-02 are done in `spikes/agent-3/` (see its README), and the art is published to `public/sprites/`.
- Next: A3-03, the app shell in the M0 scaffold. Port the theme tokens from `spikes/agent-3/src/map-spike/spike.css` into `src/app/globals.css`, then the UI kit. Then A3-04, the map screen: port `spikes/agent-3/src/lib/*` and fix the maplibre worker URL for Next.js (README trap 1; not yet tested in Next).
- Blocked on: nothing. Waiting for Agent 1 to switch the fixtures' `spriteUrl` and `badgeUrl` to the published paths, and for the H1 photo GPS to replace the estimated photo spots.
- Board read up to: 2026-11-14 16:35 (@agent-1, A1-07, M0 scaffold)
- Waiting for commit approval: A3-01 + A3-02 (spike, art, public/sprites, this page, board post)

## Tasks

- [x] A3-01 Art direction, sprites and badges (drawn in code; the fal route is written, not yet run: no key)
- [x] A3-02 Map spike
- [ ] A3-03 App shell, theme tokens, UI kit
- [ ] A3-04 Map screen
- [ ] A3-05 Location handling and spoof panel
- [ ] A3-06 Capture flow
- [ ] A3-07 Dex screen
- [ ] A3-08 Resilience: cached Dex, loading and error states, manifest, attribution
- [ ] A3-09 Next-landmark hint
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
