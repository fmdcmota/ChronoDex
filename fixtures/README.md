# fixtures

Seed and mock data. Owner: Agent 1. Task A1-04.

**Entry point:** `import { landmarks, eras, sampleJobs, HERO_ERA_ID } from '@fixtures/index'`. Clone before mutating.

| File | Holds |
|---|---|
| `landmarks.ts` | Thirteen landmarks (20 eras): the six of MASTER.md section 12, three in Singapore, two in Oslo, one in Cambridge and one in Beijing |
| `eras.ts` | One era per landmark year. `queens-tower_1893` is fully populated; the rest are `missing`. `placeholderBrief`, `populatedEra` |
| `jobs.ts` | One sample job in each state, for the progress sheet |
| `media.ts` | Placeholder media URLs: SVGs in `public/mock/`, plus a CC0 sample panorama, audio and video |

**Test:** `npm run test` (`fixtures.test.ts` validates every fixture with its schema).

**Traps**
- **Coordinates are approximate**, placed by hand. `npm run seed` replaces geometry, capture radius and years from `data/landmarks/<id>.json` when the Archivist has written one (so far only `queens-tower`), so the database can differ from these fixtures. Test captures with the spoof panel.
- The hero era's text is placeholder copy, not checked (H7). Do not show it to judges as research.
- Sprites and badges are Agent 3's art in `public/sprites/`. The reference photo is still a mock SVG until a real 16:9 photo lands in `data/reference/`.
