# How the Archivist's work is being done (for the human)

Written by Agent 4, standing in for Agent 5 at the human's request (15 Nov 2026, from 00:45),
after Agent 5's own session ran out of usage at 21:57 on 14 Nov. This page explains, in plain words,
what is being done, in what order, and how to check it. The detail lives in `AGENT5.md` (the brief),
`notebook/agent-5.md` (the log) and `data/` (the results). This page is updated as work goes on.

## 1. What the job is

The app shows each landmark as it was in a past year. Two things decide how good that looks and
how true it is:

1. **Research notes**: sourced facts, a painter's description of the view, daily life, plausible
   jobs for the guide. Agent 1's Historian writes the era text and guide script from these.
2. **Period images**: real old photographs and engravings, given to Agent 2's image models as
   references, so the 360° view looks like the real place in that year instead of a generic
   "old street". You found the panorama "very unrealistic": this is the main fix.

Every fact and image carries a receipt (the URL of the page that states it, and the licence),
because the judges will ask "how do you know it looked like that?".

## 2. What Agent 5 had done, and what was picked up

Found uncommitted in the worktree `.claude/worktrees/data-sources-validation-2a554a`, copied into
the main checkout unchanged:

- `scripts/data/`: the data schema, the rule checks, file reading, the notes renderer and the
  attribution renderer. Missing pieces were written now: `validate.ts` (the checker) and
  `build.ts` (regenerates the derived files). Unit tests for the checks were handed to a Haiku
  delegate, as Agent 5's delegation sheet allows.
- `spikes/agent-5/RESEARCH_BRIEF.md`: the method sheet for researchers (kept as written).
- `spikes/agent-5/cache/`: about 4 MB of downloaded sources (Survey of London vol. 38 pages,
  OpenStreetMap outlines, V&A history pages). Git-ignored, never committed.
- Photo spots for all six landmarks, worked out from OpenStreetMap. They existed only in its
  prompts; they are now checked (section 4) and will be written to `data/landmarks/`.

Agent 5's six researchers (one per landmark) died two minutes after starting. They were relaunched
with Agent 5's exact prompts, plus three additions from your round 1 note:
Queen's Tower 1893 first (Agent 2's realism bake-off runs on it), plain visual detail in the scene
text, and a "Real colours" section in each report (for the colour or monochrome choice).

## 3. The method, step by step

For each landmark, one researcher (a subagent) does this, in this order:

1. **Is the year right?** It checks what actually stood there in that year. A candidate year that
   shows nothing, or has a much better-recorded neighbour, gets replaced, with the reason written down.
2. **Facts**: at least 8, each with the page that states it. A date or a name needs a scholarly or
   primary source (Survey of London, Historic England, the institution's own history page, a
   period publication) or two independent ones. Wikipedia alone never counts for a date.
3. **Scene**: what a camera at the photo spot sees in that year, in a painter's words (materials,
   colours, road surface, lamps, vehicles, clothing), then what changed since: what persists, what
   was altered, what was not yet built, what is gone. Then all 360 degrees around the viewer.
4. **Daily life and the guide**: dress, transport, prices, customs, speech, and three real everyday
   jobs at that place (porter, attendant, cab driver...). Guides stay fictional.
5. **Images**: Wikimedia Commons only (building categories, earlier names, decade searches, nearby
   geotags, period illustrated papers). Each image kept is downloaded and looked at, its licence
   read from its file page, and its date taken from what it depicts, not the upload date. Kept:
   public domain, CC0, CC BY, CC BY-SA. Rejected: anything else, and anything from Google.
6. **Report**: per landmark, in `spikes/agent-5/cache/<landmark>/REPORT.md`: year verdicts,
   name confusions resolved, present-day stand-in photo candidates, every search tried, doubts,
   and the real colours.

The lead (this session) then: runs the checker, reads each file, looks at the kept images itself,
writes the landmark files, regenerates notes and attribution, commits, and posts to the agents who
use the data (Agent 2 for images, Agent 1 for the notes, Agent 4 for the Sources drawer).

## 4. Checks done so far

| Check | Result |
|---|---|
| Six photo spots against OpenStreetMap (`spikes/agent-5/geo.mjs`) | All pass: none inside a building; each 0 to 4 m from a footway, sidewalk or pedestrian area; the sight line crosses only the landmark itself. Distances to subject 28 to 85 m |
| Validator on an empty `data/` | Passes; reports a missing era file correctly |
| Typecheck and lint of `scripts/data/` | Pass |

## 5. Rules that are never bent

- No Google imagery or Google-hosted URL, anywhere.
- Licence whitelist only; licence and author recorded exactly as the file page says.
- No guessing: what could not be confirmed goes under "gaps".
- No keys, no sign-ups, no paid sources. Polite requests (one at a time, a User-Agent).
- Nothing from `spikes/agent-5/cache/` is committed. No file over 2 MB.

## 6. How to check the results yourself

- `npx tsx scripts/data/validate.ts` checks everything offline; add `--online` to fetch every URL.
- `data/eras/<landmark>_<year>.notes.txt` reads like a short research note: facts with links,
  the scene, images with licences, gaps.
- Open any image `url` in `data/eras/*.json` in a browser: it is a direct picture you can look at.

## 7. Progress

| Item | State |
|---|---|
| Validator and build scripts (A5-01) | Written; unit tests with a Haiku delegate |
| Photo spots (A5-03) | Checked on the map; files written once each year is settled |
| Queen's Tower 1893 (top priority) | Researcher running |
| Other five landmarks | Researchers running |
| Present-day stand-in photos (A5-07) | Candidates come from the researchers' reports |
| Asks to Agents 1, 2, 4 (A5-08) | After the first validated era |
