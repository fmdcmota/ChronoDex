# src/lib/db

Data access for landmarks, eras and captures. Server and worker only. Owner: Agent 1. MASTER.md section 4.4, task A1-08.

**Entry points** (`import { ... } from '@/lib/db'`): `listLandmarks`, `getLandmark`, `getEra`, `listEras`, `patchEra`, `listCaptures`, `insertCapture`, and for the seed script `upsertLandmark`, `insertEraIfMissing`, `closeMongo`.

**Backends.** MongoDB Atlas when `MONGODB_URI` is set (`mongo.ts`: one cached client, indexes created on first use). Otherwise an in-memory store seeded from `fixtures/`, which is fine for `npm run dev` and tests but resets on restart and is not shared with the worker process. On Vercel a missing `MONGODB_URI` throws instead of falling back.

**Collections.** `landmarks` (2dsphere on `photoSpotGeo`), `eras` (unique `landmarkId + year`), `captures` (unique `playerId + landmarkId`), `jobs` (see `src/lib/jobs`), and `media_assets`, which is Agent 4's durable media ledger (`src/lib/media`, `notebook/agent-4-panorama-plan.md`): one record per stored file, `{ _id, eraId, name, contentType, bytes, sha256, sourceUrl, falUrl, falUrlExpiresAt, createdAt }`, and the Era stores `/api/media/<id>` in place of the fal URL. Agent 4 owns it; there is no accessor in `src/lib/db`. Every `_id` is the domain id.

**Seed.** `npm run seed` writes the 16 fixture landmarks (replaced, with `data/landmarks/*.json` applied over them) and their 24 eras (inserted only if missing, all `missing`). `npm run seed -- --dry-run` only validates.

**Test:** `npm run test` (`src/lib/jobs/jobs.test.ts`, `src/app/api/routes.test.ts`). These cover the in-memory backend only. The MongoDB backend has not yet run against a live server.

**Traps**
- `patchEra` replaces nested objects whole (`guide`, `panorama`). It ignores `id`, `landmarkId`, `year` and undefined values.
- MongoDB stores coordinates as GeoJSON `[lng, lat]`. Only this directory converts.
- No `server-only` import: it throws outside Next's server bundle and would break the tsx worker. Never import this from a client component.
