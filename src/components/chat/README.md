# Chat components

Owner: Agent 4. The `/chat/[eraId]` screen (MASTER.md section 1.2 part 3, tasks A4-07, A4-08 and the after-chat prompt of A4-09).

## Entry points

- `ChatScreen.tsx`: loads the era, then the thread. Streams replies from `api.streamChat`, keeps
  history per era (`history.ts`), voice in with `api.speechToText`, voice out with `api.textToSpeech`.
- `Composer.tsx`: text box and Send, or hold-to-talk (`recorder.ts`) while the box is empty.
- `NextStopCard.tsx` (A4-09): after the guide has answered, the nearest uncollected landmark from
  this one (`nextStop.ts`, using Agent 3's `nearestLandmark`), linking to the map.
- Colours and fonts come from `../time-machine/pixel.ts` (Agent 3's palette). Bubbles stay rounded on
  purpose: the spec asks for a text-message look.
- `ChatHeader.tsx`, `MessageBubble.tsx`, `TypingIndicator.tsx`, `Avatar.tsx`: the look.

## Run and test

    npm run dev        # mocks on: open /chat/queens-tower_1893
    npm run check      # history and tone helpers are unit tested

The microphone and read-aloud need a phone over HTTPS: `spikes/agent-4/PHONE_TEST.md` Test 4.

## Traps

- iOS plays sound only on an element first played inside a tap. Replies arrive seconds later, so
  one `<audio>` is unlocked on every send tap and reused (`unlockAudio`, using `tone.ts`).
- The text box is 16 px: smaller makes iOS zoom the page on focus.
- Hold-to-talk needs pointer capture, `touch-none` and `[-webkit-touch-callout:none]`.
- History is saved after the player's message and again after the reply, so a reload mid-reply keeps the question.
