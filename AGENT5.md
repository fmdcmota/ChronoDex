# Agent 5: Archivist (data acquisition and validation)

**Status:** brief v1, written Sat 14 Nov 2026 at 20:31 at a human's request, while the other four
agents are mid-build. `MASTER.md` is still the single source of truth for everything this file does
not cover. Where this file and `MASTER.md` disagree on Agent 5's own work, this file wins, because
`MASTER.md` predates Agent 5.

**To start, in Claude Code (use the highest effort setting you have):**

    Read AGENT5.md. You are Agent 5.

`CLAUDE.md` tells agents to ask which agent they are if told a number from 1 to 4. You are told 5:
that is the answer. Then follow section 0 of this file, not section 0 of `MASTER.md`.

## Contents

0. Start here
1. Mission
2. What the system needs from you
3. What you own, and the rules
4. Hard rules for data
5. Output formats
6. Validation
7. Where to look: the source catalogue
8. Work plan and the loop
9. Ready prompts
10. Hand-off to the other agents
11. Definition of done
12. State of play at hand-off (14 Nov, 20:31)

## 0. Start here

1. Read `MASTER.md` sections 1 to 8 (product, architecture, ownership, contracts, fal plan, Google
   rules, Claude usage, engineering rules). Skim 9 to 14.
2. Read this whole file.
3. Read `notebook/agent-5.md`. Its "Current state" block says where the last session stopped.
4. Read `DEV_NOTEBOOK.md` (decisions, contract changes, traps) and `BOARD.md` from the post your
   notebook says you read last. Answer anything addressed to `@agent-5` or `@all`.
5. Read the code your output feeds, so your formats match it exactly:
   `src/lib/contracts/types.ts` (Landmark, Era, SceneBrief, Source),
   `src/lib/historian/prompt.ts` (the research-notes format, `buildResearchPrompt`),
   `src/lib/historian/validate.ts` (what a brief must pass),
   `fixtures/landmarks.ts` (today's estimated coordinates and candidate years).
6. Run the loop in section 8 with the prompt in 9.1. Do not stop until section 11 is met or every
   remaining item is blocked on a human (then say exactly what you need, and from whom).

## 1. Mission

Everything the app shows about the past is generated from data: the Historian (an LLM; DeepSeek since Agent 1's commit a76fc33, see `DEV_NOTEBOOK.md`) writes each
year's facts and the guide's script from research, and the fal image models repaint a present-day
photo into that year using a written change list and period reference images. **Bad or missing input
data is now the biggest risk to the demo.** The judges will ask "how do you know it looked like
that?" and the answer must be a list of real, licensed, checked sources.

Your job: for the six seeded landmarks (`MASTER.md` section 12), find, acquire and validate every
piece of input data the pipeline needs, in exactly the formats the code reads, with a receipt for
every claim and every image. Keep going until each item is either valid or provably unavailable.

You do not generate images, call fal, call any model API (Anthropic, DeepSeek) from code, or write app code. You do
research, fetch metadata and files, check them, and write data files plus a validator.

## 2. What the system needs from you

| # | Data | Read by | Contract field(s) | Today |
|---|---|---|---|---|
| D1 | Landmark geometry: where the subject is, where the player stands, which way they face | Map, capture rule, Historian prompt, panorama bearing | `Landmark.subject`, `Landmark.photoSpot`, `captureRadiusM` | Estimated; subjects checked against OpenStreetMap by Agent 3, photo spots guessed |
| D2 | Present-day reference photo per landmark, 16:9, from the photo spot facing the subject | Every scene edit (Agent 2) | `Landmark.referencePhotoUrl` | `/mock/reference.svg` placeholder. Human task H1 (team photos) not delivered |
| D3 | The years to offer per landmark, each one worth seeing | Year bar, generation | `Landmark.eraYears` | Candidates in `MASTER.md` section 12; only the first row checked |
| D4 | Research notes per landmark and year: sourced facts, daily life, what is visible from the photo spot, what surrounds it, gaps | Historian phase 2 (writing) | becomes `Era.title`, `summary`, `funFacts`, `sources`, `sceneBrief`, `guide` | Nothing. The Historian would do its own 8 web searches per era, unverified |
| D5 | Period reference images per landmark and year, direct image URLs, licence-checked | Scene and panorama edits (Agent 2) | `SceneBrief.referenceImageUrls` | Nothing. The Historian prompt asks for Commons *file pages*, which image models cannot read |
| D6 | Period grounding for the guide: plausible everyday roles at this place, dress, prices, transport, speech | Historian (guide persona and script) | `Guide.role`, `appearance`, `script` | Nothing |
| D7 | Attribution for every third-party file shown or used | Sources drawer (Agent 4), credits | `Era.sources`, attribution list | Nothing |
| D8 | Intake and validation of the team's H1 photos when they arrive | Seed (Agent 1) | `photoSpot`, `referencePhotoUrl` | Not arrived |

## 3. What you own, and the rules

| Path | Use |
|---|---|
| `AGENT5.md` | Read only. Owned by the humans, like `MASTER.md` |
| `notebook/agent-5.md` | Your notebook page (`MASTER.md` section 8.5) |
| `data/` | Your deliverables (section 5). Small text files and the 16:9 reference JPEGs only |
| `scripts/data/` | Your validator and fetch helpers, TypeScript, with unit tests (`*.test.ts` there run in `npm run check`) |
| `spikes/agent-5/` | Throwaway scripts with their own `package.json` (for example `sharp` for resizing) and a git-ignored `cache/` for downloads |
| `skills/haiku-delegate/agent-5.md` | Read only. Your delegation sheet |

Everything else belongs to another agent or the humans. To change it, post an `ASK` on the board
(section 10). The rules in `MASTER.md` section 8 apply to you: documentation standard (8.4: file
headers, doc comments on every export, units in names), notebook after every task (8.5), one board
post per commit (8.6), Haiku delegation within your sheet (8.7).

**Commits and pushes.** Standing instruction from the human (14 Nov, 20:25): commit and push to
`main` without asking each time. Before each push: `git pull --rebase origin main`, then
`npm run check`, then push. Stop and tell the human only if the rebase conflicts or the check fails.
Never force-push. Never commit anything under `spikes/agent-5/cache/`, any key, or any file over
2 MB. Commit messages start with your task id (`A5-03: ...`) and contain no `@handles`.

## 4. Hard rules for data

1. **No Google imagery, ever.** No Street View, Maps or Earth images, thumbnails or tiles as input,
   reference or stand-in, and no URL on a Google host in any image list (`MASTER.md` section 6).
   `isGoogleUrl` in `src/lib/historian/validate.ts` is the test; your validator reuses the same rule.
2. **Licences.** An image may be used as model input or shown in the app only if its licence is one of:
   public domain (any "PD-" tag, "No restrictions", CC0, or "Public domain mark"), CC BY (any version),
   CC BY-SA (any version). Reject NC, ND, "all rights reserved", "permission", fair use, unknown or
   missing. Record the licence exactly as the source states it, with the author and the source page.
   Historic England archive images, the Getty, Alamy, Science & Society, Bridgeman and similar
   are cite-and-link only: never acquire them.
3. **Facts.** Every fact carries the URL of a page that states it. A date, a name or a "first/only/
   largest" claim needs either one scholarly or primary source (Survey of London, Historic England
   listing, an institution's own history page, a contemporary publication) or two independent
   secondary sources. Wikipedia is fine for orientation and as one of two, never alone for a date.
   When sources conflict, record both and say which you prefer and why. Never fill a gap with a guess:
   put it under GAPS.
4. **Guides are fictional.** Research roles, never people. Do not propose a real named individual as
   a guide or quote a real private person.
5. **Be a good client.** One request at a time per host, at most about one per second to
   Wikimedia, Wikidata and Overpass. Send a descriptive User-Agent such as
   `Chronodex-hackathon-archivist/0.1`. If a service asks for contact details in the User-Agent, ask
   the human what to put; never invent one and never use a personal email you found in the repo.
   Respect robots.txt and terms. A 403 or a login wall means stop, cite the page instead, move on.
6. **Downloads.** The human authorised acquisition for this task: you may download images, JSON and
   HTML into `spikes/agent-5/cache/` to inspect them. Never download or run executables, installers
   or archives from the web. Install npm packages only into `spikes/agent-5/` and only well-known ones
   (`sharp`, `exifr`).
7. **Faces.** Present-day photos you pick as stand-ins should not centre on identifiable strangers.
8. **No keys in files.** If a source needs an API key (Mapillary, Geograph, Europeana's full API,
   NLS tiles), ask the human on the board and in your report; do not sign up for anything yourself.

## 5. Output formats

All JSON is UTF-8, two-space indented, keys in the order shown. Coordinates are WGS84 decimal degrees
with at least 6 decimals. Dates are ISO 8601. Every file has `"schemaVersion": 1`.

### 5.1 Layout

    data/
      README.md                       what is here, how to validate, who reads what (40 lines max)
      landmarks/<landmarkId>.json     D1, D2, D3, D8 (one per landmark)
      eras/<eraId>.json               D4 to D7, structured (one per landmark and year)
      eras/<eraId>.notes.txt          D4 as plain text in the Historian's research-notes format
      reference/<landmarkId>.jpg      the chosen 16:9 reference photo, 1600x900, JPEG quality 85
      ATTRIBUTION.md                  every third-party file used or shown, with licence and author
      SOURCES.md                      the source catalogue as you actually used it (section 7, corrected)

`<eraId>` is `eraIdOf(landmarkId, year)` from `@/lib/contracts`, for example `queens-tower_1893`.

### 5.2 `data/landmarks/<landmarkId>.json`

```json
{
  "schemaVersion": 1,
  "id": "queens-tower",
  "name": "Queen's Tower",
  "status": "validated",
  "subject": { "lat": 51.498352, "lng": -0.176891 },
  "photoSpot": { "lat": 51.498050, "lng": -0.176900 },
  "facingDeg": 0.0,
  "distanceM": 33.5,
  "captureRadiusM": 50,
  "geometryEvidence": [
    { "kind": "osm", "ref": "way/123456", "url": "https://www.openstreetmap.org/way/123456", "note": "tower footprint centroid" },
    { "kind": "wikidata", "ref": "Q...", "url": "https://www.wikidata.org/wiki/Q...", "note": "P625 within 12 m of OSM" }
  ],
  "photoSpotReason": "Public pavement on the south side of Imperial College Road, clear line of sight to the tower; OSM footway way/... is 4 m away.",
  "referencePhoto": {
    "status": "commons_stand_in",
    "file": "data/reference/queens-tower.jpg",
    "originalUrl": "https://upload.wikimedia.org/...",
    "pageUrl": "https://commons.wikimedia.org/wiki/File:...",
    "licence": "CC BY-SA 4.0",
    "author": "...",
    "takenAt": "2019-05-02",
    "takenFrom": { "lat": 51.4980, "lng": -0.1769 },
    "facingDeg": 2,
    "crop": "centre 16:9 from 4000x3000, top 12% removed",
    "notes": "Whole tower in frame, no people in the centre."
  },
  "eraYears": [1893, 1962],
  "eraYearsReason": {
    "1893": "Imperial Institute opened 10 May 1893; engravings and photographs of the opening survive.",
    "1962": "Institute demolition under way 1957 to 1965; the tower stands alone among new college buildings."
  },
  "rejectedYears": { "1887": "foundation stone only; no visual record of the site found" },
  "openQuestions": []
}
```

`status` is one of `validated`, `partial` (something below is still missing, listed in
`openQuestions`) or `blocked` (needs a human; say what). `referencePhoto.status` is one of
`h1_validated` (the team's own photo, best), `commons_stand_in` (an openly licensed present-day photo
taken from close to the photo spot, used until H1 arrives) or `missing`.

### 5.3 `data/eras/<eraId>.json`

```json
{
  "schemaVersion": 1,
  "eraId": "queens-tower_1893",
  "landmarkId": "queens-tower",
  "year": 1893,
  "status": "validated",
  "facts": [
    {
      "claim": "Queen Victoria opened the Imperial Institute on 10 May 1893.",
      "sources": [
        { "title": "Survey of London: Volume 38, ...", "url": "https://www.british-history.ac.uk/..." },
        { "title": "Imperial Institute - Wikipedia", "url": "https://en.wikipedia.org/wiki/Imperial_Institute" }
      ],
      "confidence": "high",
      "visible": true,
      "funFact": false
    }
  ],
  "dailyLife": [
    { "claim": "...", "sources": [{ "title": "...", "url": "..." }], "use": "dress" }
  ],
  "scene": {
    "description": "Facing north from the photo spot in 1893: ...",
    "persists": ["the tower itself"],
    "altered": ["..."],
    "notYetBuilt": ["..."],
    "gone": ["..."],
    "surroundings": "Through 360 degrees: ..."
  },
  "referenceImages": [
    {
      "url": "https://upload.wikimedia.org/wikipedia/commons/thumb/.../2048px-....jpg",
      "pageUrl": "https://commons.wikimedia.org/wiki/File:....jpg",
      "title": "Imperial Institute, south front, c. 1893",
      "date": "1893",
      "dateCertainty": "exact",
      "licence": "Public domain",
      "author": "...",
      "widthPx": 2048,
      "heightPx": 1365,
      "match": "same_view",
      "facingDeg": 0,
      "notes": "Taken from roughly where Imperial College Road now runs."
    }
  ],
  "guideGrounding": {
    "roles": [{ "role": "Porter at the Imperial Institute", "sources": [{ "title": "...", "url": "..." }] }],
    "dress": "...",
    "speech": "...",
    "prices": "...",
    "transport": "..."
  },
  "sources": [{ "title": "...", "url": "..." }],
  "gaps": ["No photograph dated exactly 1893 from this side; nearest is c. 1895."],
  "checkedAt": "2026-11-14T22:10:00Z"
}
```

Rules:
- `status`: `validated`, `thin_record` (the record is genuinely thin; what exists is valid and gaps
  are listed) or `rejected` (the year should be dropped; say why in `gaps` and in the landmark file).
- `facts`: at least 5 for `validated`, at least 3 of them `visible` (they change what the camera
  sees), at least 3 flagged `funFact` (surprising, short, true). `confidence` is `high` (meets rule
  4.3) or `medium` (one good secondary source; allowed only for non-date, low-stakes claims).
- `scene` maps one to one onto `SceneBrief` (`description`, `changes.persists`, `changes.altered`,
  `changes.notYetBuilt`, `changes.gone`, `surroundings`). Plain visual language a painter could use:
  materials, colours, heights, road surface, lighting, vehicles, signage, people. No interpretation.
- `referenceImages`: `match` is `same_view` (same subject from roughly the same side), `nearby`
  (same building, different side, or the same street a block away) or `context` (period and area
  right, place different). Only `same_view` and `nearby` go to the model. Aim for 2 to 4 of those.
  `url` is a **direct image file** URL that returns `image/jpeg` or `image/png`, 1024 to 2048 px on
  the long side (use the Commons `iiurlwidth` thumbnail, section 7). `date` is the year the image
  shows, not the upload date; `dateCertainty` is `exact`, `circa` (within 5 years) or `range`.
  Reject images dated more than 10 years from the era year unless nothing visible changed in between
  and you say so in `notes`.
- `sources`: the union of every URL cited above, deduplicated, each with a human title. This becomes
  `Era.sources` and is what the Sources drawer shows.

### 5.4 `data/eras/<eraId>.notes.txt`

The same content as plain text in **exactly** the format of the Historian's research phase
(`buildResearchPrompt` in `src/lib/historian/prompt.ts`), so Agent 1 can feed it straight into the
writing phase and skip the Historian's own web search:

    FACTS:
    - The Imperial Institute was opened by Queen Victoria on 10 May 1893. [https://...] [https://...]
    DAILY LIFE:
    - ... [https://...]
    SCENE FROM THE PHOTO SPOT:
    - Facing north: ...
    ALL AROUND:
    - ...
    IMAGES:
    - https://upload.wikimedia.org/...2048px-....jpg (page: https://commons.wikimedia.org/wiki/File:..., Public domain, c. 1893, same view)
    GAPS:
    - ...

Generate it from the JSON with a script (`scripts/data/notes.ts`), never by hand, so the two never
disagree.

### 5.5 `data/reference/<landmarkId>.jpg`

1600x900 JPEG, quality 85, sRGB, EXIF stripped except orientation already applied. Made from the
chosen photo by cropping to 16:9 around the subject (never stretching), then resizing. Reason: the
edit models centre-crop anything that is not 16:9 (Agent 2's finding, `notebook/agent-2.md`), so the
crop must be chosen by a person or by you, not by the model. Keep the crop box in `referencePhoto.crop`.

### 5.6 `data/ATTRIBUTION.md`

One table row per third-party file: file page, author, licence, licence URL, where it is used
(`reference photo`, `model input for <eraId>`, `shown in app`). CC BY and CC BY-SA require this.

## 6. Validation

### 6.1 The validator

Write `scripts/data/validate.ts`, run with `npx tsx scripts/data/validate.ts` (add `--online` to
also fetch URLs). Zod schemas for 5.2 and 5.3 in `scripts/data/schema.ts`. Pure checks in
`scripts/data/checks.ts` with unit tests in `scripts/data/checks.test.ts` (these run in
`npm run check`). Import types and helpers from `@/lib/contracts` (`eraIdOf`, `haversineM`,
`bearingDeg`), and `isGoogleUrl` from `@/lib/historian`. It prints one line per problem and exits 1
if there is any. Offline checks:

- Every file parses and matches its schema; `eraId` equals `eraIdOf(landmarkId, year)`; every year in
  a landmark's `eraYears` has an era file and vice versa.
- Coordinates are inside the box lat 51.490 to 51.505, lng -0.185 to -0.165 (South Kensington).
  `distanceM` equals `haversineM(photoSpot, subject)` within 1 m and is between 15 and 200 m;
  `facingDeg` equals `bearingDeg(photoSpot, subject)` within 2 degrees.
- Every fact, daily-life item and role has at least one source; every source URL is http(s) and not
  a Google host; `high` facts meet rule 4.3 (two sources, or one whose host is on the scholarly list
  in `checks.ts`).
- `validated` eras meet the counts in 5.3. `scene` lists are non-empty strings, no duplicates.
- Every reference image has a whitelisted licence, an author, a `pageUrl`, a long side 1024 to
  2048 px, a `date`, and a `url` on `upload.wikimedia.org` or another host on the allowlist in
  `checks.ts`. No Google hosts anywhere.
- Every file in `data/reference/` is 1600x900 (read the JPEG header) and under 600 KB.
- `notes.txt` exists for every era, has the six headings in order, and is what `scripts/data/notes.ts`
  produces from the JSON (regenerate and compare).
- Every image and reference photo appears in `ATTRIBUTION.md`.

With `--online`, additionally: every image `url` answers 200 with an `image/*` content type; every
source URL answers 200 to 399 (record 403s as warnings, since some archives block scripts; open those
in a browser yourself before trusting them).

### 6.2 Checks only you can do (record each in your notebook)

- **Look at every image you keep.** Download the thumbnail to `spikes/agent-5/cache/` and view it.
  Confirm it shows what `title` says, from the side `match` claims, and that nothing in it
  contradicts its `date` (vehicles, clothing, buildings that did not yet exist).
- **Stand in the photo spot on a map.** Check on OpenStreetMap that `photoSpot` is on a public
  pavement or open space, not inside a building or in the road, with a clear line of sight to the
  subject.
- **Read the source, not the snippet.** Open each scholarly source and find the sentence that supports
  the claim. Search results and summaries are not sources.
- **Adversarial pass.** For every `validated` era, run the verifier prompt (9.5) in a fresh subagent
  that did not do the research, and fix or downgrade everything it disputes.

## 7. Where to look: the source catalogue

Verify each endpoint before relying on it and record what worked in `data/SOURCES.md`. Parameters
below are believed correct as of 14 Nov 2026 but were not run while writing this file.

| Source | Gives | How | Licence |
|---|---|---|---|
| **Wikimedia Commons** | Dated, geotagged photos, prints, engravings, present-day stand-ins | API `https://commons.wikimedia.org/w/api.php`. Geosearch: `action=query&list=geosearch&gscoord=<lat>|<lng>&gsradius=500&gsnamespace=6&gslimit=100&format=json`. Categories: `list=categorymembers&cmtitle=Category:<name>&cmtype=file&cmlimit=500`. Search: `list=search&srnamespace=6&srsearch=<words>`. Metadata and a direct thumbnail: `prop=imageinfo&iiprop=url|size|mime|extmetadata&iiurlwidth=2048&titles=File:<name>` (read `thumburl`, `extmetadata.LicenseShortName`, `Artist`, `DateTimeOriginal`, `ImageDescription`) | Per file; read `extmetadata` |
| **Wikidata** | Inception, demolition, architect, heritage status, coordinates, Commons category | SPARQL at `https://query.wikidata.org/sparql?format=json&query=...`; `wikibase:around` with `wikibase:center "Point(<lng> <lat>)"^^geo:wktLiteral` and `wikibase:radius "0.5"`. Properties: P625 coordinates, P571 inception, P1619 official opening, P576 dissolved or demolished, P84 architect, P1435 heritage designation, P373 Commons category | CC0 |
| **OpenStreetMap** | Building footprints, pavements, present-day geometry | Overpass `https://overpass-api.de/api/interpreter` with `[out:json];(way(around:150,<lat>,<lng>)[building];way(around:60,<lat>,<lng>)[highway=footway];);out center tags;` | ODbL; cite |
| **Survey of London** (British History Online) | Building-by-building history of South Kensington with dates | `https://www.british-history.ac.uk/`, Survey of London volume 38 (South Kensington Museums Area) is the likely core; confirm the volume. Read online; cite chapter URLs | Free to read; cite, do not copy plates |
| **Historic England, National Heritage List** | Listing descriptions with dates and architects | `https://historicengland.org.uk/listing/the-list/` entry pages | Text citable; archive images cite only |
| **Institutions' own histories** | Imperial College, Royal Albert Hall, V&A, Natural History Museum pages on their buildings | Their websites and online archives | Text citable; images usually not reusable, check each |
| **Wikipedia** | Orientation, leads to primary sources | Read the article and follow its references | CC BY-SA text; cite |
| **Internet Archive and HathiTrust** | Contemporary guidebooks, The Builder, Illustrated London News, maps of the period | Full-text search; public domain before 1931 in most cases | Check each item |
| **National Library of Scotland maps** | Ordnance Survey maps 1860s to 1960s: what stood where | Read the georeferenced viewer at `https://maps.nls.uk/geo/explore/` to confirm footprints for `scene` and `surroundings`. Tile access needs a key: ask the human, do not use as model input | Non-commercial with attribution |
| **Geograph, Europeana, Flickr Commons, Mapillary** | More dated, located photos | Need API keys (ask the human) or careful manual browsing; use only files whose page states a whitelisted licence | Per item |
| **Google Street View, Maps, Earth** | Nothing | Never | Forbidden as input (section 4.1) |

## 8. Work plan and the loop

### 8.1 Tasks

Tick these in `notebook/agent-5.md`. P0 first: the demo depends on them.

| Id | Task | Priority |
|---|---|---|
| A5-01 | Set up: `spikes/agent-5/` (package.json, `.gitignore` with `cache/`), `data/README.md`, `scripts/data/schema.ts`, `checks.ts` with tests, `validate.ts`, `notes.ts`. Commit with an empty `data/` that validates | P0 |
| A5-02 | Source catalogue: try every row in section 7 once on Queen's Tower, record what works in `data/SOURCES.md` | P0 |
| A5-03 | D1 geometry for all six landmarks (`data/landmarks/*.json`, `status: partial` until the photo is done) | P0 |
| A5-04 | D3 year validation for all six: confirm, replace or drop each candidate year with reasons. Target 2 years per landmark, 3 where the record is rich | P0 |
| A5-05 | Era dossiers for `queens-tower_1893` and `huxley-building_*` (the venue): facts, scene, guide grounding, notes.txt | P0 |
| A5-06 | Reference images for those eras: Commons search, licence and date checks, look at each one | P0 |
| A5-07 | D2 present-day stand-in reference photos for all six (Commons, CC BY or BY-SA or PD, taken near the photo spot facing the subject), cropped to `data/reference/*.jpg` | P0 |
| A5-08 | Board `ASK`s in section 10, once A5-05 has one validated era to point at | P0 |
| A5-09 | Era dossiers and images for every remaining year | P1 |
| A5-10 | Adversarial verification (9.5) of every validated era; fix or downgrade | P1 |
| A5-11 | `--online` validation pass, `ATTRIBUTION.md` complete, final report | P1 |
| A5-12 | H1 intake (9.6) whenever the team's photos arrive: replaces stand-ins and photo spots | When photos arrive |

### 8.2 The loop

Repeat until section 11 holds:

1. Pick the highest-priority item that is not `validated` and not blocked.
2. Research with the matching prompt in section 9. Use subagents for independent landmarks in
   parallel; keep the judgement (what to keep) for yourself.
3. Write or update the JSON. Regenerate `notes.txt`. Run the validator. Fix what it reports.
4. Do the human-only checks in 6.2 for what you added.
5. If the item passes, mark it `validated`. If it fails, try the next strategy in 8.3. After three
   strategies with nothing new, mark it `thin_record` or `rejected` with the reasons and move on.
   Come back to `thin_record` items once everything else is done.
6. Every item finished, or every hour, whichever comes first: notebook entry, board post, commit,
   pull with rebase, `npm run check`, push.

### 8.3 Strategies when an item is stuck

Try them in order, recording each attempt in the notebook so a resumed session does not repeat it:

1. Different names: the building's earlier and later names (for example the Imperial Institute for
   Queen's Tower; earlier institutions on the same site), street names as they were then.
2. Different source types: Commons category tree upward and sideways (the building, the street, the
   district, "<year> in London"), Wikidata's P373 category, the Survey of London plates list, the
   Internet Archive's scans of period guidebooks and illustrated papers.
3. Different years: a year a few years either side with a much better record, then propose the swap
   in A5-04 (the year must still show something worth seeing).
4. If a key or a login would unlock it, write down exactly which source and why, and add it to the
   blocked list for the human.

## 9. Ready prompts

Use these as written. Fill the `<...>` parts. Each subagent prompt is self-contained because a
subagent starts with none of your context.

### 9.1 Kick-off (first session)

    Read AGENT5.md. You are Agent 5, the Archivist. Follow its section 0, then run the loop in
    section 8.2 starting at A5-01. Work continuously: do not stop to ask for approval, commit and push
    as section 3 says, and only stop when section 11 is met or every remaining item needs a human.
    When you stop, say in your final message exactly what is blocked and on whom.

### 9.2 Resume (any later session)

    Read AGENT5.md. You are Agent 5. Read notebook/agent-5.md "Current state" and the board since the
    post it names, then continue the loop in section 8.2 from where it stopped. Do not redo attempts
    the notebook already lists. Work continuously until section 11 is met or everything left needs a
    human.

### 9.3 Subagent: era research (one landmark and year)

    You are a careful local historian of South Kensington, London, researching one place in one year
    for a public-history game. Work only from sources you open and read; snippets are not sources.

    Place: <landmark name> (<one-line description>). Year: <year>.
    The viewer stands at <photoSpot lat>, <lng>, facing <facingDeg> degrees (<compass word>) towards
    <subject lat>, <lng>.

    Find, with the URL of the page that states each one:
    1. FACTS: at least 8 dated, specific facts about this place in or within 3 years of <year>. Mark
       which ones change what a camera at the viewer's position would see. Prefer the Survey of
       London (British History Online), Historic England listings, the institution's own history
       pages and contemporary publications. Wikipedia only as a lead or as a second source.
    2. VISIBLE SCENE: what that camera sees in <year>: buildings standing, under construction, not
       yet built, already gone; materials and colours; road surface, lighting, vehicles, signage;
       who is about. Then what surrounds the viewer through 360 degrees.
    3. DAILY LIFE: dress, transport, prices, customs typical of this area in <year>.
    4. ROLES: three everyday occupations a person could plausibly have had at this exact place in
       <year> (porter, attendant, student, cab driver...), each with a source. Never a real named
       person.
    5. GAPS: what you looked for and could not confirm.

    Rules: no Google Maps, Street View or Earth. If two sources disagree, give both. Do not guess.
    Return plain text under the headings FACTS, VISIBLE SCENE, ALL AROUND, DAILY LIFE, ROLES, GAPS,
    each item followed by its URL(s) in square brackets.

### 9.4 Subagent: period image hunt (one landmark and year)

    Find openly licensed period images of <landmark name>, London, as it looked in or near <year>.
    The viewer stands at <photoSpot lat>, <lng> facing <facingDeg> degrees (<compass word>).

    Search Wikimedia Commons only (API at https://commons.wikimedia.org/w/api.php; send the header
    "User-Agent: Chronodex-hackathon-archivist/0.1"; one request per second). Use, in this order:
    geosearch within 500 m of the viewer (namespace 6), the Commons categories for the building and
    its earlier names, full-text search for the building plus the decade, and category members of
    "<decade>s in London" narrowed by the street name.

    For every candidate, call prop=imageinfo with iiprop=url|size|mime|extmetadata and iiurlwidth=2048
    and report: file page URL, direct thumbnail URL (thumburl), width and height of that thumbnail,
    LicenseShortName, Artist, the date the image depicts (from the description, not the upload), and
    your judgement of match: same_view, nearby or context.

    Keep only licences that are public domain, CC0, CC BY or CC BY-SA. Drop anything else and
    anything on a Google host. Return at most 12 candidates, best first, as a JSON array.

### 9.5 Subagent: adversarial verifier (one era)

    You are a fact-checker who did not do this research and wants to find its mistakes. Read
    data/eras/<eraId>.json in this repository. For every fact: open each cited URL and check that the
    page actually states the claim, with the same date and name. For every reference image: open its
    pageUrl and check the licence, the author and the date it depicts; view the image at url and check
    it shows what its title says from the side its match claims. For the scene: check that nothing
    listed under persists or altered had been demolished by the year, and nothing listed was built
    after it.

    Return a JSON array of problems: { "path": "facts[3]", "problem": "...", "evidence": "<url and
    quote>", "fix": "drop | downgrade to medium | correct to ..." }. Return [] only if you checked
    everything. Do not edit any file.

### 9.6 H1 intake (when the team's photos arrive)

    The team's reference photos are in <folder>. For each landmark: read EXIF (GPS, direction if
    present, time, orientation) with exifr in spikes/agent-5; reject a photo that is blurred, not
    landscape, missing the subject's top, or taken more than 40 m from the planned photo spot; pick
    the best of the three; crop it to 16:9 around the subject and save data/reference/<id>.jpg at
    1600x900 quality 85; set referencePhoto.status to h1_validated with the EXIF facts; and if the
    EXIF GPS is good (accuracy better than 15 m, or several shots agree within 10 m) move photoSpot to
    it and recompute distanceM and facingDeg. Re-run the validator. Post an FYI to Agents 1 and 2 that
    reference photos and photo spots changed.

### 9.7 Final audit (before you report done)

    Run npx tsx scripts/data/validate.ts --online. For every landmark and era, re-read the JSON and
    answer: would a sceptical judge accept each fact and image from its receipt alone? List anything
    that would embarrass the team on stage, fix it or downgrade it, then write the final report in
    notebook/agent-5.md: per landmark and year, status, fact count, image count with licences, and
    every open question with who must answer it.

## 10. Hand-off to the other agents

Your data reaches the app only through other agents' code. Post these `ASK`s on the board once you
have one validated era to point at (A5-08). Each is small; none changes a frozen contract.

| To | Ask |
|---|---|
| `@agent-1` | (1) Seed: read `data/landmarks/*.json` when present and use its `subject`, `photoSpot`, `captureRadiusM`, `eraYears` and the reference photo in `data/reference/` instead of the fixture values. (2) Historian: add an optional `researchNotes` to `WriteEraBriefOptions`; when `data/eras/<eraId>.notes.txt` exists, skip the web-search phase and run the writing phase on those notes (cheaper, faster, and every fact pre-checked). (3) Copy `data/eras/<eraId>.json` `sources` into `Era.sources` if the brief's own list is shorter |
| `@agent-2` | Scene and panorama stages: take `SceneBrief.referenceImageUrls` as direct image URLs (they now are), at most 4 after the reference photo. The reference photo is already 16:9 at 1600x900, so no crop is needed |
| `@agent-4` | Sources drawer: show licence and author for images from `data/ATTRIBUTION.md` (needed for CC BY and BY-SA) |
| `@team` | Keys you may want: NLS maps (MapTiler), Europeana, Geograph, Mapillary. A contact string for the User-Agent if Wikimedia asks. And the H1 photos, which still beat any stand-in |

If a year should change, post a `CONTRACT`-kind post to `@team` and `@agent-1`: `eraYears` lives in
Agent 1's fixtures and the database, and changing it changes what players see.

## 11. Definition of done

- Every one of the six landmarks has `data/landmarks/<id>.json` with `status: validated`, or
  `partial` only because H1 photos are missing while a validated Commons stand-in is in place.
- Every year in every `eraYears` has an era file with `status: validated`, or `thin_record` with the
  gaps written down. At least 10 eras in total, at least 2 per landmark unless a year was rejected
  with reasons and no better year exists.
- Every validated era: at least 5 sourced facts (3 visible, 3 fun), a complete scene, guide grounding
  with 3 roles, and 2 or more `same_view` or `nearby` images. Where no such image exists anywhere
  openly licensed, that is stated in `gaps` with the searches tried.
- `npx tsx scripts/data/validate.ts --online` exits 0. `npm run check` passes. Every era passed the
  verifier in 9.5 with all disputes resolved.
- `ATTRIBUTION.md` and `SOURCES.md` are complete. The board `ASK`s in section 10 are posted.
- The final report (9.7) is in `notebook/agent-5.md` and the work is pushed to `main`.

## 12. State of play at hand-off (14 Nov, 20:31)

- **No real data exists yet.** Fixtures use estimated photo spots and `/mock/reference.svg`.
- **Coordinates:** subjects were checked against OpenStreetMap by Agent 3 (up to 66 m off the
  original guesses, see `spikes/agent-3/src/lib/landmarks.ts`); photo spots are estimates.
- **Candidate years** (`fixtures/landmarks.ts`): huxley-building 1885, 1961; queens-tower 1893, 1962;
  royal-albert-hall 1871; exhibition-road 1862, 2011; v-and-a 1941; natural-history-museum 1862, 1881.
  Only the first row of `MASTER.md` section 12 was checked against a source, and even that should be
  re-checked: confirm which building "Huxley Building, 180 Queen's Gate" refers to in each year.
  Treat every year as a hypothesis.
- **Historian** (Agent 1, `src/lib/historian/`): moved from Claude to DeepSeek (commit a76fc33), with
  web search and page reading. Its research notes keep the format in 5.4. Its validator strips Google
  image URLs. Check `notebook/agent-1.md` for whether it has run against the real API yet.
- **Pipeline and voice** (Agent 2): `src/lib/fal`, the pipeline stages, `runEraJob`, the worker and the
  upload and voice routes landed on `main` at 20:40. Read `src/lib/pipeline/` for how
  `referenceImageUrls` and the reference photo are actually passed to the models before A5-08.
- **Image models** (Agent 2): the edit models centre-crop non-16:9 input; panorama is Nano Banana Pro
  outpainting a 2:1 canvas with the scene at the centre (`centreBearingDeg` = bearing from photo spot
  to subject). Agent 2's spikes used one Commons photo of Exhibition Road (CC BY-SA 4.0).
- **H1 photos:** not delivered as of this writing. Ask the team before assuming they will not come.
- **Deadline:** assumed Sunday midday (`MASTER.md` Q1). Demo eras are meant to be generated
  overnight (M4, Sun 02:00), so P0 data is needed well before then.
