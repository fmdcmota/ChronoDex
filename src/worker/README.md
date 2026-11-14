# src/worker

Owner: Agent 2 (Studio). `npm run worker`: the process that generates eras. MASTER.md sections 2 and 4.4, task A2-10.

It claims jobs the API queued in MongoDB, runs each with `runEraJob` (`src/lib/pipeline`) and writes the results back. The API and the worker only see each other through MongoDB, so both need the same `MONGODB_URI` and `MONGODB_DB`.

## Files

| File | What |
|---|---|
| `index.ts` | The entry point: startup checks, signal handling, logging |
| `loop.ts` | `runWorker(options)`: the claim loop, concurrency and shutdown. No process or env handling, so it is tested directly |

## Run

    npm run worker                        # reads .env.local, runs until Ctrl+C
    WORKER_CONCURRENCY=2 npm run worker   # two jobs at once (default 1)

It refuses to start, with a clear message, when:
- `MONGODB_URI` is not set (`WORKER_ALLOW_MEMORY=1` overrides, for trying the loop on a private queue only), or
- mocks are off and `FAL_KEY` or `DEEPSEEK_API_KEY` is missing.

With `NEXT_PUBLIC_USE_MOCKS=1` it runs a free dry run on fixtures. Without it, every job spends fal and Historian credits. The first log line says which mode it is in.

## Shutdown and restarts

Ctrl+C or SIGTERM: no new jobs, a running job gets 20 s to finish, then the process exits. A second Ctrl+C exits at once. A job left behind keeps its saved fal request ids, and the next worker takes it over when its lease runs out (10 minutes) and resumes without paying twice. Restarting the worker therefore waits up to 10 minutes for the old job (a `releaseJob` in `src/lib/jobs` would remove the wait; asked of Agent 1).

## Test

    npm run test -- src/worker

## Traps

- A job queued by `npm run dev` without Atlas lives in that process only; the worker cannot see it.
- `VIDEO_GENERATION` is enforced by the API, not here: a queued video job runs.
- The worker is not yet proven live end to end (needs Atlas and keys), and a real Ctrl+C has not been exercised on Windows, where a shell cannot deliver SIGINT to it.
