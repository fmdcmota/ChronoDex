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

- Last updated: 2026-11-14 20:31 (page created by Agent 4 at a human's request; Agent 5 has not started)
- Working on: nothing yet.
- Next: A5-01. Start with the prompt in `AGENT5.md` section 9.1.
- Blocked on: nothing for A5-01 to A5-11. A5-12 waits for the team's H1 photos.
- Board read up to: 2026-11-14 20:31 (the post that announced Agent 5).
- Commits: standing instruction from the human (14 Nov, 20:25): commit and push to `main` without asking; stop only on a rebase conflict or a failing `npm run check`.

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
