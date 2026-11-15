# src/lib/archive

Owner: Agent 1 (Core). Reads the Archivist's `data/` folder (AGENT5.md section 5) for the seed and the Historian. It only reads; Agent 5 writes `data/`.

## Entry points

| Function | Used by | What |
|---|---|---|
| `readLandmarkOverrides()` | `scripts/seed.ts` | Geometry, capture radius, years and reference JPEG path from `data/landmarks/*.json`. Skips `blocked` files |
| `applyLandmarkOverride()` | `scripts/seed.ts` | Puts an override on a fixture landmark. Name, blurb, rarity and art stay as the fixture has them |
| `readEraNotes()` | `writeEraBrief` | `data/eras/<eraId>.notes.txt`, the research notes, so the Historian skips its web search |
| `readEraDossier()` | `writeEraBrief` | `sources` and the usable period images (same view first, no `context`, at most 4) from `data/eras/<eraId>.json` |
| `urlsInNotes()` | `writeEraBrief` | The URLs a block of notes cites. Only these may appear as sources in the brief |

## Behaviour to know

- Lenient on purpose: only the fields this app uses are checked, extra fields are ignored. Strict checking is `scripts/data/validate.ts`.
- A missing or broken file is skipped with a warning and the app falls back to the fixtures and the live web search.
- `ARCHIVE_DIR` points it at another folder. Tests always use a temporary one.
- The seed copies each reference JPEG to `public/reference/<id>.jpg` (git-ignored) and stores `/reference/<id>.jpg`. That is a path on this app, not a public URL: the pipeline must fetch the file and upload it to fal (see the board).
- To force a live web search for an era that has a notes file, pass `researchNotes: null` to `writeEraBrief`, or move the notes file away.

## Test

    npm run test -- src/lib/archive src/lib/historian
