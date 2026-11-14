# Chronodex: phone test sheet (human tasks, in order)

One file for everything a human has to check or decide. Work top to bottom. Each part says what it unblocks. Fill the result columns as you go (`P` = pass, `F` = fail plus what you saw). Part 9 says who gets what.

Sources merged here: `spikes/agent-3/PHONE_TEST.md` (map), `spikes/agent-4/PHONE_TEST.md` (360° view, clips, mic, chat, Time Machine), and the Agent 1, 2 and 3 hand-off notes.

Devices: one iPhone (Safari) and one Android phone (Chrome). iOS behaves differently, so one of each is the minimum. Camera, location and motion only work over HTTPS.

---

## Part 0. Setup (once)

| # | Do this | Done |
|---|---|---|
| 0.1 | Phone and laptop on the same Wi-Fi | |
| 0.2 | In `.env.local` set `NEXT_PUBLIC_DEV_TOOLS=1` (shows the "Spoof location" panel, needed indoors) and `NEXT_PUBLIC_USE_MOCKS=1` (no keys needed) | |
| 0.3 | Repo root: `npx next dev --experimental-https`. On the phone open `https://<laptop IP>:3000`, accept the certificate warning (Advanced, then proceed) | |
| 0.4 | Or use the Cloudflare tunnel: keep the `cloudflared` terminal open and open the `https://….trycloudflare.com` address it prints. The address changes each run | |
| 0.5 | If the page is blank on the phone, add the hostname you used to `DEV_ALLOWED_ORIGINS` in `.env.local` and restart dev (see Part 9, item 12) | |

Over the tunnel, skip MAP-10 (airplane mode kills the tunnel) and MAP-11 (the installed icon would break when the address changes). Do both later on the deployed site.

---

## Part 1. Decisions that block the agents (do these first, no phone needed)

Open `spikes/agent-2/out/review.html` on Ishan's laptop (generated files are not in git).

| # | Do this | Your answer |
|---|---|---|
| 1.1 | **Voices.** 16 clips of one script (8 Eleven, 8 Gemini). Pick 4 to 6: a mix of men and women, older and younger, British accents. Write the clip names | |
| 1.2 | **Talking guide.** Compare the two 10 s clips (Kling vs Fabric): lip sync, face, does the street warp? Pick one | Kling / Fabric |
| 1.3 | **Walk-on clip (5 s).** Does she walk in naturally? Does the camera stay still? | |
| 1.4 | **fal credits.** Read the balance in the fal dashboard. This decides one guide video per landmark, or all 18 eras (about $77 at list price, plus retries) | $ |
| 1.5 | **Keys.** Send privately, never in git: `MONGODB_URI` (Atlas, network access open to 0.0.0.0/0 for the weekend), `DEEPSEEK_API_KEY`, `FAL_KEY` | sent? |
| 1.6 | **Worker machine.** Whose laptop runs `npm run worker`? Default is Ishan's. It must be on during the live-generation demo | |
| 1.7 | **Landmark photos.** Every reference photo must be 16:9 landscape. Check Agent 1's normalised versions by eye. A bad crop ruins every edit | ok / list bad ones |
| 1.8 | **Historian run.** Should Agent 1 run the Historian for Queen's Tower 1893 and save the brief to the dev database, so the real chat can be tested in Part 7? (Pictures and video stay fake until fal is wired.) | yes / no |

---

## Part 2. Laptop checks (Chrome, about 5 minutes)

| # | Do this | Pass if | Result |
|---|---|---|---|
| 2.1 | Terminal 1: `npm run dev`. Terminal 2: `node spikes/agent-2/voice-test.mjs`. Open `http://localhost:4000` in Chrome, press Record, say a sentence, press Stop | It prints `HTTP 200` and your words. **Paste the whole printout** | |
| 2.2 | Same on Safari on a Mac, if anyone has one | Same | |

---

## Part 3. Map, Capture, Dex (mocks on)

Agent 3 owns these. Reference: `spikes/agent-3/PHONE_TEST.md`. For the spoof panel, tap "Spoof location", then a landmark name or an empty spot on the map.

| # | Do this | Expect | iPhone | Android |
|---|---|---|---|---|
| MAP-1 | Open `/`. Tap "Share location" and allow | Six pixel landmarks on a game map, no blank tiles, all visible without zooming. Your dot appears, map zooms to you | | |
| MAP-2 | Deny location instead (reload, Don't Allow) | A banner says how to turn it back on. Landmarks still show | | |
| MAP-3 | Tap a marker | Its card opens | | |
| MAP-4 | Spoof to "Queen's Tower" | The gold capture button lights up with its name. Pressing it opens `/capture` with the rear camera live and the landmark name on the viewfinder | | |
| MAP-5 | Deny the camera when asked | A message and a "Take or pick a photo" button that opens the phone camera or library | | |
| MAP-6 | Press the shutter, then "Use this photo" | "Sending your photo" steps, then "Badge collected!" with the badge bouncing in | | |
| MAP-7 | Take the photo in portrait, then landscape | Preview is the right way up, not sideways | | |
| MAP-8 | Spoof far from any landmark (tap an empty spot), take a photo | "You are X m from Y. Head <direction>." **Check the direction against the map**, for example 750 m from Royal Albert Hall, head south-west | | |
| MAP-9 | Tap the "Dex 1 / 6" chip | `/dex`: collected badge in colour with date, the rest grey silhouettes, progress bar. Reload: still there | | |
| MAP-10 | Airplane mode, reload `/dex` (**deployed site only**) | Same badges with an "Offline copy" tag | | |
| MAP-11 | Add to Home Screen / Install app (**deployed site only**) | Queen's Tower icon, name "Chronodex", full screen with no browser bars | | |
| MAP-12 | Pull down on the map and on the camera screen | No bounce or reload. Nothing hides behind the notch or home bar | | |
| MAP-13 | Read the map's bottom corner | OpenFreeMap / OpenMapTiles / OpenStreetMap credit visible, not covered by the bar | | |

---

## Part 4. 360° viewer (spike, needed for the M1 gate)

Agent 4 owns these. In `spikes/agent-4/`: `npm install` once, then `npm run dev`. Open the `Network:` address it prints (`https://192.168.x.x:5173`) and accept the warning. If it will not load, allow Node.js through the laptop firewall (private networks) for port 5173.

The page shows a grid with a big green **FRONT** and a red horizon line.

| # | Do this | Pass if | iPhone | Android |
|---|---|---|---|---|
| VIEW-1 | Look at the page | Grid and FRONT show. Log box (top right) says `viewer ready` | | |
| VIEW-2 | Drag with one finger | View turns smoothly | | |
| VIEW-3 | Tap **Enable motion** | iPhone: a motion-and-orientation prompt, tap Allow. Android: no prompt. Log says `gyroscope on` | | |
| VIEW-4 | Hold the phone up, turn on the spot, tilt up and down | View follows with no big lag or jitter. Turning right shows RIGHT, then BACK | | |
| VIEW-5 | Look all the way round | No visible seam at BACK | | |
| VIEW-6 | Tap **Reset** | Back to FRONT. Motion off | | |
| VIEW-7 | Choose **21:9 band, full turn**, enable motion, tilt fully up and down | View stops at the top and bottom edges. Never black | | |
| VIEW-8 | Choose **21:9 band, half turn**, turn left and right | View stops at the side edges. Never black | | |
| VIEW-9 | Rotate to landscape and back | View fills the screen both ways | | |
| VIEW-10 | **Real panorama.** Same address plus `?src=https://v3b.fal.media/files/b/0ab2744b/pptkrvSGkOwD6o_RzIHjG_pano-1880-b2-2x1.jpg&vfov=180` (link expires about 21 Nov) | Follows the gyroscope, horizon level, no obvious seam behind you | | |

If VIEW-3 fails on the iPhone, copy the exact log line (for example `gyroscope refused: NotAllowedError`). Likely cause is the self-signed certificate. Retest on the Vercel deploy.

---

## Part 5. Guide clips and microphone (spike)

Same address plus `/media.html`. Sound on, phone not in silent mode. The log at the bottom records everything.

| # | Do this | Pass if | iPhone | Android |
|---|---|---|---|---|
| MEDIA-1 | Tap **Make test clips**, wait about 10 s | Log shows `made walk_on`, `made talk`, `made walk_off`, each with a type such as `video/mp4`. **Copy those three lines** | | |
| MEDIA-2 | Tap **Play** | Blue, then green, then red card, each with a rising tone at every change | | |
| MEDIA-3 | Watch and listen at each colour change | No black flash, freeze or silence. **Report the `gap N ms` numbers** | | |
| MEDIA-4 | Check the video stayed in the page | It did not jump to the phone's full-screen player | | |
| MEDIA-5 | Hold **Hold to talk**, say a sentence, release | First time: mic prompt, allow, hold again. Button red while held. Log says `recorded N s, N bytes, type …`. **Report the type** | | |
| MEDIA-6 | Tap play on the audio bar | You hear your sentence | | |
| MEDIA-7 | Hold the button, slide your finger off, release | Recording still stops. No copy/paste or save-image menu | | |
| MEDIA-8 | Tap **Save recording** | A file downloads. **Send it to Ishan** for the speech-to-text test (fal refuses `.webm` and `.mp4` names, so this matters) | | |
| MEDIA-9 | Tap **Tap, then wait 3 s**. Do not touch the phone | Within about 5 s the log shows `beep 1` and `beep 2`, each `played` or `BLOCKED`. **Report both lines exactly.** iPhone: beep 1 may be blocked, beep 2 must play | | |

---

## Part 6. Guide chat (spike, canned replies)

Same address plus `/chat.html`. Judge how it looks and behaves, not what the guide says. Ask about clothes, food or "where next". A message containing "error" shows the error state.

| # | Do this | Pass if | iPhone | Android |
|---|---|---|---|---|
| CHAT-1 | Open the page | Text-message look: header with "EM" picture, name and role, grey greeting bubble, message box and mic button. Nothing behind notch or home bar | | |
| CHAT-2 | Tap the message box | Keyboard opens, page does **not** zoom, message box stays above the keyboard | | |
| CHAT-3 | Send "what did people wear?" | Blue bubble, three typing dots, reply appears word by word, thread scrolls to follow | | |
| CHAT-4 | Send more until the thread is longer than the screen, scroll | Smooth. Header and message box stay put | | |
| CHAT-5 | Reload | Conversation still there | | |
| CHAT-6 | Tap **listen** under a guide bubble | A short beep | | |
| CHAT-7 | Tap **Voice off** so it reads **Voice on**, send a message, do not touch the phone | A beep plays by itself when the reply finishes. **Key iPhone check** | | |
| CHAT-8 | Empty box, hold the mic, speak, release | Button grows and turns red. "Listening back…", then a canned message is sent for you | | |
| CHAT-9 | Tap ↺ top right | Chat resets to the greeting | | |

---

## Part 7. Time Machine in the real app (mocks on)

Repo root, mocks on (Part 0). Open `https://<address>/time/queens-tower`.

| # | Do this | Pass if | iPhone | Android |
|---|---|---|---|---|
| TM-1 | Open `/time/queens-tower` | Header "Queen's Tower", a 360° picture, "Meet Albert", years 1893 and 1962 at the bottom | | |
| TM-2 | Tap **Look around**, move the phone | iPhone asks for motion access. View follows the phone | | |
| TM-3 | Tap **Meet Albert**, sound on | Three short sample clips play in a row, captions during the middle one, then a gold **Chat with Albert** button | | |
| TM-4 | Tap **1962** | Dark panel lists steps ("Researching 1962 in the archives" …) ticking with seconds. After about 20 s the picture appears, then a one-line bar shows the video steps | | |
| TM-5 | Tap **Chat with Albert** | Chat opens with Albert's picture and greeting. Repeat CHAT-2 to CHAT-9 here | | |
| TM-6 | Tap ‹ in the chat, then ‹ in the Time Machine | Back to the Time Machine, then the map | | |
| TM-7 | On 1893 tap **Then/Now**, drag across the picture | Two pictures line up, the line follows your finger to both edges, page does not scroll. **Close** shuts it | | |
| TM-8 | Tap **Sources** | Panel slides up with summary, fun facts, two Wikipedia links. A link opens in a new tab. Tapping the dark area closes it | | |
| TM-9 | In the chat send any message, wait for the reply | A **Next stop** card names another landmark with distance and direction. Tapping it opens the map | | |
| TM-10 | Look at both screens overall | Pixel font and gold/ink colours like the map. Nothing cut off at notch or home bar. Text readable outdoors | | |

---

## Part 8. The real server (set `NEXT_PUBLIC_USE_MOCKS=` empty, restart `next dev`)

Agent 1 owns these. Needs `MONGODB_URI` in `.env.local` (item 1.5). Use the spoof panel.

| # | Do this | Expect | Result |
|---|---|---|---|
| SRV-1 | Spoof 10 m from a landmark, capture | Badge awarded | |
| SRV-2 | Spoof 100 m away, capture | "Too far" with a distance and direction | |
| SRV-3 | Capture the same landmark twice | "Already collected" | |
| SRV-4 | Restart the dev server, open `/dex` | Badges still there (they now live in Atlas) | |
| SRV-5 | Chat with a real guide (only if you said yes to 1.8) | Streamed replies from the real guide for Queen's Tower 1893. Picture and video are still fake | |

**Known gaps, do not report as bugs:**

- Mocks off: capture stops at "The server cannot take photos yet" until the upload route (A2-11) exists.
- A real era cannot be generated until `FAL_KEY` is in the root `.env.local` and the worker is running. All 10 eras are empty today.
- Real voice recordings in the chat are untested (needs the deploy, then hold to talk on both phones, item 9.6).
- Landmark GPS is still estimated until the H1 photos arrive. Do not judge the 50 m rule by walking outside.

---

## Part 9. What to send back, and who needs it

Post results as lines like `iPhone 15, iOS 18: VIEW-1 pass, VIEW-3 fail - log says "gyroscope refused: NotAllowedError"` and `Pixel 8, Chrome: all pass`. Screenshots for anything odd.

| # | Send this | From | To | What it unblocks |
|---|---|---|---|---|
| 1 | Voice picks (4 to 6 clip names) | 1.1 | Agent 2, Agent 1 | Agent 2 writes `VOICE_CATALOG` (A2-04). Agent 1 replaces the two placeholder voice keys in the Historian |
| 2 | Video model pick, walk-on verdict | 1.2, 1.3 | Agent 2 | Chooses the talk and walk models for the pipeline (A2-05, A2-06) |
| 3 | fal credit balance | 1.4 | Agent 2, Agent 1, team | One video per landmark or all 18 eras. Agent 1 sets `VIDEO_GENERATION` |
| 4 | Keys, privately | 1.5 | Agent 1 (Atlas, DeepSeek), Agent 2 (fal) | No real end-to-end run is possible without them |
| 5 | Worker machine | 1.6 | Agent 2, team | Who runs `npm run worker` for the demo |
| 6 | 16:9 photo check | 1.7 | Agent 1 | Reference photos feed every era edit |
| 7 | Historian yes/no | 1.8 | Agent 1 | Real chat to test in SRV-5 |
| 8 | Mic test printout | 2.1, 2.2 | Agent 2 (and Agent 4) | Proves voice input works in Chrome and Safari |
| 9 | Map, Capture, Dex results | MAP-1 to MAP-13 | Agent 3 | M2 gate for Part 1 of the product |
| 10 | Viewer results, real panorama, exact log lines | VIEW-1 to VIEW-10 | Agent 4, and Agent 2 for VIEW-10 | M1 gate. VIEW-10 is the panorama pass mark (A2-03) |
| 11 | Clip types, gap numbers, recording type, beep lines, saved recording file | MEDIA-1 to MEDIA-9 | Agent 4 and Agent 2 | Video clip format and gapless playback. Which audio format the phones record, for speech-to-text |
| 12 | (Done: `allowedDevOrigins` is already on `main`.) If a phone still shows a blank page, send the hostname it used | Part 0 | Agent 1 | Add the hostname via `DEV_ALLOWED_ORIGINS` in `.env.local` |
| 13 | Chat and Time Machine results | CHAT-1 to CHAT-9, TM-1 to TM-10 | Agent 4 | M2 and M3 gates for the Time Machine and chat |
| 14 | Server capture results | SRV-1 to SRV-5 | Agent 1 | Capture rule and persistence work for real |
| 15 | Voice on real phones, after deploy: hold to talk in the chat on iPhone and Android | later | Agent 2, Agent 4 | Only proof that iPhone MP4 recordings transcribe |
| 16 | Read the first real era brief and guide script for accuracy | later | Agent 1, team | H7 gate before overnight spending |

Notes for the team to act on (these are for you, not agent test results):

- **Guide script length.** About 130 words fill 45 s. `MASTER.md` section 4.1 says 105 to 120 (about 40 s). That is a `CONTRACT` change, so post it to `@team` on the board.
- **Historian model.** The hand-off notes mention `DEEPSEEK_API_KEY` and a DeepSeek-powered guide, but `MASTER.md` section 7 specifies Claude. Confirm which is intended and tell Agent 1.
- **Speech to text.** fal refuses `.webm` and `.mp4` file names, so the server renames uploads. That is why item 8 and MEDIA-8 matter. Tell Agent 4.
- **`extract-frame` is 403** on our key. Ask fal support to enable `fal-ai/ffmpeg-api/extract-frame`. It gives a cleaner walk-off clip. Optional.
- **Deferred to the deployed site:** MAP-10 (offline Dex), MAP-11 (Add to Home Screen), item 15.
