# Haiku delegation sheet: Agent 3, Explorer

Rules and the brief template are in [SKILL.md](SKILL.md). Task ids are from `MASTER.md` section 11.

## Hand to Haiku

| Task | What to hand over | Point it at | Done when |
|---|---|---|---|
| A3-03 | The remaining UI kit components, after your first sets the pattern | Your first component and the theme tokens | Each renders, type check passes |
| A3-04, A3-09 | Display helpers with tests: distance as text ("120 m"), bearing as a compass word ("north-east") | The geo helpers in `src/lib/contracts/` | Tests pass |
| A3-07 | Dex grid states: collected, not collected, empty, loading, error | The UI kit and the fixtures | Every state renders in mock mode |
| A3-08 | Web app manifest, icon list and the map attribution footer | `MASTER.md` section 11, task A3-08 | Manifest is valid JSON, attribution names all three sources |
| A3-08 | Loading and error states for screens you have finished | The UI kit | Every fetch shows both states |
| Any | A doc-comment pass over the files you changed, before you ask to commit | `MASTER.md` section 8.4 | Lint passes with the doc-comment rule on |

## Keep for yourself

- Art direction and how the map looks.
- Generating sprites and badges. It spends fal credits.
- The capture flow and the permission prompts for camera and location.
- Anything that has to be checked on a phone.
