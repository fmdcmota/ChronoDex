# fixtures

Seed and mock data. Owner: Agent 1. Task A1-04.

**Entry point:** `import { landmarks, eras, sampleJobs, HERO_ERA_ID } from '@fixtures/index'`. Clone before mutating.

| File | Holds |
|---|---|
| `landmarks.ts` | The six landmarks of MASTER.md section 12 |
| `eras.ts` | One era per landmark year. `queens-tower_1893` is fully populated; the rest are `missing`. `placeholderBrief`, `populatedEra` |
| `jobs.ts` | One sample job in each state, for the progress sheet |
| `media.ts` | Placeholder media URLs: SVGs in `public/mock/`, plus a CC0 sample panorama, audio and video |

**Test:** `npm run test` (`fixtures.test.ts` validates every fixture with its schema).

**Traps**
- **Coordinates are approximate**, placed by hand. A1-08 replaces `photoSpot` with the GPS in the H1 photos. Test captures with the spoof panel.
- The hero era's text is placeholder copy, not checked (H7). Do not show it to judges as research.
- Sprites and badges point at `/mock/*.svg` until Agent 3's art lands in `public/sprites/`.
