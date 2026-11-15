# src/lib/historian

The Historian: DeepSeek researches a landmark in one year and writes the era's text. Server and worker only. Owner: Agent 1. MASTER.md sections 4.4 and 7, task A1-11. DeepSeek replaced Claude for this (decision D-026); MASTER.md section 7 is out of date until a human edits it.

**Entry point:** `writeEraBrief(landmark, year, { fetchImpl?, retryDelayMs?, signal? }): Promise<EraBrief>`. Throws `HistorianError` when it cannot produce a valid brief, `DeepSeekError` for API failures that survived the retries. Needs `DEEPSEEK_API_KEY`.

**How it works** (`index.ts`, client in `src/lib/chat/deepseek.ts`):
1. Research: thinking on, DeepSeek's server-side tools `deepseek_web_search` and `deepseek_read_url`. The server runs the searches in one request. Free-text notes, plus every URL the tools reported (`annotations`, `server_tool_calls`).
2. Writing: JSON mode (`response_format: json_object`), thinking off, no tools. JSON mode cannot be combined with the web tools, hence two calls. The reply is checked against `EraBriefSchema`, then reduced to sources and images the research really found (`keepFoundUrls`), then the script rules in `validate.ts` (105 to 120 words, opens with the guide's name, voice key in the catalogue, at least 3 facts). One corrective retry.
Transient failures (429, 5xx, a mid-stream "please retry", a dropped connection) are retried twice.

**Archivist data.** If `data/eras/<eraId>.notes.txt` exists (written by the Archivist from verified sources, see `src/lib/archive`), phase 1 is skipped: the notes are the research, and the URLs they cite are the only sources the brief may use. After writing, the era dossier's `sources` are appended and its licensed period images become `referenceImageUrls`. `researchNotes: null` forces the web search. The research phase is attempted up to 3 times because the model sometimes answers without using its tools (F-035).

**Measured** (14 Nov 2026, `deepseek-flash`, Queen's Tower 1893): 174 s end to end, 108-word script, 4 real sources. The research read about 850k tokens, nearly all cache hits, which is about $0.04 of tokens at list prices. The web tools are billed separately on DeepSeek's pricing page, and that figure is not known yet.

**Test:** `npm run test` (`historian.test.ts`, with a fake fetch; no network).

**Traps**
- Use `deepseek-flash`. `deepseek-v4-pro` failed mid-stream ("The model failed to generate a complete response") twice out of two with the web tools. `HISTORIAN_MODEL` is honoured only if it starts `deepseek-`.
- DeepSeek reports mid-stream failures inside the stream with HTTP 200, as an `error` field on the last chunk. `streamDeepSeek` turns that into a `DeepSeekError`.
- Sources are only accepted if the tools found them: a model writing from memory can invent a plausible URL. If the research reports no URLs at all, the Historian throws instead of writing an unsourced brief.
- Sources keep the URL as found, which can carry tracking parameters such as `utm_source`.
- No placeholder fallback without a key, on purpose: placeholder text must never be stored as a real era. The pipeline stub uses `placeholderBrief` from fixtures.
- Google imagery is stripped from `referenceImageUrls` (MASTER.md section 6).
- A human reads every brief before pre-generation spends credits (H7). The model writes fluent history, and the 1893 brief repeated one sentence in its summary; only a human can judge the facts.
