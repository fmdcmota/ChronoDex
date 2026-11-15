# src/lib/pipeline

Owner: Agent 2 (Studio). `runEraJob(job)` runs one generation job and writes each result to the Era the moment it exists. MASTER.md 4.4 and 5.1, task A2-09. The per-stage functions are in `stages/` (see its README).

## The graph

    brief (Historian) -+- scene -- panorama
                    +- headshot
                    +- narration
    video tier, once scene + headshot + narration exist:
      guide_frame -+- walk_on
                   +- talk
                   +- walk_off
    then, optionally, stitch (one file, only if audio and length survive; blocked on our key)

## Entry points

| Export | What it does |
|---|---|
| `runEraJob(job, deps?)` | Runs the graph. Never throws: the job is always finished, `succeeded` only if every requested tier is complete |
| `defaultDeps()` | `dryRunDeps` when `NEXT_PUBLIC_USE_MOCKS=1`, otherwise `realDeps` (paid) |
| `PipelineDeps` | The Historian plus the eight stage functions, swappable for tests |

## Rules it keeps

- **Write as it lands.** Era fields are patched per stage. Only the three video segments land together.
- **Never pay twice.** A core stage whose output is already on the Era is skipped. Every stage saves its fal request id on the job stage; a re-claimed job passes it back, and fal returns the finished result. That is also how the guide frame (no Era field) survives a restart.
- **A failure does not stop independent stages.** Dependants are `skipped`. Core `state` is `failed` if any piece is missing; asking again repeats only what is missing.
- **Checked pictures.** Scene, panorama and guide frame are judged by a vision critic and repeated once on a hard failure (see `stages/README.md`). The outcome is logged by `runEraJob`.
- **Heartbeat.** The job lease (10 min) is renewed at most once a minute during fal waits.

## Settings (environment)

| Name | Meaning |
|---|---|
| `NEXT_PUBLIC_USE_MOCKS=1` | Dry run on fixtures, spends nothing |
| `PERIOD_LOOK=monochrome` | Real-photograph look for period pictures. Default colour. A human decision |
| `IMAGE_CHECKS=off` | No critic, no corrective retry |
| `IMAGE_CHECK_MODEL` | The critic's model in OpenRouter naming. Default `anthropic/claude-sonnet-5` |

## Scripts

`scripts/pregenerate.ts` generates every seeded era that is not ready and exits (`--dry-run` prints the plan and the estimated cost, `--video`, `--only <eraId>`, `--max-usd`). `scripts/backup-media.ts` downloads every generated file (`--dry-run` lists them). `scripts/ambience.ts` makes the period music and street loops.

## Run and test

    npm run test -- src/lib/pipeline    # in-memory DB and queue, fake stages

## Traps

- With no `NEXT_PUBLIC_USE_MOCKS`, `runEraJob` calls the Historian and fal and costs money. Dry-run text says "Placeholder" on purpose.
- Not run live end to end yet: it needs `DEEPSEEK_API_KEY` for the brief and a root `FAL_KEY` (now set).
- The worker (`src/worker/`, A2-10) is what calls it. A job from `npm run dev` is only visible to a worker when both use Atlas.
