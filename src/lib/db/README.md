# src/lib/db

Data access for landmarks, eras and captures. Server and worker only. Owner: Agent 1. MASTER.md section 4.4.

**Entry points:** `listLandmarks()`, `getLandmark(id)`, `getEra(id)`, `listEras(landmarkId)`, `patchEra(id, patch)`.

**State at M0:** an in-memory stub seeded from `fixtures/`, kept on `globalThis` so it survives hot reloads but not restarts. A1-08 swaps the bodies for MongoDB Atlas. Signatures stay the same.

**Test:** `npm run test` (`src/lib/jobs/jobs.test.ts` covers the stub).

**Traps**
- `patchEra` replaces nested objects whole (`guide`, `panorama`), it does not merge them. It ignores `id`, `landmarkId` and `year`.
- MongoDB stores coordinates as GeoJSON `[lng, lat]`. Only this directory converts.
