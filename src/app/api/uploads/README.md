# src/app/api/uploads

Owner: Agent 2 (Studio). `POST /api/uploads`, MASTER.md 4.3, task A2-11. The client calls it through `api.uploadPhoto(blob)` in `@/lib/client`.

Multipart, field `file`, a JPEG up to 4 MB (the capture screen resizes to 1600 px first). Gives `{ url }`, a public link on fal's CDN that lasts at least 7 days, which the capture then posts to `POST /api/captures`. Free; about 3 s for a 700 KB photo.

| Status | Code | When |
|---|---|---|
| 400 | `bad_request` | No file, empty file, or not a form |
| 413 | `too_large` | Over 4 MB |
| 415 | `unsupported_type` | Not a JPEG. Checked on the file's first bytes, not the claimed type |
| 429 | `rate_limited` | Over 20 a minute per caller. `Retry-After` is set |
| 502 | `upstream_error` | fal storage failed |
| 503 | `voice_unavailable` | No `FAL_KEY` on the server and mocks are off |

With `NEXT_PUBLIC_USE_MOCKS=1` it returns a fixture URL and uploads nothing.

**Test:** `npm run test -- src/app/api/uploads`.

**Traps**
- The URL is public and unguessable, not secret. Photos are taken in public places.
- The rate limit is per server process, so on Vercel the real ceiling is a multiple of it.
- The 503 code is `voice_unavailable` because the check is shared with the voice routes.
