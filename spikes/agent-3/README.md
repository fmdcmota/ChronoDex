# spikes/agent-3: Explorer spikes (map and art)

Owner: Agent 3. Throwaway (MASTER.md section 3): the app never imports anything from here. Covers A3-01 (art) and A3-02 (map), plus the logic for A3-04, A3-05 and A3-09, ready to port.

**Layout.** Config and dependencies sit at this root (`package.json`, lockfile, `node_modules/`, which is git-ignored). Code is in `src/` and `scripts/`. Generated art is in `art/`.

| Path | What |
|---|---|
| `src/lib/` | Portable logic with tests: palette, map style, landmark data, distance and compass text, location tracker, accuracy ring. `contracts-copy.ts` is a stand-in for `@/lib/contracts` |
| `src/map-spike/` | The map page: `index.html`, `main.ts`, `spike.css` (planned theme tokens) |
| `scripts/pixel/` | Pixel canvas, the six sprites, badges, and the pixelate step used for fal output |
| `scripts/make-pixel-art.ts` | `npm run art`: writes every PNG in `art/`. Free. `-- --publish` also copies them to the app's `public/sprites/` |
| `scripts/make-icons.ts` | `npm run icons`: writes the web app icons into the app's `public/icons/`. Free |
| `scripts/fal-art.ts` | `npm run art:fal -- --yes`: fal candidates into `art/fal/`. **Spends credits.** Needs `FAL_KEY` |
| `art/` | Sprites, badges, contact sheet, `art-direction.md` |

**Run.** Node 22 or later. `npm ci`, then `npm run dev` and open http://localhost:5173 (add `?dev=1` for the location-spoof panel). `npm run check` runs the type check and the 75 unit tests.

**On a phone.** `npm run dev:phone` serves HTTPS on your LAN with a self-signed certificate. Open the `Network` URL it prints and accept the warning. Location only works over HTTPS.

**Port notes (A3-03, A3-04).**
- Art is already published: `/sprites/<id>.png` and `/sprites/badges/<id>.png` (and `<id>-locked.png`). Badges sit under `public/sprites/` because that is Agent 3's path.
- `src/lib/*.ts` move to `src/components/explore/` (or `src/lib/explore/` if Agent 1 agrees). Swap `./contracts-copy` for `@/lib/contracts`.
- Theme tokens in `spike.css` `:root` become `src/app/globals.css`.

**Traps found here.**
1. **maplibre-gl 6 loads its worker from a separate file** (`dist/maplibre-gl-worker.mjs`), found next to its own module. Bundlers do not copy it. With no fix the map stays blank and the console says "Worker failed to load". Vite: `import url from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url'; setWorkerUrl(url)`. Next.js needs its own fix, not yet tested: either serve the file from `public/` or pass `new URL(..., import.meta.url)`.
2. **Never style a MapLibre marker's root element** with `position`, `transform` or `display`. MapLibre positions it with `position: absolute` and a transform. Overriding either moves every marker. Style an inner element instead.
3. MapLibre uses 512 px tiles, so zoom 16 is only about 290 m across a phone. Frame the landmarks with `bounds` instead of a fixed zoom.
4. Photo spots in `src/lib/landmarks.ts` are estimates. Replace them with the GPS from the H1 photos.
