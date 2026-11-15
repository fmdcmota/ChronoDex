# src/lib/media: generated-media store

Owner: Agent 4. Plan: `notebook/agent-4-panorama-plan.md` section 3. Server and worker only.

Every generated file (scene, panorama, headshot, narration, clips) is kept here the moment it exists, and the Era
stores `/api/media/<id>` instead of the fal URL. Nobody pays fal twice for a file, and fal's 7-day expiry never
forces a paid regeneration.

## Entry points (`@/lib/media`)

- `persistFromUrl(url, { eraId, name })` → `{ id, url, asset, created }`. Downloads a fal (or any http) URL once,
  reads a `/public` path from disk, returns an `/api/media` URL as is. Same URL or same bytes: no new download.
- `toFalUrl(url)` → a URL a fal model can fetch. Our files give their recorded fal copy while it has over a day
  left, else they are uploaded to fal storage again (free) and the new URL recorded. `/reference/x.jpg` is stored
  then uploaded once per six days. Other http URLs pass through. SVGs are refused.
- `persistBytes(bytes, { eraId, name, contentType })`, `getMediaAsset(id)`, `openMedia(id, range?)`.
- `GET /api/media/[mediaId]` (`src/app/api/media/`): immutable cache, ETag = id, Range 206, 304, HEAD.

Pipeline use (Agent 2, A2-h): persist each stage's fal output before `patchEra`; pass every model input through
`toFalUrl`.

## Storage

- `MONGODB_URI` set: GridFS bucket `media` plus ledger collection `media_assets` in `MONGODB_DB`.
- Otherwise: folder `MEDIA_DIR` (default `.media/`), `<id>.bin` + `<id>.json`; it writes its own `.gitignore`.
- Ids are the first 32 hex characters of the SHA-256, so the same bytes are one record.

## Run and test

`npx vitest run src/lib/media src/app/api/media` (memory and folder backends, the route, Range parsing).
GridFS was checked once on real Atlas in a throwaway database (put twice, get, range read, fal URL, drop).

## Traps

- The worker and the web server must use the same backend: same `MONGODB_URI` and `MONGODB_DB`, or the same
  `MEDIA_DIR`. A worker on GridFS and a server on the folder will serve 404s.
- A fal URL persisted long after it was made should pass `falUrlExpiresAt: null` (the persist script does),
  so `toFalUrl` uploads afresh instead of trusting a guessed expiry.
- Guide videos are tens of MB. They fit (limit `MAX_MEDIA_BYTES`, 150 MB) but count against Atlas's 512 MB.
