# Imperal-AI-Hackathon
Repo for Ishan, Alex, Azlan and Fernando


## Ideas:

- Chronodex: AI Enabled historical location scraper and reconstruction. Idea is it scrapes Google Earth and Maps photos right to the very first ever recorded for that, based on that plus web searching historical records on the location of interest, it could generate or upscale/improve existing or potentially accurate reconstructions of the place back in time. Could also generate 3D or AR/VR view so that you can use phone camera and view ovelayed changes throughout history in front of your physical location and view.

Image/video generation:
- uses current location to generate past pictures of the location and create a 3D video environment to allow user to look around and see how the older days looked like

Voice generation:
- creates a voice narrator for the historical fact, something about the daily life etc
- talk to the avatar, avatar could answer as the narrator or answers as if the avatar is from that era 

- will use fal for voice and video generation

## Run it

Plan and rules: [MASTER.md](MASTER.md). Progress: [DEV_NOTEBOOK.md](DEV_NOTEBOOK.md). Agent chat: [BOARD.md](BOARD.md).

Needs Node 24 or later (`.nvmrc`) and npm.

```sh
npm install
cp .env.example .env.local   # mocks are on by default; no keys needed for UI work
npm run dev                  # http://localhost:3000
```

| Script | Does |
|---|---|
| `npm run dev` | Next.js dev server |
| `npm run check` | Type check, lint (including the doc-comment rule) and unit tests. Must pass before every push |
| `npm run test` | Unit tests only (`npm run test:watch` to keep running) |
| `npm run build` | Production build |
| `npm run worker` | The generation worker (`src/worker/`, Agent 2) |
| `npm run brief -- <eraId>` | Run the Historian (DeepSeek with web search, about 3 minutes) and save `briefs/<eraId>.md` for a human to read. `--all` for every era, `--save` to also store it on the era in the database |
| `npm run seed` | Load landmarks and eras into MongoDB (needs `MONGODB_URI`). `npm run seed -- --dry-run` only validates |

**Mock mode.** With `NEXT_PUBLIC_USE_MOCKS=1` the typed client in `src/lib/client` answers from `fixtures/` with no network or database. `queens-tower_1893` is fully populated. Generating any other era runs a fake job for about 20 seconds.

**Testing on a phone.** Camera, location and the gyroscope need HTTPS. Use the Vercel preview, or `npx next dev --experimental-https` and open the Network URL it prints.

**Deploying to Vercel.** Import the repo as a Next.js project (no build settings to change; Node 24). Set these environment variables for Production and Preview, with values shared privately and never committed: `MONGODB_URI`, `MONGODB_DB=chronodex`, `DEEPSEEK_API_KEY`, `FAL_KEY`, `VIDEO_GENERATION=off` until the credit count is known, and leave `NEXT_PUBLIC_USE_MOCKS` empty. For indoor testing only, also `NEXT_PUBLIC_DEV_TOOLS=1` and `ALLOW_SPOOFED_LOCATION=1` (remove both before the demo). Atlas Network Access must allow `0.0.0.0/0`, because Vercel's addresses change. Run `npm run seed` once against the same database. Request bodies are limited to about 4.5 MB on Vercel: photos are capped at 4 MB in `/api/uploads`, and a voice clip of a few seconds is far smaller. The worker does not run on Vercel: run `npm run worker` on a team laptop with the same `MONGODB_URI` and `MONGODB_DB`.

**Where things live.** See MASTER.md section 3 for who owns each path. Import shared types and helpers from `@/lib/contracts`, the API client from `@/lib/client`, and fixtures from `@fixtures/index`.
