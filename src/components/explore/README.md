# src/components/explore

Agent 3 (Explorer): the Map, Capture and Dex screens. Shared pixel UI kit is in `../ui/`.

## Screens (each loaded by a thin page in `src/app/`)

- `MapScreen.tsx` (`/`): MapLibre game map, markers, your position, capture rings, hint, landmark
  card, dev spoof panel. `ssr: false`. Saves your position for Capture (`lib/fix-store.ts`).
- `CaptureScreen.tsx` (`/capture`): rear camera (file-input fallback), review, upload, `POST
  /api/captures`, badge award or "how far, which way". Never decides the capture: the server does.
- `WelcomeIntro.tsx` (over `/`, once a session; `?intro=1`/`0`): asks for location in the tap, falls through clouds to you. Styles are a string (`WelcomeIntro.styles.ts`): next.config makes every `.css`, modules too, global.
- `DexScreen.tsx` (`/dex`): badge grid, progress bar, cached copy when offline, all states.

## `lib/` (pure logic, unit tested)

`palette`, `game-map-style` (detail fades in by zoom), `map-geometry`, `geo-format` (distance, compass, hint), `location`
(GPS state machine plus dev spoof), `fix-store` (Map to Capture hand-off), `image-resize` (1600 px
JPEG), `capture-messages` (refusal and API-failure wording), `dex-cache` (localStorage), `dex-view`, `memory-box` + `remember-photo` (keepsake thumbnails in localStorage, shown by `MemoryBox.tsx`), `intro` (welcome intro: once per session, where it lands), `era-ready` (greys out landmarks with no generated era, fails open), `duck-voyages` + `route-path` (three costumed ducks on routes across the globe; removable, see its header), `map-region` (which city the map opens on, the World/City chip; new cities need no
map work, see `spikes/agent-3/ADD_A_CITY.md`).

## Run and test

- `npm run dev`. `.env.local` with `NEXT_PUBLIC_USE_MOCKS=1` uses fixtures; `0` uses the API.
- `NEXT_PUBLIC_DEV_TOOLS=1` shows the location-spoof panel (carried over to Capture).
- Camera and GPS need HTTPS or localhost. On a phone use `spikes/agent-3` `npm run dev:phone`, or
  the Vercel deploy.
- `npm run check` runs type check, lint and all tests.

## Known traps

1. **maplibre-gl 6 worker.** Bundlers drop it, so it is copied to `public/maplibre-gl-worker.mjs`
   and loaded with `setWorkerUrl`. Blank map plus "Worker failed to load" means it is missing.
2. **Never style a MapLibre marker's root element** (`position`, `transform`, `display`). Style
   `.marker-body` / `.player-dot`.
3. **Always guard async `tracker.start()` with a cancelled flag.** Starting after unmount leaks a GPS
   watch that stalls later fixes.
4. **A multipart POST to a missing route returns 409** ("Server Action unavailable"), not 404.
5. **Do not keep the clone in iCloud.** It makes `next dev` reload forever in real-API mode and
   writes "file 2" copies into the tree.
6. Photo spots are estimates until the H1 photo GPS lands (`fixtures/landmarks.ts`).
