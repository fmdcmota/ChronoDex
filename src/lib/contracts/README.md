# src/lib/contracts

Shared types, zod schemas and pure helpers. Every agent imports from here. Owner: Agent 1. Frozen at M0 (MASTER.md section 4).

**Entry point:** `import { ... } from '@/lib/contracts'`. Never import the files directly.

| File | Holds |
|---|---|
| `types.ts` | MASTER.md 4.1, copied unchanged (doc comments added) |
| `api.ts` | Request and response bodies of the HTTP API (4.3) |
| `schemas.ts` | A zod schema per type and per request body. A compile-time check fails `npm run typecheck` if a schema drifts from its type |
| `helpers.ts` | `eraIdOf`, `parseEraId`, `haversineM`, `bearingDeg`, `withinCaptureRange` (4.2), and `resolveCapture`, the capture rule used by the server and by mock mode |
| `stages.ts` | Stage order, tiers, player-facing labels, `buildStages`, `eraNeedsGeneration` |

**Test:** `npm run test` (`helpers.test.ts`; fixtures are validated in `fixtures/fixtures.test.ts`).

**Changing anything here after M0:** post a `CONTRACT` to `@team` on BOARD.md and wait for a human yes. Agent 1 logs it in DEV_NOTEBOOK.md.

**Traps**
- Coordinates are `{ lat, lng }` here. GeoJSON, MongoDB and MapLibre use `[lng, lat]`. Convert only in `src/lib/db` and in map code.
- Build era ids with `eraIdOf`, never by concatenation. Landmark ids never contain `_`.
- `CaptureRequest.location` may be null: the server answers `location_missing`, not a 400.
