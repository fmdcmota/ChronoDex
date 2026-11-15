# Adding a city (Singapore, Bergen, anywhere)

Owner: Agent 3. Short answer: **the map needs no generation.** The game look is a restyle of
OpenFreeMap's vector tiles, and those cover the whole planet. Proved on 15 Nov 2026 with the
unchanged style: `npm run dev` in this folder, then
`/src/map-spike/index.html?at=1.2868,103.8545,16` (Singapore, Marina Bay) and
`?at=60.3973,5.3243,16` (Bergen, Norway). Same palette, same buildings, same water. Cost: 0 tokens,
0 dollars, no build step. Tiles stream as the player pans, so it is already real time.

## What a new city does need

| Piece | How, cheapest first | Who |
|---|---|---|
| Map | Nothing. Tiles and style are global | nobody |
| Landmarks (name, `subject`, `photoSpot`) | OpenStreetMap or Wikidata coordinates, a script not an LLM. Put the photo spot on the nearest pavement | Agent 5 (data), Agent 1 (fixtures, seed) |
| Sprite and badge | Code-drawn pixel art, `npm run art` here. Add one drawing function per new building shape (Merlion, stave church, longship). Free, instant, same look. fal only if you want a comparison | Agent 3 |
| Eras (a Viking-age year for Norway) | Same Historian and pipeline as London. Real cost is here, not in the map | Agent 1, Agent 2 |
| Opening view | Automatic: `src/components/explore/lib/map-region.ts` groups landmarks within 30 km into a region and opens on the one nearest the player, else the biggest | done |

## What changed in the app for this

- `MapScreen.tsx` no longer has a London bounding box. Pan limits are every landmark plus 2 km.
- The map opens framed on one region, not all landmarks (all of them would be the whole globe).
- A player far from the map's centre is jumped to, not flown to.

## Known limits

- OpenFreeMap is a free community service. For a heavy launch, self-host the planet tiles
  (about 90 GB) or move to a paid provider with the same OpenMapTiles schema: only
  `OPENFREEMAP_TILEJSON_URL` in `game-map-style.ts` changes.
- "Next: X is 9,000 km away" is true but silly in the hint card. If landmarks span cities,
  limit the hint to the player's region (small change in `geo-format.ts`, not done yet).
- Viking-age views of a city are an era, not a map: do not try to restyle tiles for history.
