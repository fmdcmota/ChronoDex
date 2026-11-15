# src/app/api/voice

Owner: Agent 2 (Studio). The two voice routes of MASTER.md 4.3, task A2-11. The client calls them through `api.textToSpeech(eraId, text)` and `api.speechToText(blob)` in `@/lib/client`.

## POST /api/voice/tts

`{ eraId, text }` (text 1 to 1500 characters) gives `{ audioUrl }`, an MP3 in the era guide's voice. The server picks the voice, so a client cannot choose one. Uses the cheaper chat model (about 3 to 5 s for a short reply). The same voice and text is answered from a cache in about 30 ms at no cost, so replaying a reply is free.

## POST /api/voice/stt

Multipart, field `file`, a recording up to 4 MB. Gives `{ text }` (empty string if nothing intelligible). About 2 to 4 s.

## Errors (`{ error: { code, message } }`)

| Status | Code | When |
|---|---|---|
| 400 | `bad_request` | Bad JSON, empty text, no file, empty file |
| 404 | `not_found` | Unknown era (tts) |
| 409 | `era_not_ready` | The era has no guide yet (tts) |
| 413 | `too_large` | Recording over 4 MB |
| 415 | `unsupported_type` | The file is not audio |
| 429 | `rate_limited` | Over 30 tts or 20 stt a minute per caller. `Retry-After` is set |
| 502 | `upstream_error` | fal failed. The detail is in the server log |
| 503 | `voice_unavailable` | No `FAL_KEY` on the server and mocks are off |

With `NEXT_PUBLIC_USE_MOCKS=1` both routes return fixtures and call nothing.

## Run and test

    npm run test -- src/app/api/voice
    node spikes/agent-2/voice-test.mjs   # real microphone test page, see its header

## Traps

- fal's speech to text rejects `.webm` and `.mp4` file names (supported: mp3 wav m4a ogg flac aac). The route renames the upload from the file's real bytes (`src/lib/fal/audio.ts`). Proven with MP3 and with a real browser WebM/Opus recording; an iOS MP4/AAC recording is not yet proven.
- Rate limits and the cache are per server process, so on Vercel the real ceiling is a multiple of the limit.
- Recordings are uploaded to fal's public CDN and kept at least 7 days.
