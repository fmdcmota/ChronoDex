# Haiku delegation sheet: Agent 1, Core

Rules and the brief template are in [SKILL.md](SKILL.md). Task ids are from `MASTER.md` section 11.

## Hand to Haiku

| Task | What to hand over | Point it at | Done when |
|---|---|---|---|
| A1-03 | One zod schema per type in the contracts | `src/lib/contracts/types.ts` | A test parses every fixture with its schema |
| A1-03 | Unit tests for `eraIdOf`, `parseEraId`, `haversineM`, `bearingDeg`, `withinCaptureRange` | `MASTER.md` section 4.2 | Tests pass, including bad input |
| A1-04 | Fixture JSON for the six landmarks and their eras | `MASTER.md` section 12 and the types | Every fixture validates against its schema |
| A1-05 | The remaining typed client functions, after you write the first | Your first function, `MASTER.md` section 4.3 | One function per endpoint, type check passes |
| A1-06 | Placeholder pages and stub modules | `MASTER.md` sections 1.1 and 4.4 | Every route renders, every stub has the exact signature |
| A1-07 | `.env.example` | `MASTER.md` section 8.2 | Every variable listed with a comment and no value |
| A1-09 | The remaining route handlers, after your first sets the pattern | Your first route, `MASTER.md` section 4.3 | Type check and route tests pass |
| Any | A doc-comment pass over the files you changed, before you ask to commit | `MASTER.md` section 8.4 | Lint passes with the doc-comment rule on |

## Keep for yourself

- The contracts themselves, and any change to them.
- Database shape and indexes. The capture rule on the server.
- The Historian and chat prompts.
- Deploying, environment variables, anything with a key.
- Running the gates and writing `DEV_NOTEBOOK.md`.
