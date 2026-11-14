# src/components/explore

The Explorer (Agent 3) screen code for the map and, soon, the capture and Dex flows.

## What lives here

- `MapScreen.tsx` — the main screen (`/`): MapLibre game map, landmark markers, the player's
  position, capture zones, the hint, the capture button, the landmark card, and the dev spoof
  panel. Loaded with `ssr: false` from `src/app/page.tsx`.
- `lib/` — portable, unit-tested logic ported from `spikes/agent-3/`:
  - `palette.ts` — the flat colour palette (mirrored in `src/app/globals.css`).
  - `game-map-style.ts` — the 19-layer game-look MapLibre style over OpenFreeMap tiles.
  - `location.ts` — the browser geolocation state machine and the dev spoof.
  - `geo-format.ts` — distance/compass wording and the nearest-landmark hint.
  - `map-geometry.ts` — the true-metres accuracy ring polygon.

## Entry points

- Route: `src/app/page.tsx` (dynamic, `ssr: false`).
- Theme/styles: `src/app/globals.css` (the `:root` tokens must match `lib/palette.ts`).
- Worker: `public/maplibre-gl-worker.mjs`.

## Run and test

- `npm run dev` then open `/`. With `.env.local` set to `NEXT_PUBLIC_USE_MOCKS=1` it uses fixtures;
  otherwise the API (in-memory store) serves the same landmarks.
- `NEXT_PUBLIC_DEV_TOOLS=1` shows the location-spoof panel (`?dev` is not used here; the flag is).
- `npm run test` runs `lib/geo-format.test.ts` and `lib/map-geometry.test.ts` (plus the rest of
  the suite). `npm run check` also type-checks and lints.

## Known traps

1. **maplibre-gl 6 worker.** The bundler drops `maplibre-gl/dist/maplibre-gl-worker.mjs`, so it is
   copied to `public/` and loaded with `setWorkerUrl('/maplibre-gl-worker.mjs')`. If the map is
   blank and the console says "Worker failed to load", the copy is missing or stale.
2. **Never style a MapLibre marker's root element** with `position`, `transform` or `display` —
   MapLibre owns those. Style `.marker-body` / `.player-dot` instead.
3. **MapLibre tiles are 512 px**, so a fixed zoom is the wrong way to frame the six landmarks; the
   map uses `bounds`.
4. **Photo spots are estimates** until the H1 photo GPS replaces them (`fixtures/landmarks.ts`).
