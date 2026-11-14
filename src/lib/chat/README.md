# src/lib/chat

The guide chat: an in-character, streamed reply from DeepSeek. Server only. Owner: Agent 1. MASTER.md section 7 (chat rules), task A1-13. The chat went DeepSeek (D-024), Claude Haiku (D-025), and is on DeepSeek again (D-026), at the human's direction.

**Entry points** (`import { ... } from '@/lib/chat'`): `streamGuideReply(input)` (async stream of `ChatStreamEvent`), `pickNextLandmark`, `buildGuideSystemPrompt`, `toChatTurns`.

**Call:** `deepseek-flash` (override with `CHAT_MODEL`; any value not starting `deepseek-` is ignored with a warning by `chatModel()`), streaming, thinking off (`reasoning_effort: "none"`), through `deepseek.ts`, a small fetch client with no SDK, shared with the Historian. Needs `DEEPSEEK_API_KEY`. Measured on 14 Nov 2026: a full in-character reply in 1.5 s through `POST /api/chat`. About $0.0006 per reply at peak prices, half off-peak (estimate).

**Route:** `POST /api/chat` in `src/app/api/chat/route.ts` turns the stream into SSE with `formatSseEvent` from `src/lib/client/sse.ts`, which the typed client parses.

**Test:** `npm run test` (`chat.test.ts`, with a fake fetch; no network).

**Traps**
- The history must end with a player message. The greeting is dropped from the turns and put in the system prompt, so the conversation starts with the player.
- Failures, a missing key and content-filter stops end the stream with an `error` event; the generator never throws once it is running.
- DeepSeek's stream is OpenAI-style: `data:` lines, text in `choices[0].delta.content`, ending with `data: [DONE]`. Keep-alive comment lines are ignored.
- Without `DEEPSEEK_API_KEY` every reply is an error event, so keep mocks on for chat UI work.
