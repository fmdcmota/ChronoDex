# Phone test checklist for Agent 4's human

Agent 4 cannot hold a phone. These checks need a person. Do each one on **an iPhone (Safari)**
and **an Android phone (Chrome)**, then tell the agent the result for each numbered line:
pass, or fail with what you saw (a screenshot helps).

## Before you start

1. The laptop running the spike and the phone must be on the **same Wi-Fi**.
2. On the laptop, in `spikes/agent-4/`: `npm install` once, then `npm run dev`.
   It prints a `Network:` line such as `https://192.168.x.x:5173`. Use that address.
3. On the phone, open that address. You will see a certificate warning ("not private").
   That is expected: tap **Advanced / Show details**, then **proceed / visit this website**.
4. If the page will not load at all, the laptop firewall may be blocking port 5173.
   Allow Node.js on private networks, or tell the agent.

## Test 1: 360° viewer (A4-01, needed for the M1 gate)

Page: the address above. You should see a grid with a big green **FRONT** and a red horizon line.

| # | Do this | Pass if |
|---|---|---|
| 1.1 | Look at the page | Grid and FRONT show. The log box (top right) says `viewer ready` |
| 1.2 | Drag with one finger | The view turns smoothly |
| 1.3 | Tap **Enable motion** | iPhone: a "motion and orientation access" prompt appears. Tap Allow. Android: no prompt. The log says `gyroscope on` |
| 1.4 | Hold the phone up and turn on the spot, then tilt up and down | The view follows the phone with no big lag or jitter. Turning right shows RIGHT, then BACK |
| 1.5 | Look all the way round | At BACK there is no visible seam or line where the image joins |
| 1.6 | Tap **Reset** | View goes back to FRONT. Motion turns off |
| 1.7 | Pick **21:9 band, full turn** in the dropdown, enable motion, tilt fully up and down | The view stops at the top and bottom edges of the image. You never see black |
| 1.8 | Pick **21:9 band, half turn**, turn left and right | The view stops at the side edges. You never see black |
| 1.9 | Rotate the phone to landscape and back | The view fills the screen both ways |

If 1.3 fails on the iPhone (no prompt, or the log says `gyroscope refused`), write down the
exact log line. The likely cause is the self-signed certificate; the fallback is to test again
once the app is on Vercel.

## Test 2: guide clips and microphone (A4-04, A4-08)

Page: same address plus `/media.html`. Scroll down as you go. The log at the bottom records
everything: when a line below says "log says", read it there.

| # | Do this | Pass if |
|---|---|---|
| 2.1 | Tap **Make test clips**, wait about 10 s | The log shows `made walk_on`, `made talk`, `made walk_off`, each with a type such as `video/mp4`. **Copy those three lines into your report** |
| 2.2 | Sound on, not silent mode. Tap **Play** | A blue, then green, then red card plays, each with a tone that rises at every change |
| 2.3 | Watch and listen at each colour change | No black flash, no freeze, no moment of silence. The log shows `gap N ms` for each change: **report the numbers** |
| 2.4 | Check the video stayed in the page | It did not jump to the phone's own full-screen player |
| 2.5 | Press and hold **Hold to talk**, say a sentence, release | First time: a microphone prompt. Allow it, then hold again. The button turns red while held. The log says `recorded N s, N bytes, type ...`: **report the type** |
| 2.6 | Tap play on the audio bar under the button | You hear your sentence |
| 2.7 | Hold the button, then slide your finger off it before releasing | Recording still stops. No copy/paste or "save image" menu appears |
| 2.8 | Tap **Save recording** (optional, if Agent 2 asks for a sample) | A file downloads. Send it to Agent 2's human for the speech-to-text test |
| 2.9 | Tap **Tap, then wait 3 s**. Do not touch the phone | Within about 5 s the log shows `beep 1` and `beep 2`, each `played` or `BLOCKED`. **Report both lines exactly.** On iPhone we expect beep 1 may be blocked; beep 2 must play |

## Test 3: guide chat (A4-07, A4-08)

Page: same address plus `/chat.html`. Replies are canned for now (no server yet), so judge how it
looks and behaves, not what the guide says. Ask about clothes, food or "where next" for different
replies; type a message containing "error" to see the error message.

| # | Do this | Pass if |
|---|---|---|
| 3.1 | Open the page | It looks like a text-message app: header with "EM" picture, name and role, a grey greeting bubble, a message box and a mic button at the bottom. Nothing hidden behind the notch or the home bar |
| 3.2 | Tap the message box | The keyboard opens, the page does **not** zoom in, and the message box stays visible above the keyboard |
| 3.3 | Type "what did people wear?" and send | Your blue bubble appears, then three typing dots, then the reply appears word by word. The thread scrolls to follow it |
| 3.4 | Send a few more until the thread is longer than the screen. Scroll up and down | Smooth scrolling. The header and message box stay put |
| 3.5 | Reload the page | The whole conversation is still there |
| 3.6 | Tap **listen** under a guide bubble | You hear a short beep (the stand-in for the guide's voice) |
| 3.7 | Tap **Voice off** so it says **Voice on**, then send a message. Do not touch the phone while the reply arrives | A beep plays by itself when the reply finishes. **This is the key iPhone check** |
| 3.8 | With the message box empty, hold the mic button, speak, release | The button grows and turns red while held. Then "Listening back…", then a message "What did people wear around here back then?" is sent for you (canned text for now) |
| 3.9 | Tap ↺ at the top right | The chat goes back to just the greeting |

## How to report

Paste lines like these to the agent:

    iPhone 15, iOS 18: 1.1 pass, 1.2 pass, 1.3 fail - log says "gyroscope refused: NotAllowedError", ...
    Pixel 8, Chrome: all pass

Or just say which numbers failed and what you saw.
