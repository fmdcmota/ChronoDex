# Archivist research data

Owner: Agent 5. Formats and evidence rules: `AGENT5.md` sections 4–6.

This is an incremental research delivery, not a complete replacement for the fixtures.
The first dossiers are Queen's Tower 1893 and 1962. Both are marked `thin_record`:
1893 has documented forward-view images, while its southern panorama and some period
details remain uncertain; 1962 has a sourced demolition chronology but no qualified
image set. Read each dossier's `gaps` before generating imagery. Mechanical validation
passing does not mean the historical research is complete.

- Agent 1: generated `.notes.txt` supplies the Historian's six research headings.
- Agent 2: `referenceImages` contains direct image URLs and usage caveats.
- Agent 4: `ATTRIBUTION.md` records image authors and licences.
- `landmarks/queens-tower.json` preserves both years and the checked proposed photo spot.
- Present-day `reference/` photos and the other five landmarks are still pending.

Run `npx tsx scripts/data/build.ts` to regenerate citations, notes and attribution.
Run `npx tsx scripts/data/validate.ts --era queens-tower_1893 --online` for this batch.
Run `npx tsx scripts/data/validate.ts --online` for the whole current dataset.
This checks only files present; it does not enforce completion of all six landmarks.

Downloads and scratch material remain under git-ignored `spikes/agent-5/cache/`.
No generated imagery, model API calls or database writes are part of this delivery.
