# src/lib/fal

Owner: Agent 2 (Studio). Everything that calls fal. Server and worker only: `FAL_KEY` never reaches the browser.

## Entry points

| Export | File | What it does |
|---|---|---|
| `runFal(endpoint, input, ctx)` | `run.ts` | The one wrapper for every model call. Submits to fal's queue, hands the request id to `ctx.onRequestId` at once, polls, returns the data. With `ctx.resumeRequestId` it skips the submit, so a restarted worker does not pay twice |
| `MODELS` | `models.ts` | The only place in `src/` that names an endpoint. Primary and fallback per stage. Mirrors the "Chosen models" table in `notebook/agent-2.md` |
| `VOICE_CATALOG`, `getVoice` | `voices.ts` | Guide voices. **Provisional** until a human has listened (A2-04) |
| `uploadToFal`, `synthesizeSpeech`, `transcribe` | `index.ts` | The signatures from MASTER.md 4.4. `synthesizeSpeech(text, key, { fast })` uses the cheaper chat model when `fast` |

## Run and test

    npm run test -- src/lib/fal     # no network, no key
    NEXT_PUBLIC_USE_MOCKS=1         # the three functions return fixtures and call nothing

A live smoke check (spends under a cent): load `spikes/agent-2/.env.local` into a one-off `tsx` script that calls `synthesizeSpeech` then `transcribe`.

## Traps

- Never write an endpoint string outside `models.ts`. A test fails if you do.
- `runFal` throws `FalStageError` with `requestId`, `status` and `body`. The body usually names the bad field.
- The 45 s talk clip takes about 15 minutes: pass `onPoll: () => heartbeatJob(job.id)` so the job lease is renewed.
- Phone recordings (webm, m4a) are not yet tested against speech to text.
