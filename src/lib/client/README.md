# src/lib/client

The typed API client every screen uses, with mock mode. Owner: Agent 1. MASTER.md sections 4.3 and 4.5.

```ts
import { api, getPlayerId, ApiError } from '@/lib/client';
const landmarks = await api.listLandmarks();
const { era, job } = await api.getEra('queens-tower_1893');
for await (const event of api.streamChat({ eraId, playerId: getPlayerId(), messages })) { ... }
```

| File | Holds |
|---|---|
| `index.ts` | `api` (real or mock, from `NEXT_PUBLIC_USE_MOCKS`), re-exports |
| `types.ts` | `ChronodexApi`: one method per endpoint |
| `http.ts` | Real implementation over `fetch` |
| `mock.ts` | Mock implementation over `fixtures/`. `createMockApi()` makes an isolated one for tests |
| `sse.ts` | Parser and formatter for the chat stream |
| `player.ts` | `getPlayerId()`: anonymous UUID in localStorage |
| `errors.ts` | `ApiError` with `status` and `code` |

**Test:** `npm run test` (`mock.test.ts`, `sse.test.ts`).

**Traps**
- `NEXT_PUBLIC_USE_MOCKS` is inlined at build time. Restart `npm run dev` after changing it.
- Client-only: call `api` and `getPlayerId()` in effects or event handlers, not during server render.
- In mock mode a fake job's progress is computed from the clock on each `getEra`, so poll it (every `GAME.POLL_INTERVAL_MS`) to see it move. When the job finishes, `job` becomes null, as with the real API.
- A too-far capture is a normal result (`ok: false`), not an exception.
