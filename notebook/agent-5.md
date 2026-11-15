# Agent 5 notebook: Archivist

Only Agent 5 writes here. Rules: `MASTER.md` section 8.5. Task details: `AGENT5.md` section 8.
Questions and requests to other agents go on `BOARD.md`, not here.

## From the human: round 2 tasks (2026-11-15 04:05, read first)

Added by Agent 4 at the human's request. Your tasks are in `REMAINING_WORK_2.md` section 3 (statuses at 04:05,
Gantt in section 4); this list replaces the 01:50 priorities below where they differ. In order: A5-r2-1 first (fact-check the 8 demo eras' summary, facts and script against sources, post claims with none; no new eras before the freeze), then A5-r2-2 (a wide licensed photo of Queen's Tower from far back on Queen's Lawn, fixes Then/Now), then A5-r2-3 (credits for any period image the demo eras used).
Log each as usual and leave this section in place.

## From the human: priorities for Sunday (2026-11-15 01:50, read first)

Added by the human on Sun 15 Nov 2026 at 01:50, from `REMAINING_WORK.md` (tests, actions, Gantt) and `notebook/agent-4-panorama-plan.md` (the 360° view made once with fal and kept). Work top to bottom. Move each item into your Tasks list as you take it, log it, and leave this section in place. Freeze is assumed at 10:00, submission 12:00 (still unconfirmed).

Every panorama is now generated once and kept for ever (`notebook/agent-4-panorama-plan.md`), so the data you
give Agent 2 before an era is generated is what the demo shows. Accuracy first.

1. **A5-a** Take `queens-tower_1893` to `validated`: a verified plan or photo of the southern side, dome colour (new copper or patina), brick and roof colour, road surface, lamp fuel, prices.
2. **A5-b** A licensed present-day 16:9 reference photo for Queen's Tower (stand-in until H1), then the other landmarks (A5-07). Without it no real scene or panorama can be made.
3. **A5-e** Post the A5-08 asks (Agent 1 notes route, Agent 4 attribution in the Sources drawer).
4. **A5-c** Queen's Tower second year (1962, or 1965 to 1966): two dated images, daily life, three roles, a scene.
5. **A5-d** One landmark at a time: Huxley, Royal Albert Hall, Exhibition Road, V&A, Natural History Museum. Post to Agent 2 as each first era lands. At about an hour per era, three landmarks by 10:00 is realistic: do not start Singapore or Oslo unless the human says they are in the demo.
6. **A5-f** `checks.test.ts` by hand, manual audit of each validated era, `validate.ts --online` (T6), final report.

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

- Last updated: 2026-11-15 02:10, by Agent 5 (Claude Code, worktree agent-5-work-80ad29).
- **Read `notebook/agent-5-handover.md` first** for the Queen's Tower 1893 research already done.
- Done this session: A5-b for Queen's Tower. `data/reference/queens-tower.jpg` (1600x900) is a padded Commons stand-in (David Richfield, 2014, CC BY-SA 4.0): the whole tower, centred, with blurred side bands. The human chose padding over a crop on 15 Nov 02:00 because no 16:9 crop from 47 m can hold the 87 m tower.
- Next, in order: A5-a (Queen's Tower 1893 to validated: southern side, colours, prices), A5-e (asks to Agent 1 and Agent 4), A5-c (second Queen's Tower year), A5-d (Huxley, then Royal Albert Hall). Reference photos for the other landmarks: reuse `spikes/agent-5/pad-reference.mjs` when the only good photo is portrait.
- Blocked on: nothing. A5-12 waits for the team's H1 photos.
- Board read up to: 2026-11-15 05:30 (Agent 3 handoff) and the 02:05 HUMAN_TASKS post.
- Human's constraints: no subagents (cost). Commit and push to main without asking (standing instruction; stop only on a conflict or failing check).
- Tooling: Wikimedia needs 3 s between requests. `commons.mjs` now waits 3 s (1.1 s drew 429s). Thumbnail widths are 960, 1280 or 1920 only. `npm run check` passes (452 tests).

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

### 2026-11-15 02:10, A5-b / A5-07: Queen's Tower reference photo
- Did: searched Commons for a present-day stand-in (see attempts log), looked at 8 candidates, and built data/reference/queens-tower.jpg with the new spikes/agent-5/pad-reference.mjs. Set referencePhoto to commons_stand_in in data/landmarks/queens-tower.json and rebuilt ATTRIBUTION.md. The attribution wording in scripts/data/attribution.ts now says "fitted to 16:9", not "cropped", so it fits padded photos too.
- Decided, and why: padding, not cropping, at the human's choice. The tower is about 87 m tall and the photo spot is 47 m away, so a 16:9 crop loses the dome or the base. The side bands are a blurred, dimmed copy of the same photo, for the image model to repaint. takenFrom is left null because the file's GPS is the tower's own position. The landmark stays partial until H1.
- Measured or verified: the output is 1600x900 and 115 KB, and I looked at it. The original URL answers 200 image/jpeg. The offline validator and npm run check pass.
- Delegated to Haiku: nothing.
- Problems: Commons answered 429 at a 1.1 s pace; the pause is now 3 s.
- Next: A5-a.

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

### 2026-11-15, takeover: handover context loaded
- Did: read MASTER.md, AGENT5.md, the handover, guideline, notebook, research method, shared decisions, board, and the contracts, Historian prompts/validation and landmark fixtures.
- Decided: Queen's Tower 1893 remains first; finish daily life, sourced roles, scene and colour evidence, verify the inherited images, then build and validate the dossier for Agent 2.
- Verified: checkout was clean before this notebook update. Handover findings are inherited leads, not newly verified historical evidence.
- Delegated: nothing; the handover's no-subagent constraint remains in force.
- Checks: not run for this reading-only takeover; no application code or data changed.
- Next: resume the Queen's Tower dossier. No commit or push made.

### 2026-11-15 00:50, A5-05/A5-06: first Queen's Tower data delivery
- Did: read the inherited full Survey and Imperial texts, refreshed Commons metadata, visually inspected the two retained images, and opened Punch (22 July 1893) for explicitly qualified contemporary gallery-life evidence. Wrote 1893 (10 facts, 6 daily-life items, 3 roles, 2 same_view images), 1962 (5 chronological facts, no qualified images), and a partial landmark with both existing years and checked geometry. Generated notes and attribution; added README and source catalogue.
- Decided: both dossiers remain thin_record. Forward 1893 imagery can support Agent 2's facade trial, but the southern panorama is not established. Do not pretend that a mechanically valid file is complete historical evidence. No year changes, database writes, app edits, or paid calls.
- Corrections: the postcard date is a mailing date; its exposure interval is inferred. Rijksmuseum metadata credits the museum but identifies Frith & Co. as photographer. No unverified bright-copper dome colour. The 1900–06 Science College building is a useful anachronism warning, but was removed from notYetBuilt because that field means present-day surviving features.
- Attempts: 1962 exact-name/year search; Queen's Tower demolition/name search; inherited category leads; candidate metadata inspection. c1960 Geograph is 427x640 (reject), undated Kensington photograph is not dated by its 2017 upload/metadata or the guidebook it was found in, DPLA Queen's Tower is 1913 (reject for 1962). Do not claim all archives exhausted.
- Verified: geo.mjs reproduces 46.8 m north-facing view, 4.4 m from pedestrian way/1213090896, no building at spot, sight line crosses subject only. Shared haversineM/bearingDeg compute final landmark values. This is cached-map evidence, not confirmation of present public access.
- Checks: npm run check passed (typecheck, lint, 360 tests across 33 files). Full current dataset offline and online checks pass (1 landmark, 2 eras); derived notes/attribution reviewed. The initial whole-dataset missing-landmark failure was resolved without dropping 1962. Live web tool returned 403 for two sources, but inherited full texts were read and later network-enabled online URL checks passed.
- Delegated: none, per human cost constraint. Second source-to-claim review was manual in this session, not an independent audit.
- Next: approval for this first incremental commit/push; complete gaps and remaining landmarks. No overall task checkbox is ticked because each still covers more work than this delivery.
