# src/lib/historian

The Historian: Claude researches a landmark in one year and writes the era's text. Owner: Agent 1. MASTER.md sections 4.4 and 7.

**Entry point:** `writeEraBrief(landmark, year): Promise<EraBrief>`.

**State at M0:** a stub returning `placeholderBrief()` from fixtures. A1-11 replaces it with `claude-opus-5-5`, web search on, structured JSON validated by `EraBriefSchema`.

**Traps**
- Opus 5.5 always thinks: do not send `thinking: { type: "disabled" }` or `budget_tokens`. Do not force a tool; use structured outputs.
- A long search turn can stop with `stop_reason: "pause_turn"`. Send it back to continue.
- `guide.voiceKey` must be a key of `VOICE_CATALOG` in `src/lib/fal/voices.ts`.
