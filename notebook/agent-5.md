# Agent 5 notebook: Archivist

Only Agent 5 writes here. Rules: `MASTER.md` section 8.5. Task details: `AGENT5.md` section 8.
Questions and requests to other agents go on `BOARD.md`, not here.

## From the human: phone test round 1 and next steps (2026-11-14 23:35, read first)

Added by the human after the first run of `phone_test.md` on an iPhone. Move these into your tasks and log as you take them. Leave this section in place.

The human tested the AI 360° panorama and found it "very unrealistic". They want it much closer to how the place really looked in the chosen year. Agent 2 is reworking the prompts. One of the strongest fixes is to give the image model **real period photographs as references**, and that data is yours.

Next, in order:

1. **Queen's Tower 1893 first.** Agent 2 runs its realism bake-off on this era. Find public-domain or openly licensed photographs of the Imperial Institute and Exhibition Road / Queen's Gate area from about 1885 to 1900. Give direct image URLs (not page URLs), each with its licence and source page, in the format `AGENT5.md` specifies for `referenceImageUrls`. Never Google imagery. Post on the board to `@agent-2` as soon as one era is ready; do not wait for all of them.
2. **Visual detail for the prompts.** For the same era, write down in plain visual terms what the photographs show: street surface, lighting, traffic, signage, clothing, building materials and colours. Agent 2 turns these into the scene and panorama prompts.
3. **Colour or monochrome.** Agent 2 will ask the human whether eras before about 1900 should look like colour photographs or real monochrome. Note what the archive photos suggest about real colours (brick, stone, paint) so either choice can be made convincingly.
4. Then the same for the other demo eras, in the order of `MASTER.md` section 12.

## Current state

Rewrite this block before you stop, so a fresh session can continue from it alone.

- Last updated: 2026-11-15 00:40, by Agent 4 (stand-in), handing over to **Astra, the new Agent 5**.
- **Read `notebook/agent-5-handover.md` first**: everything found so far (photo spots, Queen's Tower 1893 images and facts with the sentences located, searches tried, what is left).
- Working on: nothing in progress. `data/` does not exist yet.
- Next: finish `data/eras/queens-tower_1893.json` (daily life, roles, scene, real colours), validate, post the images to Agent 2; then the landmark files; then the other eras.
- Blocked on: nothing. A5-12 waits for the team's H1 photos.
- Board read up to: 2026-11-15 00:37 (nothing addressed to Agent 5 unanswered).
- Human's constraints (15 Nov): no subagents (cost). Commit and push to `main` without asking; stop only on a rebase conflict or a failing check.
- Tooling: `npx vitest run --pool=vmThreads` on the Windows machine (default pool broken on Node 26.13.1). `spikes/agent-5/commons.mjs` is the polite Commons client.

## Tasks

- [ ] A5-01 Set up data/, scripts/data/ (schema, checks with tests, validate, notes) and spikes/agent-5/
- [ ] A5-02 Source catalogue tried on Queen's Tower, recorded in data/SOURCES.md
- [ ] A5-03 Geometry for all six landmarks
- [ ] A5-04 Year validation for all six landmarks
- [ ] A5-05 Era dossiers: queens-tower_1893 and the Huxley Building years
- [ ] A5-06 Reference images for those eras
- [ ] A5-07 Present-day stand-in reference photos for all six, cropped to 16:9
- [ ] A5-08 Board ASKs to Agents 1, 2, 4 and the team
- [ ] A5-09 Dossiers and images for every remaining year
- [ ] A5-10 Adversarial verification of every validated era
- [ ] A5-11 Online validation, ATTRIBUTION.md, final report
- [ ] A5-12 H1 photo intake (when the photos arrive)

## Attempts log

Searches and strategies tried per item, so a resumed session does not repeat them (`AGENT5.md` 8.3).

| Item | Strategy | Result | When |
|---|---|---|---|
| Photo spots, all six | Agent 5 (14 Nov) placed them from OSM; checked 15 Nov with spikes/agent-5/geo.mjs | All on or within 4.4 m of a footway, sidewalk or pedestrian way; none inside a building; sight line crosses only the subject. QT 51.497930,-0.176890 facing 0 (46.8 m); Huxley 51.498700,-0.179880 facing 75 (56.3 m); RAH 51.501780,-0.177410 facing 180 (85.1 m); Exhibition Road 51.497400,-0.174000 facing 358 (79.8 m); V&A 51.496650,-0.173920 facing 90 (27.7 m); NHM 51.495465,-0.176020 facing 0 (48.4 m) | 15 Nov 00:20 |
| Six researcher subagents | Relaunched with Agent 5's prompts at about 00:15 | Stopped by the human at about 00:20 for cost before writing anything. Do not use subagents | 15 Nov 00:20 |
| queens-tower_1893 images | Commons: category Imperial Institute; category Queen's Tower, Imperial College London; search "Imperial Institute" London 189*, photograph, Illustrated London News; intitle:"Imperial Institute"; intitle:"Imperial Institute Road" | 4 usable (2 same_view, 2 context), 5 rejected, 3 unopened; full table in agent-5-handover.md 5.1 | 15 Nov 00:35 |
| queens-tower_1893 facts | Survey vol. 38 pp220-227 (cached), Imperial College Queen's Tower page, Wikipedia (Commonwealth Education Trust; Queen's Tower, London); Historic England 1227441 returned no listing text to a script | 12 facts with sentences located; handover 5.2 | 15 Nov 00:37 |

## Log

Newest at the bottom. One entry per task or per session, in this shape:

    ### YYYY-MM-DD HH:MM, <task id>: <title>
    - Did:
    - Decided, and why:
    - Measured or verified:
    - Delegated to Haiku, and whether it was kept:
    - Problems:
    - Next:

## Final report

Written at A5-11 (`AGENT5.md` section 9.7).

### 2026-11-15 00:28, A5-01: rescue and validator (Agent 4 standing in; first stamped 00:55, corrected)
- Did: copied Agent 5's uncommitted work from its worktree. Wrote scripts/data/validate.ts (offline checks, `--era <eraId>`, `--online` with polite fetching) and scripts/data/build.ts (sources from citedSources, notes.txt, ATTRIBUTION.md). Checked the six photo spots on OSM (attempts log). Wrote notebook/agent-5-guideline.md for the human.
- Decided, and why: no top-level await in validate.ts (tsx compiles to CJS here). Subagents stopped at the human's request; work continues single-threaded, Queen's Tower 1893 first.
- Measured or verified: typecheck and lint pass; validator passes on an empty data/ and reports a missing era file.
- Delegated to Haiku, and whether it was kept: checks.test.ts was handed over and then stopped before it wrote anything. Still to do.
- Problems: Agent 5's session left no notebook entries; its state was reconstructed from files and its transcript.
- Next: queens-tower_1893.

### 2026-11-15 00:40, handover to Astra (Agent 4 standing in)
- Did: Queen's Tower 1893 image hunt and fact gathering (see attempts log), written up in notebook/agent-5-handover.md together with the photo spots and the remaining work. Added spikes/agent-5/commons.mjs.
- Decided, and why: stopped mid-era at the human's request so Astra can take over as Agent 5; nothing half-finished was written to data/, so the validator stays clean.
- Problems: my earlier stamps on this page ran about 25 minutes ahead of the clock; corrected above.
- Next: see Current state.
