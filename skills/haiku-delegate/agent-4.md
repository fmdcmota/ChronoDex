# Haiku delegation sheet: Agent 4, Time Machine

Rules and the brief template are in [SKILL.md](SKILL.md). Task ids are from `MASTER.md` section 11.

## Hand to Haiku

| Task | What to hand over | Point it at | Done when |
|---|---|---|---|
| A4-04 | A caption helper with tests: split a guide script into short timed lines | The `Guide.script` rules in `MASTER.md` section 4.1 | Tests pass |
| A4-05 | Progress sheet rows built from `Job.stages` | The contract types and the UI kit's progress list | Every stage state renders from the fixtures |
| A4-07 | Chat bubble, typing indicator and header, after you set the look with the first | Your first bubble | Each renders in mock mode |
| A4-07 | A `localStorage` chat-history helper with tests | The `ChatMessage` type | Tests pass, including corrupt stored data |
| A4-07 | A parser for the chat event stream with tests | `ChatStreamEvent` in `MASTER.md` section 4.1 | Tests pass when events arrive split across chunks |
| A4-09 | Sources drawer | The `Source` type and the UI kit's sheet | Renders from the fixtures |
| Any | A doc-comment pass over the files you changed, before you ask to commit | `MASTER.md` section 8.4 | Lint passes with the doc-comment rule on |

## Keep for yourself

- The 360° viewer and the gyroscope.
- Playing the guide clips in order with no gap.
- Microphone recording.
- Anything that has to be checked on a phone.
