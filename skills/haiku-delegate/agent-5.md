# Haiku delegation sheet: Agent 5, Archivist

Rules and the brief template are in [SKILL.md](SKILL.md). Task ids are from `AGENT5.md` section 8.

## Hand to Haiku

| Task | What to hand over | Point it at | Done when |
|---|---|---|---|
| A5-01 | Unit tests for the pure checks in `scripts/data/checks.ts` | The rules in `AGENT5.md` section 6.1 and your first two tests | Tests pass and cover each rule's pass and fail case |
| A5-01 | `scripts/data/notes.ts`: render an era JSON as the research-notes text | `AGENT5.md` section 5.4 and one example you wrote by hand | The output matches your example exactly |
| A5-06, A5-09 | Turn raw Commons `imageinfo` JSON you already fetched into `referenceImages` entries, without judging match | `AGENT5.md` section 5.3 | Every field filled from the metadata; `match` left for you |
| A5-11 | `data/ATTRIBUTION.md` table from the JSON files | `AGENT5.md` section 5.6 | One row per file, validator passes |
| Any | A doc-comment pass over the files you changed | `MASTER.md` section 8.4 | Lint passes |

## Keep for yourself

- Deciding whether a source supports a claim, and whether a fact is "high" confidence.
- Judging whether an image matches the view and the year, and its licence.
- Choosing years, photo spots and the 16:9 crop.
- Any web request: a delegate spends nothing and fetches nothing (SKILL.md).
