# Haiku delegation sheet: Agent 2, Studio

Rules and the brief template are in [SKILL.md](SKILL.md). Task ids are from `MASTER.md` section 11.

A delegate never calls fal. Every request that spends credits is yours.

## Hand to Haiku

| Task | What to hand over | Point it at | Done when |
|---|---|---|---|
| A2-01 to A2-06 | Read one model's schema page and report its exact input and output fields | `https://fal.ai/models/<endpoint>/llms.txt` | A table of field, type, required, default. Nothing guessed |
| A2-07 | `models.ts` and `voices.ts` entries from your chosen-models table | `notebook/agent-2.md` | The files match the table exactly |
| A2-08 | The remaining stage files, after you write the first as the pattern. You supply each prompt builder | Your first stage file | Type check passes, no endpoint string outside `models.ts` |
| A2-08 | Unit tests for prompt builders | The builders | Tests pass |
| A2-13 | `scripts/backup-media.ts`: download every asset URL on every era to a local folder | The contract types | A dry run against the fixtures lists every URL |
| Any | Turn raw timing and cost output into the table in your notebook | Your log output | Table filled, figures copied exactly |
| Any | A doc-comment pass over the files you changed, before you ask to commit | `MASTER.md` section 8.4 | Lint passes with the doc-comment rule on |

## Keep for yourself

- Every fal call and every bake-off judgement. You look at the images and video.
- Prompt design for every stage.
- `runFal`, the orchestrator, the worker and the image-check loop.
- Choosing models and voices.
