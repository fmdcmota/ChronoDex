# scripts/demo: the demo set, generated once and kept in the repo

Owner: Agent 6 (demo assets). The eras shown on stage load from files, with no generation, no fal CDN and no
media store.

## The set (`demo-set.ts`)

| City | Landmark | Years |
|---|---|---|
| London | Queen's Tower, Royal Albert Hall, Natural History Museum | 1893, 1962 / 1871 / 1862, 1881 |
| Mexico City | Zócalo and Metropolitan Cathedral | 1519 |
| Porto | Dom Luís I Bridge | 1886 |
| Singapore | Raffles' Landing Site | 1819 |

Every year of each landmark is in the set, so no year tab on stage starts a generation.

## Files

- `public/demo/<eraId>/{scene,panorama,headshot}.jpg` and `narration.mp3`: served by Next at `/demo/...`.
- `data/demo/eras/<eraId>.json`: the finished Era (`ready`, video `missing`) plus how each file was made.
- Inputs: `briefs/<eraId>.json` (the Historian), `data/landmarks/<id>.json` and `data/reference/<id>.jpg`.

## Run

    npx tsx --env-file=.env.local scripts/demo/generate-demo.ts --dry-run     what is missing, spends nothing
    npx tsx --env-file=.env.local scripts/demo/generate-demo.ts               make what is missing (about $0.50 an era)
    npm run seed                                                              landmarks and empty eras
    npx tsx --env-file=.env.local scripts/demo/load-demo.ts                   Eras into MONGODB_DB

Flags: `--only <eraId>`, `--redo scene|panorama|headshot|narration`, `--reuse-db` (copy media an Era in the
database already has). An existing file is never paid for again.

## Traps

- Keep `VIDEO_GENERATION=off` on the demo server: the Time Machine asks for the video tier of a ready era, and
  only the switch refuses it (403, nothing spent).
- Reference photos must be a real 16:9 photo. A padded one (blurred side bands) made the scene keep the bands.
- Briefs sometimes list web pages as period images; the script resolves Commons pages and re-uploads images to
  fal itself, because Wikimedia refuses fal's downloader.
