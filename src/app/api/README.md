# src/app/api

HTTP routes of MASTER.md section 4.3. Owner: Agent 1, except `uploads/` and `voice/` (Agent 2).

| Route | File |
|---|---|
| `GET /api/landmarks` | `landmarks/route.ts` |
| `GET /api/landmarks/[landmarkId]/eras` | `landmarks/[landmarkId]/eras/route.ts` |
| `GET /api/eras/[eraId]` | `eras/[eraId]/route.ts` |
| `POST /api/eras/[eraId]/generate` | `eras/[eraId]/generate/route.ts` |
| `GET /api/players/[playerId]/dex` | `players/[playerId]/dex/route.ts` |
| `POST /api/captures` | `captures/route.ts` |
| `POST /api/chat` | Not yet (A1-13) |

`_lib/http.ts` has the shared helpers: `json`, `jsonError`, `readJson(request, schema)` and `handle(name, body)`. Every response is `Cache-Control: no-store`. Unexpected errors become a logged 500 with no internals in the body.

**Run:** `npm run dev` with `NEXT_PUBLIC_USE_MOCKS` empty, then for example `curl localhost:3000/api/landmarks`.
**Test:** `npm run test` (`routes.test.ts` calls each handler directly).

**Traps**
- Next 16: `ctx.params` is a Promise. Type it with the global `RouteContext<'/api/...'>`.
- Captures that are too far, have no location or no photo are 200 with `ok: false`. 400 is only for a malformed body or a non-http(s) photo URL. 403 `spoofed_location` unless `ALLOW_SPOOFED_LOCATION=1`.
