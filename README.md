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
| `npm run seed` | Load fixtures into MongoDB. At M0 it is a dry run that validates the fixtures |

**Mock mode.** With `NEXT_PUBLIC_USE_MOCKS=1` the typed client in `src/lib/client` answers from `fixtures/` with no network or database. `queens-tower_1893` is fully populated. Generating any other era runs a fake job for about 20 seconds.

**Testing on a phone.** Camera, location and the gyroscope need HTTPS. Use the Vercel preview, or `npx next dev --experimental-https` and open the Network URL it prints.

**Where things live.** See MASTER.md section 3 for who owns each path. Import shared types and helpers from `@/lib/contracts`, the API client from `@/lib/client`, and fixtures from `@fixtures/index`.
