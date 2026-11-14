# src/lib/historian

The Historian: Claude researches a landmark in one year and writes the era's text. Server and worker only. Owner: Agent 1. MASTER.md sections 4.4 and 7, task A1-11.

**Entry point:** `writeEraBrief(landmark, year, { client? }): Promise<EraBrief>`. Throws `HistorianError` when it cannot produce a valid brief.

**How it works** (`index.ts`):
1. Research: `claude-opus-5-5`, effort `high`, server web search (`web_search_20260209`, up to 8 searches). Free-text notes with URLs. `pause_turn` is resumed by sending the turn back unchanged, up to 4 times.
2. Writing: `claude-opus-5-5`, effort `medium`, no tools, structured output (`betaZodOutputFormat(EraBriefSchema)`), then the checks in `validate.ts` (script 105 to 120 words, opens with the name, voice key in the catalogue, sources, at least 3 facts). One corrective retry.
Both send `fallbacks: "default"` (beta `server-side-fallback-2026-07-01`) for refusals.

**Cost:** estimated $0.25 to $0.60 and one to three minutes per brief. Not yet measured.

**Test:** `npm run test` (`historian.test.ts`, fake client; no API calls).

**Traps**
- No placeholder fallback without credentials, on purpose: placeholder text must never be stored as a real era. The pipeline stub uses `placeholderBrief` from fixtures instead.
- Google imagery is stripped from `referenceImageUrls` (MASTER.md section 6).
- Opus 5.5 always thinks: never send `thinking: { type: "disabled" }` or `budget_tokens`. Do not force a tool.
- A human reads every brief before pre-generation spends credits (H7).
