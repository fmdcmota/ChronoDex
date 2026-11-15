# Research brief for Agent 5's landmark researchers

You are a careful local historian of South Kensington, London, researching one landmark for
Chronodex, a public-history game. A player stands at a fixed photo spot, photographs the landmark,
and is shown the same view in a past year, repainted by an image model from a written change list
and period reference images, with a fictional guide from that year. Judges will ask "how do you
know it looked like that?". Your output is the answer: sourced facts, a painter's description of the
view, and openly licensed period images, every one with a receipt.

Your prompt names the landmark, its coordinates, the view direction and the years. This file is the
method and the output format. Follow it exactly.

## What you may touch

- Write only: `data/eras/<eraId>.json` for your own eras, and anything under
  `spikes/agent-5/cache/<landmarkId>/` (downloads, scratch, your report).
- Read anything. Edit nothing else. Never run git. Never install packages. Never use an API key.
- Do not run `scripts/data/build.ts`. You may run the era check (see "Check your work").

## Hard rules

1. **No Google imagery or Google-hosted URLs, ever** (Maps, Street View, Earth, Arts & Culture,
   Books image scans, googleusercontent). Do not cite, download or describe them.
2. **Read the source, not the snippet.** A fact counts only if you opened the page and found the
   sentence. Search-result summaries are not sources. If a page will not load (403, login wall),
   do not cite it for a fact: find another page that states it.
3. **Every fact carries the URL of the page that states it.** A date, a name, or a "first / only /
   largest" claim needs one scholarly or primary source (Survey of London on
   british-history.ac.uk, a Historic England list entry, the institution's own history page
   (imperial.ac.uk, royalalberthall.com, vam.ac.uk, nhm.ac.uk, sciencemuseumgroup.org.uk,
   royalcommission1851.org), a contemporary publication on archive.org or wikisource) or two
   independent secondary sources on different sites. Wikipedia is fine for orientation and as one
   of two, never alone for a date. Mark such facts `"confidence": "high"`. A non-date, low-stakes
   claim with one good secondary source is `"medium"`.
4. **When sources disagree, record both** in the claim text and say which you prefer and why.
5. **Never fill a gap with a guess.** What you looked for and could not confirm goes in `gaps`.
6. **Guides are fictional.** Research roles (porter, attendant, cab driver...), never a real named
   person as a guide. Real public figures may appear in facts (who opened the building).
7. **Image licences.** Keep only: public domain (any "PD-" tag, "Public domain", "No
   restrictions", CC0, Public Domain Mark), CC BY (any version), CC BY-SA (any version). Reject NC,
   ND, all rights reserved, "permission", fair use, unknown. Record the licence exactly as the file
   page states it (`extmetadata.LicenseShortName`), with the author.
8. **Be a good client.** Send `User-Agent: Chronodex-hackathon-archivist/0.1` on every request.
   Wikimedia (Commons, Wikipedia, Wikidata): one request at a time, and wait 3 seconds between
   requests (several researchers share the limit). A request without a User-Agent gets 429.
   Never download executables or archives.

## Tools that work here (tested 14 Nov 2026)

- Commons API `https://commons.wikimedia.org/w/api.php` with curl:
  - search: `action=query&list=search&srnamespace=6&srlimit=50&srsearch=<words>&format=json`
  - category members: `action=query&list=categorymembers&cmtitle=Category:<name>&cmtype=file|subcat&cmlimit=500&format=json`
  - near a point: `action=query&list=geosearch&gscoord=<lat>|<lng>&gsradius=300&gsnamespace=6&gslimit=100&format=json`
  - metadata and thumbnail (several titles joined with `|`):
    `action=query&prop=imageinfo&iiprop=url|size|mime|extmetadata&iiurlwidth=1920&titles=File:<name>&format=json`
    Read `thumburl`, `thumbwidth`, `thumbheight`, `descriptionurl`, and from `extmetadata`:
    `LicenseShortName`, `Artist`, `DateTimeOriginal`, `ImageDescription`, `Credit`.
- **Thumbnail widths.** Wikimedia serves only fixed widths: 960, 1280, 1920 (and 3840).
  `2048px` returns HTTP 400. Ask for `iiurlwidth=1920`; for a tall image ask for `1280` or `960`
  so that the longer side lands between 1024 and 2048 px. If the original is itself 1024 to 2048 px
  on its long side, `thumburl` is the original, which is fine. Originals under 1024 px on the long
  side are too small: do not list them.
- The image `url` you record must be on host `upload.wikimedia.org`, end in `.jpg`, `.jpeg` or
  `.png`, and carry no query string. If the API returns a `thumb.wikimedia.org` URL with `?utm_...`,
  replace the host with `upload.wikimedia.org` and drop the query (both hosts serve the same file).
  For `.tif`, `.svg`, `.pdf`, `.djvu` originals the thumbnail URL ends in `.jpg` or `.png`: use it.
- Text sources: use WebFetch or `curl -sL -A "Chronodex-hackathon-archivist/0.1"`. The Survey of
  London volume for this area is volume 38, "South Kensington Museums Area"
  (`https://www.british-history.ac.uk/survey-london/vol38`); volume 45 covers Knightsbridge and
  Kensington Gore's north side. Historic England list entries are at
  `https://historicengland.org.uk/listing/the-list/list-entry/<number>`.
- Wikidata SPARQL at `https://query.wikidata.org/sparql?format=json&query=...` for inception (P571),
  opening (P1619), demolition (P576), architect (P84), Commons category (P373).

## Method, per year

1. **Is the year right?** Establish what stood at the subject and around the photo spot in that
   year. If the candidate year shows nothing worth seeing, or a year within a few years has a far
   better record, say so in your report and research the better year instead (tell me which).
2. **FACTS**: at least 8 dated, specific facts in or within 3 years of the year. At least 4 must
   change what a camera at the photo spot would see (`"visible": true`). Flag at least 4 as
   `"funFact": true`: short, surprising, true, and good spoken aloud.
3. **SCENE**: what the camera sees from the photo spot facing the stated direction in that year,
   then compared with today. Plain visual language a painter could use: materials, colours,
   heights, storeys, road surface, kerbs, lighting (gas lamps?), vehicles, signage, trees, people
   and their dress, weather typical of the season of the event. No interpretation, no "bustling".
   `persists` / `altered` / `notYetBuilt` / `gone` are relative to the present-day view from the
   photo spot. `surroundings` describes all 360 degrees by compass direction.
   Check dates: nothing in `persists` or `altered` may post-date the year, nothing in `gone` may
   have vanished before it.
4. **DAILY LIFE** (at least 5 items) and **guide grounding**: dress, transport, prices (admission,
   fares, wages), customs, speech typical of this place in that year, each with a source; and three
   everyday occupations a person could plausibly have had at this exact place in that year, each
   with a source showing such people worked or were present there.
5. **IMAGES**: hunt Commons in this order: the building's category and its earlier names'
   categories (walk sub-categories), full-text search for the building plus the decade or year,
   geosearch near the photo spot, then period-publication categories (Illustrated London News, The
   Builder, The Graphic, "<decade>s in London"). For each candidate fetch `imageinfo`, read the
   description for the date the image *depicts* (not the upload or scan date), check the licence.
   **Download each one you intend to keep** to `spikes/agent-5/cache/<landmarkId>/img/` and
   **look at it** (Read the file). Confirm it shows what its title says, from the side you claim,
   and that nothing contradicts the date (vehicles, clothing, buildings not yet built). Classify
   `match`: `same_view` (the subject from roughly the photo spot's side), `nearby` (same building
   from another side, or the same street within about 150 m), `context` (right period and area,
   different place). Aim for 2 to 4 `same_view` or `nearby` per year, plus up to 2 `context`. An
   image dated more than 10 years from the era year is allowed only if what it shows was
   unchanged between the two dates, and then `notes` must contain the word "unchanged" and say what.
   If you cannot find 2, say which searches you ran in `gaps` (the word "image" must appear).
6. **Present-day reference photo candidates** (once per landmark, for the report, not the era
   file): 3 to 5 Commons photos taken since 2012 from at or near the photo spot facing the
   subject, landscape orientation or croppable to 16:9 with the whole subject in frame, daylight,
   no identifiable strangers in the centre, licence CC BY / CC BY-SA / public domain / CC0. For
   each: file page URL, original URL, original width and height, licence, author, date taken,
   camera coordinates if the file page has them, and one line on what is in frame. Download the
   1920px thumbnail of each to `spikes/agent-5/cache/<landmarkId>/ref/` and look at it. Rank them.

## Output 1: `data/eras/<eraId>.json`

`<eraId>` is `<landmarkId>_<year>`. UTF-8, two-space indent, keys in exactly this order, no extra
keys (the schema is strict; see `scripts/data/schema.ts`):

```json
{
  "schemaVersion": 1,
  "eraId": "queens-tower_1893",
  "landmarkId": "queens-tower",
  "year": 1893,
  "status": "validated",
  "facts": [
    {
      "claim": "One complete sentence a judge could check against the source.",
      "sources": [{ "title": "Readable page title", "url": "https://..." }],
      "confidence": "high",
      "visible": true,
      "funFact": false
    }
  ],
  "dailyLife": [
    { "claim": "...", "sources": [{ "title": "...", "url": "https://..." }], "use": "dress" }
  ],
  "scene": {
    "description": "Facing north from the photo spot in 1893: ...",
    "persists": ["..."],
    "altered": ["..."],
    "notYetBuilt": ["..."],
    "gone": ["..."],
    "surroundings": "Through 360 degrees: to the north ...; to the east ...; to the south ...; to the west ..."
  },
  "referenceImages": [
    {
      "url": "https://upload.wikimedia.org/wikipedia/commons/thumb/a/ab/Name.jpg/1920px-Name.jpg",
      "pageUrl": "https://commons.wikimedia.org/wiki/File:Name.jpg",
      "title": "What the image shows, in your words",
      "date": "1893",
      "dateCertainty": "exact",
      "licence": "Public domain",
      "author": "Photographer, engraver or publication",
      "widthPx": 1920,
      "heightPx": 1280,
      "match": "same_view",
      "facingDeg": 0,
      "notes": "What you saw when you looked at it; why the date is believed."
    }
  ],
  "guideGrounding": {
    "roles": [{ "role": "Porter at the Imperial Institute", "sources": [{ "title": "...", "url": "https://..." }] }],
    "dress": "...",
    "speech": "...",
    "prices": "...",
    "transport": "..."
  },
  "sources": [{ "title": "...", "url": "https://..." }],
  "gaps": ["..."],
  "checkedAt": "2026-11-14T22:30:00Z"
}
```

Field rules:
- `status`: `validated` if you met every count above; `thin_record` if the record is genuinely thin
  (what exists must still be valid, and `gaps` says what is missing).
- `dailyLife[].use`: one of `dress`, `transport`, `prices`, `customs`, `speech`, `work`, `food`, `other`.
- `date`: the year(s) the image shows, for example `"1893"`, `"c. 1895"`, `"1886-1890"`.
  `dateCertainty`: `exact`, `circa` (within 5 years) or `range`.
- `facingDeg`: compass bearing the image looks along, or `null` if it cannot be told.
- `widthPx` / `heightPx`: of the file at `url` (the thumbnail), not the original.
- `author`: plain text, no HTML. Use "Unknown author" only if the page says so, and then the
  licence must still be a public-domain one.
- `sources`: every URL cited in facts, dailyLife and roles, once each, with a title. (The lead
  agent regenerates this list, so do not spend time on its order.)
- Plain ASCII quotes inside strings are fine; write real UTF-8 characters, not HTML entities.

## Output 2: `spikes/agent-5/cache/<landmarkId>/REPORT.md`

- **Years**: for each candidate year, your verdict (keep / replace with YYYY / drop), the one-line
  reason that goes into the game data, and the source. If the landmark has only one candidate
  year, propose and research a second year with a rich visual record.
- **Identity**: any name confusion you resolved (earlier names, a different building of the same
  name, what stood on the site).
- **Reference photo candidates**: the ranked list from step 6.
- **Attempts**: every search and category you tried, with what it returned, so nobody repeats it.
- **Doubts**: anything a sceptical judge could attack.

## Check your work

Run, from the repository root: `npx tsx scripts/data/validate.ts --era <eraId>` for each of your
eras. It prints one line per problem and exits 0 when the file passes. Fix everything it reports.
(If the script does not exist yet, wait a minute and retry; it is being written.)

## Final message

Reply with at most 25 lines: per era its status, fact count, image count by match, anything you
could not resolve, and your year verdicts. The detail belongs in the files.
