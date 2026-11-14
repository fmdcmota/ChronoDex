# src/lib/chat

The guide chat: an in-character, streamed reply from Claude. Server only. Owner: Agent 1. MASTER.md section 7, task A1-13.

**Entry points** (`import { ... } from '@/lib/chat'`): `streamGuideReply(input)` (async stream of `ChatStreamEvent`), `pickNextLandmark`, `buildGuideSystemPrompt`, `toClaudeMessages`, `getAnthropic()` (shared client, also used by the Historian).

**Call:** `claude-haiku-5-5` (override with `CHAT_MODEL`), streaming, effort `low`, system prompt prompt-cached. About $0.001 per reply.

**Route:** `POST /api/chat` in `src/app/api/chat/route.ts` turns the stream into SSE with `formatSseEvent` from `src/lib/client/sse.ts`, which the typed client parses.

**Test:** `npm run test` (`chat.test.ts`, with the fake client in `test-fakes.ts`; no API calls).

**Traps**
- The history must end with a player message (no assistant prefill on current models). The greeting is dropped from the messages and put in the system prompt, because the conversation must start with the user.
- Failures and refusals end the stream with an `error` event; the generator never throws once it is running. Haiku 5.5 has no server-side refusal fallback.
- Never write SDK calls from memory: load the `claude-api` skill first (MASTER.md section 7).
