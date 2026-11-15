# Agent 5 handover to Astra

Written 2026-11-15 00:40 by Agent 4, who stood in for Agent 5 for about 45 minutes at the human's
request. **Astra is now Agent 5 (the Archivist).** Start with:

    Read AGENT5.md. You are Agent 5. Then read notebook/agent-5-handover.md and notebook/agent-5.md.

Everything found so far is written below, because `spikes/agent-5/cache/` (downloads) is
git-ignored and may not be on your machine. Nothing here has been written to `data/` yet.

## 1. Read first

1. `AGENT5.md`: the brief (mission, output formats, validation, source catalogue, work loop).
2. `notebook/agent-5.md`: "From the human" (phone test round 1) is the priority list. In short:
   **Queen's Tower 1893 period images first, for Agent 2's realism bake-off; post to Agent 2 as soon
   as that one era is ready.** Then plain visual detail for the prompts, then notes on real colours
   (colour or monochrome choice), then the other eras in `MASTER.md` section 12 order.
3. `notebook/agent-5-guideline.md`: the method in plain words, written for the human. Keep it current.
4. `spikes/agent-5/RESEARCH_BRIEF.md`: Agent 5's method sheet for researchers (also a good checklist
   for doing the research yourself).

## 2. Constraints from the human (15 Nov)

- **No subagents.** Six researcher subagents were stopped at about 00:20 because they cost too much.
  Do the research yourself, one landmark at a time.
- Commit and push to `main` without asking (standing instruction since 14 Nov 20:25). Stop only on a
  rebase conflict or a failing check. Never force-push. Never commit `spikes/agent-5/cache/`.
- On this Windows machine (Node 26.13.1) run tests with `npx vitest run --pool=vmThreads`; the
  default pool fails every file. Typecheck and lint are normal.

## 3. What exists (all on `main`)

| Path | State |
|---|---|
| `scripts/data/schema.ts` | Zod schemas for `data/landmarks/*.json` and `data/eras/*.json` (Agent 5, 14 Nov) |
| `scripts/data/checks.ts` | Pure rule checks (Agent 5). **No unit tests yet** (`checks.test.ts` is A5-01's open item; Haiku may write it) |
| `scripts/data/files.ts`, `notes.ts`, `attribution.ts` | File IO, notes.txt renderer, ATTRIBUTION.md renderer (Agent 5) |
| `scripts/data/validate.ts` | Written 15 Nov. `npx tsx scripts/data/validate.ts [--era <eraId>] [--online]`. Passes on an empty `data/` |
| `scripts/data/build.ts` | Written 15 Nov. Rewrites each era's `sources` from what it cites, writes notes.txt and ATTRIBUTION.md |
| `spikes/agent-5/commons.mjs` | Written 15 Nov. Polite cached Commons client: `search`, `cat`, `geo`, `info`, `get` (see its header) |
| `spikes/agent-5/geo.mjs`, `outline.mjs` | Agent 5's OSM checks. Need `cache/osm/geom.json` (git-ignored; re-download with Overpass if missing) |
| `data/` | **Does not exist yet.** No landmark or era file has been written |

Open A5-01 items: `checks.test.ts`, `data/README.md`.

## 4. Photo spots (A5-03): decided and map-checked, not yet written

Agent 5 placed these from OpenStreetMap on 14 Nov; Agent 4 checked them with `geo.mjs` on 15 Nov.
All are on or within 4.4 m of a footway, sidewalk or pedestrian way, none is inside a building, and
the sight line crosses only the subject. Write them to `data/landmarks/<id>.json` once each
landmark's years are settled (the validator requires an era file for every year listed).

| Landmark | Subject | Photo spot | Facing | Distance | OSM / Wikidata |
|---|---|---|---|---|---|
| queens-tower | 51.498351, -0.176890 | 51.497930, -0.176890 (Imperial College Road, pedestrian part, south edge of Queen's Lawn / Dangoor Plaza) | 0 | 46.8 m | way/788526940, Q7270127 |
| huxley-building | 51.498829, -0.179094 | 51.498700, -0.179880 (west pavement of Queen's Gate, just south of Queen's Gate Terrace) | 75 | 56.3 m | relation/37787, Q86088084 |
| royal-albert-hall | 51.501015, -0.177410 | 51.501780, -0.177410 (north side of Kensington Gore, foot of the Albert Memorial steps) | 180 | 85.1 m | way/372860405, Q193639 |
| exhibition-road | 51.498117, -0.174037 | 51.497400, -0.174000 (west side outside the Science Museum entrance) | 358 | 79.8 m | way/2693172 and way/897247528, Q2905663 |
| v-and-a | 51.496650, -0.173520 | 51.496650, -0.173920 (west pavement outside the former Geological Museum) | 90 | 27.7 m | relation/29795, Q213322 |
| natural-history-museum | 51.495900, -0.176020 | 51.495465, -0.176020 (south pavement of Cromwell Road opposite the main entrance) | 0 | 48.4 m | way/24436446, Q309388 |

Compute `distanceM` and `facingDeg` with `haversineM` and `bearingDeg` from `@/lib/contracts` when
writing the files; the figures above are geo.mjs's rounding.

## 5. Queen's Tower 1893: work in progress

### 5.1 Period images found (Commons, all opened with `info` and looked at)

| # | File page | Direct URL for `url` | Size at that URL | Licence, author | Depicts | What it shows | Proposed match |
|---|---|---|---|---|---|---|---|
| 1 | https://commons.wikimedia.org/wiki/File:Gezicht_op_het_Imperial_Institute_te_Londen,_RP-F-00-4232.jpg | https://upload.wikimedia.org/wikipedia/commons/thumb/7/7f/Gezicht_op_het_Imperial_Institute_te_Londen%2C_RP-F-00-4232.jpg/1920px-Gezicht_op_het_Imperial_Institute_te_Londen%2C_RP-F-00-4232.jpg | 1920x1363 | CC0, Rijksmuseum | "in of na 1887 - ca. 1900" (range) | Sepia albumen print on a card mount (handwritten Dutch caption). The south front and the central tower from street level, at an angle along Imperial Institute Road. A striped brick-and-stone end tower with scaffolding in the left foreground; horse-drawn van, gas lamp posts, a man in a bowler hat, smooth road, kerbed paving. Best single image | same_view |
| 2 | https://commons.wikimedia.org/wiki/File:1903-11-04_front_Imperial_Institute_London.jpg | https://upload.wikimedia.org/wikipedia/commons/thumb/e/e2/1903-11-04_front_Imperial_Institute_London.jpg/1920px-1903-11-04_front_Imperial_Institute_London.jpg | 1920x1247 | Public domain, Unknown author | postcard sent 3 Nov 1903 ("1903", circa) | Printed postcard, raised view of the whole south front: central domed tower, a smaller domed tower at one end and a striped tower at the other, the road with carriages, red gabled buildings beyond. Handwriting and print on the card. Exactly 10 years after 1893, the limit | same_view |
| 3 | https://commons.wikimedia.org/wiki/File:Imperial_Institute_-_DPLA_-_7fdeed843c29aa33879ef0a06e674019.jpg | https://upload.wikimedia.org/wikipedia/commons/thumb/6/61/Imperial_Institute_-_DPLA_-_7fdeed843c29aa33879ef0a06e674019.jpg/960px-Imperial_Institute_-_DPLA_-_7fdeed843c29aa33879ef0a06e674019.jpg | 960x1571 (the 1920 and 1280 thumbs exceed 2048 px tall) | Public domain, Edmund F. Arras | 1913 | Pinkish negative-style print, portrait. The tower from street level with grown street trees, an awning lettered "IMPERIAL INST...", wide road. 20 years late | context (or nearby with an "unchanged" note about the tower only) |
| 4 | https://commons.wikimedia.org/wiki/File:Imperial_Institute_London_1.jpg | https://upload.wikimedia.org/wikipedia/commons/5/52/Imperial_Institute_London_1.jpg | 763x1098 (original) | Public domain, Anonymous (photographer) | published 2 Sep 1911 | Halftone. The striped end tower and its wing, an arched gateway (likely one of the 1891 domed gallery entrances), a young street tree | context unless dated nearer 1893 |

Facing directions were **not** settled. The Imperial College history page says the Institute had
smaller towers at the east and west ends; the red gabled buildings beyond the striped tower in
image 2 suggest that tower is the east end (towards the Royal College of Science), which would make
image 1 a view looking roughly west from the south-east. Confirm on the Survey's Plate 69a or a plan
before filling `facingDeg`; otherwise leave it null.

Rejected: `File:Imperial Institute.jpg` (544x432, too small), `File:Universal Races Congress seated
outside the entrance to the Imperial Institute, London, 1911.jpg` (700x571, too small),
`File:1911 Britannica-Architecture-Imperial Institute.png` (interior staircase),
`File:Imperial Institute Tower c1960 - geograph.org.uk - 132052.jpg` (427x640, too small; CC BY-SA 2.0,
David Wright; only a lead for the 1960s era), `File:Imperial tower in scaffolding.jpg` (2023).
Not yet opened: `File:Marble Halls Physick Darby 1973 Catalogue Entry 141 Imperial Institute Tower.jpg`
(PD claimed; a 1973 catalogue page, probably a design drawing), `File:Museum, Kensington (undated)
(37155791386).jpg` (CC BY 2.0, 1560x1001, a mid-century snapshot), `File:1903-11-04 back Imperial
Institute.jpg` (back of the postcard; probably text only).

Searches tried: category "Imperial Institute" (11 members, listed above), category "Queen's Tower,
Imperial College London" (modern photos plus the c1960 file), full-text `"Imperial Institute" London
189*` (noise: PDFs), `"Imperial Institute" photograph`, `"Imperial Institute" Illustrated London News`
(no engravings found that way), `intitle:"Imperial Institute"`, `intitle:"Imperial Institute Road"`
(nothing). **Not yet tried:** geosearch around 51.4980, -0.1769; categories "Imperial Institute Road",
"Imperial College Road", "1893 in London", "Illustrated London News 1893", "The Graphic 1893";
the Rijksmuseum's other London prints; Wellcome Collection; British Library Flickr (via Commons).
Two `same_view` images already meet the minimum of two; more helps realism.

### 5.2 Facts found, with the sentence located

Survey of London vol. 38, chapter "Imperial Institute":
https://www.british-history.ac.uk/survey-london/vol38/pp220-227 (scholarly, so one source makes a
fact `high`). Downloaded text: `spikes/agent-5/cache/queens-tower/txt/sol38-imperial-institute.txt`.

| Claim | Where in the Survey | Second source | Visible | Fun |
|---|---|---|---|---|
| Imperial Institute Road, on the building's south side, was laid out by Mowlem and Company in 1888-92 at a contract price of £5,825 | "Called Imperial Institute Road, it was laid out by Mowlem and Company in 1888–92 at a contract price of £5,825" | | yes (the road the viewer stands on) | |
| The foundation stone, of granite from the Cape on a pedestal of Indian bricks, was laid by Queen Victoria a fortnight after the 1887 Golden Jubilee | "The foundation stone (of granite from the Cape, on a pedestal of Indian bricks) was laid by the Queen a fortnight after the Jubilee" | | | yes |
| The central tower was built on internal scaffolding with walls nine feet thick at the base, reaching its full height of 287 feet by summer 1892 | "the central tower, built on internal scaffolding with walls nine feet thick at base, was approaching its full height of 287 feet" | Imperial College page: "287 feet tall" | yes | yes |
| The unfinished building was opened informally in June 1892; Queen Victoria opened it officially on 10 May 1893 and called it "a really momentous day, like a small Jubilee" | "in June the still-unfinished building was informally opened. The official opening by the Queen followed a year later on 10 May 1893—'a really momentous day, like a small Jubilee'" | Wikipedia (Commonwealth Education Trust article): "opened in 1893 by Queen Victoria" | | yes |
| The outside stone was Portland (Whitbed); Collcutt used red brick as if it were "more precious than the Portland stone" | "The stone used outside was Portland (Whitbed)"; Goodhart-Rendel quote | Imperial College page: "clad in Portland stone" | yes (colours) | |
| The peal of ten bells was cast by John Taylor of Loughborough | "The peal of ten bells ... were made by Messrs. John Taylor of Loughborough" | | | |
| The bells, the Alexandra Peal, were a gift from Mrs Elizabeth M. Millar of Melbourne, Australia, in 1892 | (not in the Survey) | Imperial College page (https://www.imperial.ac.uk/about/history/queens-tower/) and Wikipedia "Queen's Tower, London" | | yes |
| The opening took place in a temporary hall; the planned great hall was never built | "The opening ceremony took place in a temporary hall, as the erection of the great hall ... had been postponed ... but the great hall never" | | | yes |
| A billiard-room was added in 1893 to attract subscribing Fellows | "one significant addition in 1893 was a billiard-room" | | | yes |
| In 1889 The Builder called it the most important building under construction in England | "in 1889 The Builder pronounced it the most important building under construction in England" | | | yes |
| The Institute was 700 feet long, with the central tower and smaller towers at the east and west ends; four stone lions flanked the entrance | (not in the Survey) | Imperial College page (lines on design and lions) | yes | |
| The tower is topped by a copper-covered dome | (not in the Survey) | Imperial College page and Wikipedia | yes | |

Conflicts to record: steps to the dome, 324 (Imperial College page) vs 325 (Wikipedia); prefer
Imperial's own page. Restoration as a free-standing tower: 1966-68 (Imperial page) vs 1966 (Wikipedia).

For the second era (the hypothesis was 1962), the Survey says: demolition of the rear galleries
began in 1957; the east wing of the main range had been replaced by a College building by 1962; by
1965 the west wing had been demolished; the Institute was renamed the Commonwealth Institute in
1958 and moved to Holland Park in 1962. Imperial College: works 1966-68 made the tower stand alone.
Not yet decided whether 1962 or another year (for example 1965 to 1966, tower alone) is best.

Historic England list entry 1227441 (linked from Wikipedia) answered with a 5.5 KB page with no
listing text when fetched by script: open it in a browser before citing it.

### 5.3 Still to do for queens-tower_1893

- `dailyLife` (at least 5, each sourced): dress, transport (omnibus, cab, the District Railway at
  South Kensington), prices (admission, fares), customs, speech.
- `guideGrounding.roles` (3, each sourced): for example a porter or commissionaire at the Institute,
  an attendant in the galleries, a cab driver on the rank; find pages showing such people worked there.
- `scene` (description, persists, altered, notYetBuilt, gone, surroundings through 360 degrees),
  drawn from images 1 and 2 and the Survey (what stood east and west: the Commissioners' Eastern and
  Western Galleries, the Royal College of Science; what is gone today: everything except the tower).
- A "Real colours" note for Agent 2: Portland stone (pale grey-white), red brick bands on the
  towers, copper dome (new in 1893, so bright copper-brown rather than today's green: verify), slate
  or tile roofs; images 1 and 2 are sepia and halftone.
- Write `data/eras/queens-tower_1893.json`, run `build.ts` and `validate.ts`, then post to Agent 2
  on the board with the image URLs.

## 6. Other landmarks: what is already downloaded (on Agent 4's machine only)

`spikes/agent-5/cache/` holds Survey of London vol. 38 chapters for every landmark (Royal Albert
Hall pp159-176 and 177-195; the 1862 Exhibition and Natural History Museum pp137-147 and 201-216;
Exhibition Road and the museums pp49-73, 74-96, 97-123, 124-132, 196-200, 233-247, 248-256; Queen's
Gate pp325-348; V&A pp257-259), three vam.ac.uk history pages (100 facts, building the museum, the
V&A at war 1939-45), Wikipedia extracts for the Imperial Institute and the Queen's Tower, the Imperial
College Queen's Tower page, and OpenStreetMap geometry for the area. On another machine, fetch them
again from `https://www.british-history.ac.uk/survey-london/vol38/pp<range>`.

The research questions for each landmark (identity traps, which years to test) are in Agent 5's
researcher prompts. The most important ones:
- **huxley-building**: today's building is 1970s; it stands on the site of 180 Queen's Gate, a
  Norman Shaw house (believed 1883-85, demolished about 1971). "Huxley Building" was also the old
  name of the Science Schools on Exhibition Road (now the V&A's Henry Cole Wing): keep the two apart.
- **royal-albert-hall**: only one candidate year (1871); propose a second.
- **v-and-a**: check whether the bomb damage is 1940 or 1941; propose a second year (1909 opening?).
- **natural-history-museum**: 1862 means the International Exhibition building on the site.
- **exhibition-road**: confirm when the shared-space scheme finished (2011 or 2012).

## 7. Board and notebook

- Board posts from this stand-in: 15 Nov "A5-01" FYI (rescue and validator). Nothing addressed to
  Agent 5 is unanswered.
- `notebook/agent-5.md` has the 00:28 and 00:40 log entries and an attempts-log table; this handover is linked
  from its Current state block.

## 8. Update, 2026-11-15 01:25: what Astra (Agent 5 in Codex) did, and what is left

Astra's first delivery was found uncommitted and committed by Agent 4 (11004ef). It validates offline
(1 landmark, 2 eras). It is `thin_record`, honestly, not generation-ready.

**Done**
- `data/queens-tower_1893`: 10 sourced facts, 6 daily-life items, 3 guide roles, 2 `same_view` images
  (CC0 Rijksmuseum photograph; public-domain 1903 postcard), notes.txt, gaps listed.
- `queens-tower_1962`: 5 sourced chronology facts only, no images, no daily life or roles.
- `data/landmarks/queens-tower.json` (status `partial`, no reference photo), `data/README.md`,
  `data/SOURCES.md`, `data/ATTRIBUTION.md`. Board post to Agents 1, 2 and 4 sent at 00:50.
- Astra worked without subagents and without paid calls, as asked.

**Left, in priority order**
1. **Queen's Tower 1893 to `validated`**: a verified plan or photograph of the southern (rear) side
   for the 360 view; the dome's real colour (new copper vs patina), brick hue, roof covering, road
   paving, lamp fuel; admission prices and fares; gallery-attendant uniform. Agent 2 can already try
   the two images for a forward-view trial.
2. **Queen's Tower 1962 (or a better year, e.g. 1965 to 1966 with the tower alone)**: at least two
   qualified dated images, daily life, three roles, a full scene. The c.1960 David Wright photo is too
   small (427x640).
3. **Reference photo for queens-tower** (A5-07): a licensed present-day 16:9 stand-in near the photo
   spot, or the team's H1 photo (A5-12); then confirm public access at the spot.
4. **The other five landmarks, nothing started** (A5-03 to A5-06, A5-09): huxley-building (keep
   180 Queen's Gate apart from the old "Huxley Building" on Exhibition Road), royal-albert-hall (needs a
   second year), exhibition-road (2011 or 2012), v-and-a (1940 or 1941; second year), natural-history-museum
   (1862 and 1881). Land each as soon as one era is usable and post to Agent 2.
5. **A5-01 leftovers**: `scripts/data/checks.test.ts` (nothing yet; no subagents, so write by hand or
   leave to a cheap Haiku run with the human's approval).
6. **A5-08 asks**: Agent 1 (seed reads `data/landmarks`, Historian takes `notes.txt`) and Agent 4
   (licence and author in the Sources drawer) are still to be posted. Agent 1 has already stored a real
   Queen's Tower 1893 brief of its own, so the notes route needs to be agreed with them.
7. **A5-10, A5-11**: manual source-to-claim audit of each validated era, `--online` validation
   (BHO and Imperial returned 403 to scripts; open them in a browser), final report.

Note for the team: the board shows Agent 1 stored its own Queen's Tower 1893 brief (Thomas Reeves, hansom
cab driver) before Astra's data landed. Agent 1 and Astra should agree whether the Historian re-runs on
`data/eras/queens-tower_1893.notes.txt`.
