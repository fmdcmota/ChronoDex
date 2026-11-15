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

## Test 4: the real app (A4-02 to A4-09)

Same idea as Tests 1 to 3, inside the real app with mock data (`NEXT_PUBLIC_USE_MOCKS=1` in `.env.local`).
On the laptop, at the repo root: `npm install` once, then `npx next dev --experimental-https`. Open `https://<laptop LAN IP>:3000`
on the phone and accept the certificate warning.

| # | Do this | Pass if |
|---|---|---|
| 4.1 | Open `/time/queens-tower` | Header "Queen's Tower", a 360° picture, "Meet Albert", years 1893 and 1962 at the bottom |
| 4.2 | Tap **Look around**, move the phone | As Test 1: iPhone asks for motion access, the view follows the phone |
| 4.3 | Tap **Meet Albert** with sound on | Three short sample clips play one after another (a flower video for now), with captions during the middle one, then a gold **Chat with Albert** button appears |
| 4.4 | Tap **1962** | A dark panel lists steps ("Researching 1962 in the archives" …) ticking along with seconds. After about 20 s the picture appears; a small one-line bar then shows the video steps |
| 4.5 | Tap **Chat with Albert** (from 4.3) | The chat opens with Albert's picture and greeting. Then repeat Test 3 steps 3.2 to 3.9 here |
| 4.6 | Tap ‹ in the chat, then ‹ in the Time Machine | Back to the Time Machine, then to the map |
| 4.7 | On 1893, tap **Then/Now**, then drag across the picture with one finger | Two pictures line up; the line follows your finger all the way to both edges and the page does not scroll. **Close** shuts it |
| 4.8 | Tap **Sources** | A panel slides up with a summary, fun facts and two Wikipedia links. A link opens in a new tab. Tapping the dark area above closes it |
| 4.9 | In the chat, send any message and wait for the reply | Under the reply, a **Next stop** card names another landmark with a distance and direction. Tapping it opens the map |
| 4.10 | Look at both screens overall | Pixel font and gold/ink colours like the map; nothing cut off at the top (notch) or bottom (home bar); text readable outdoors |

## Test 5: round 1 fixes (retest)

Fixes for the round 1 findings. Rows 5.1 to 5.2 are in the spike (same pages as before) and in the app; 5.3 to 5.9
are in the real app, mock data is fine for them. Row 5.10 needs mocks off and the deployed site (or keys on the laptop).

| # | Do this | Pass if |
|---|---|---|
| 5.1 | Test 1 / 4.2 again: look around with motion on | The view follows the phone more tightly than before (less lag), and starts a little more zoomed in. Say if it is now too jittery or too narrow |
| 5.2 | Media page 2B (MEDIA-5, MEDIA-6): record five times in a row, a few seconds each, tapping play after each | Every recording is thousands of bytes (none at 5 bytes), and each plays on the **first** tap of play. If a short one appears, the log now says the app would not send it |
| 5.3 | In the chat, tap **Voice off** to turn it on, then off again | Two short soft notes, rising for on and falling for off. No harsh tone |
| 5.4 | Hold the mic, say something, release | A rising pair of notes on press, falling on release. With mocks on the sample question is sent; a tap of under half a second sends nothing |
| 5.5 | Tap ↺ | The thread empties, typing dots show for about a second, then the greeting arrives. With voice on, it is read aloud |
| 5.6 | Look at the chat header | Albert's picture (a placeholder card with mocks on). For a guide with no picture yet: a pixel figure in a bowler hat, not initials |
| 5.7 | Tap anywhere on the Time Machine or chat, sound on, ring switch **on** | A quiet background sound starts (soft noise for now; period recordings replace it when Agent 2's files land) |
| 5.8 | Tap **Meet Albert**, or play a reply with voice on | The background sound drops while the guide talks and comes back after |
| 5.9 | Tap the ♪ in either header, then reload | The background sound stops, the ♪ is struck through, and stays off after the reload. Tap again to bring it back |
| 5.10 | Mocks off, a real era (Queen's Tower 1893 once it is generated): hold the mic and ask a question | Your own words appear as your bubble, a real reply streams in, and with voice on it is spoken in the guide's voice |
| 5.11 | After 5.10, with voice on, listen to the next spoken reply | As loud as the first one, from the speaker. If it suddenly comes from the earpiece or is much quieter after using the mic, say so: the fix is to release the mic after each recording |

## Test 6: the real 360° view and Time Machine (A4-15, A4-16; M1 and M2 gates)

Real data, mocks off, served from Agent 4's computer through a Cloudflare tunnel:
**https://url-poems-screens-poll.trycloudflare.com** (changes if the tunnel restarts; the board has the
latest). The database is now `chronodex` (since 04:10) with Agent 6's 8 demo eras; Queen's Tower 1893's guide is now
Thomas Meecham, not Albert. Video generation is off, so nothing here spends fal credits. Do it on an iPhone and an Android phone.
**Do not tap 1962**: it is not generated, and tapping it queues a paid job that the next worker run would make.

| # | Do | Pass when |
|---|---|---|
| 6.1 | Open `<tunnel>/time/queens-tower` | 1893 opens with the period street view, no "Mock data" tag in the corner |
| 6.2 | Drag around a full turn | The horizon is level, no visible seam straight ahead, the tower is in the centre at the start, and the view behind you is plausible (it is less certain there) |
| 6.3 | Tap **Look around**, allow motion, turn on the spot | The view follows the phone smoothly; Reset brings the tower back to the centre |
| 6.4 | Tap **Meet Albert** | Preview of the guide video ("Preview · guide video coming"): Albert's portrait walks on over the 1893 street, speaks the narration from the speaker with captions while the background sound dips, then walks off and "Chat with Albert" appears |
| 6.5 | Tap **Then/Now**, drag the divider | The 1893 view lines up with today's photo; the line under it reads "Present-day photo: David Richfield, CC BY-SA 4.0" |
| 6.6 | Tap **Sources** | Summary, facts, sources, and a "Pictures" list with the photo credits |
| 6.7 | Close the tab, reopen the same link | 1893 appears at once with no "Travelling…" wait (kept on the phone) |
| 6.8 | Open `<tunnel>/api/media/a00664efd61df7d36468b43764e54933` | Safari or Chrome plays the narration from our own server (proves iOS gets the byte ranges it needs) |
| 6.9 | After the narration, tap **Chat with Albert** and ask something | Albert's picture in the header, a real reply streams in |

Report as for the other tests: for example `iPhone: 6.1 to 6.9 pass` or `6.2 fail, seam on the left`.


### Retest after round 2 fixes (ambience)

| # | Do | Pass when |
|---|---|---|
| 6.10 | Time Machine, sound on: listen without tapping anything else | A quiet piano waltz with faint street sounds (hooves, crowd), not a hiss. It loops with no click |
| 6.11 | Tap **Meet Albert**, then **Chat with Albert** | Music drops low while Albert speaks; in the chat it is much quieter again, barely there |
| 6.12 | In the chat, hold the mic and speak, play the recording back if you can (or read the transcript) | The music fades out the moment you press and comes back after you let go; it is not in the recording |
| 6.13 | Chat with voice on: let a reply be spoken | The music is silent while the guide speaks |

## How to report

Paste lines like these to the agent:

    iPhone 15, iOS 18: 1.1 pass, 1.2 pass, 1.3 fail - log says "gyroscope refused: NotAllowedError", ...
    Pixel 8, Chrome: all pass

Or just say which numbers failed and what you saw.
