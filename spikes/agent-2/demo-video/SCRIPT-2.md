# Chronodex: 2-minute demo video, version 2 (script)

Same look as the first video: the phone on the left, the kicker and headline on the right, the night-sky
background, hard cuts, the app's own sounds, and the duck walking across the end card. What changes is the
structure the judges asked for:

| Part | Length | What it answers |
|---|---|---|
| 1. The problem | 15 s | What is wrong today, and who Chronodex is for |
| 2. One real run | about 75 s | The whole task, start to finish, at the Royal Albert Hall |
| 3. How it's built | about 20 s | The pipeline, and where each bounty tool is used |
| 4. What's new | 10 s | What nobody else does, and how often it works |

**Spoken: about 230 words, roughly 85 seconds.** The other 35 seconds belong to the app's own sounds at the
marked **[PAUSE]**s.

## Recording tips

Same as last time: one take, quiet room, phone a hand's width away. At each **[PAUSE n s]** stop and count. A
breath of about a second between blocks. If you trip, pause and say the whole sentence again. Send the file as it
comes (WhatsApp audio is fine).

## The script

| Time | On screen | Sound | VOICE-OVER |
|---|---|---|---|
| **0:00 to 0:15** · 01 THE PROBLEM | Full-frame card, no phone: today's Royal Albert Hall (our reference photo), people-sized and ordinary, with a small plain label that just says "1871". Headline: "History you walk straight past". Sub-line: "For visitors, students and anyone exploring a city on foot." | Quiet modern street ambience. | "Every city is full of history you walk straight past. A plaque gives you a date, not a feeling. Chronodex is for anyone exploring a city on foot, and it turns every landmark into a doorway to its past." |
| **0:15 to 0:24** · 02 ONE REAL RUN: enter | The phone. The welcome screen, a tap on **▶ ENTER THE TIMESTREAM**, the fall through the clouds onto South Kensington. | Whoosh as the clouds burst. | "Here's one real run, start to finish. Enter the timestream, and the map falls through the clouds to where you're standing." **[PAUSE 2 s]** |
| **0:24 to 0:40** · capture | The pixel map, the gold ring at the Royal Albert Hall. The dot walks into it, the capture button lights, the camera opens, the photo is taken, the coin badge drops and shines. | **[APP SOUND]** shutter, then the coin. | "Every landmark has a ring on the pavement. Walk into it and take the photo: the server checks you're within fifty metres." **[PAUSE 3 s]** |
| **0:40 to 0:47** · keep | The Dex counter goes up, the badge glows in colour; the memory box opens on the photo. | Chest sound. | "The badge is yours, and your photo goes in your memory box." |
| **0:47 to 1:05** · the Time Machine | Time Machine, year bar on **1871**. The 360° view turns from the hall across the gardens and back, then up to the roof. "AI reconstruction" label in view. | **[APP SOUND]** the 1871 music-hall piano and hooves, full volume in the pause. | "Now the Time Machine: the Royal Albert Hall in 1871, the year it opened. Look all the way around, with the phone or a finger." **[PAUSE 5 s]** |
| **1:05 to 1:17** · the guide | A tap on **▶ Meet Edith**, then her generated video full frame: she walks into the 1871 scene and introduces herself. | **[APP SOUND]** Edith: "I'm Edith Marlow, and I keep the beds and paths in this garden…" | "Then someone from that year walks up to meet you." **[PAUSE 9 s]** |
| **1:17 to 1:28** · the chat | The chat: her portrait, name and role, her greeting. The player types "What did tickets cost?", her reply streams in, a tap on play. | **[APP SOUND]** the chime, then her spoken reply. | "And you can keep talking. She answers from her era's sources, in her own voice." **[PAUSE 5 s]** |
| **1:28 to 1:48** · 03 HOW IT'S BUILT | Full-frame pipeline card, no phone. Left to right, each box lighting up as it is named, with Royal Albert Hall 1871's real output under it: **DeepSeek** brief and sources → **fal** scene (scene.jpg) → 360° panorama (panorama.jpg) → portrait (headshot.jpg) → voice (a waveform) → guide video (a frame of talk.mp4). Under the panorama box: **Claude** check ✓. Along the bottom: **MongoDB Atlas**, "made once, shared by every player". | Soft music bed. | "Under the hood: DeepSeek researches each year and writes a brief with its sources. fal then makes everything you just saw and heard: the scene, the three-sixty, the voices, the music and the guide's video. Claude checks every picture before we keep it, and MongoDB stores it all, so each era is made once and shared by every player." |
| **1:48 to 2:00** · 04 WHAT'S NEW | **The same end card as the first video, unchanged:** WELCOME, TIME TRAVELLER · CHRONODEX · "Collect the city. Then step into its past." · ALL IMAGE AND AUDIO GENERATION BY FAL · MADE BY Ishan · Alex · Fernando · Azlan, with the duck walking across the ground line. | Music bed swells and ends. | "What's new is the whole loop, from a real street to a living past. Eleven eras are live, and in testing five of six panoramas came out right first time. Chronodex: collect the city, then step into its past." |

### The voice-over on its own (to read from)

> Every city is full of history you walk straight past. A plaque gives you a date, not a feeling. Chronodex is
> for anyone exploring a city on foot, and it turns every landmark into a doorway to its past.
>
> Here's one real run, start to finish. Enter the timestream, and the map falls through the clouds to where
> you're standing.
> **[pause 2 seconds]**
>
> Every landmark has a ring on the pavement. Walk into it and take the photo: the server checks you're within
> fifty metres.
> **[pause 3 seconds]**
>
> The badge is yours, and your photo goes in your memory box.
>
> Now the Time Machine: the Royal Albert Hall in 1871, the year it opened. Look all the way around, with the
> phone or a finger.
> **[pause 5 seconds]**
>
> Then someone from that year walks up to meet you.
> **[pause 9 seconds]**
>
> And you can keep talking. She answers from her era's sources, in her own voice.
> **[pause 5 seconds]**
>
> Under the hood: DeepSeek researches each year and writes a brief with its sources. fal then makes everything
> you just saw and heard: the scene, the three-sixty, the voices, the music and the guide's video. Claude checks
> every picture before we keep it, and MongoDB stores it all, so each era is made once and shared by every
> player.
>
> What's new is the whole loop, from a real street to a living past. Eleven eras are live, and in testing five
> of six panoramas came out right first time. Chronodex: collect the city, then step into its past.

## Facts behind the lines (checked 15 Nov)

- **50 m:** `GAME.CAPTURE_RADIUS_M`; the server decides the capture (README, Game mechanics).
- **Royal Albert Hall opened in 1871:** the era's brief, with sources. Edith Marlow is fictional.
- **Tools:** README "Built with" and TECHNICAL_WRITEUP 7.1. DeepSeek (`deepseek-flash`) is the Historian and the
  chat. fal makes every image, voice, sound and video. Claude Sonnet is the image critic, called through fal.
  ElevenLabs voices run through fal. MongoDB Atlas holds landmarks, eras, captures, the job queue and the media
  store.
- **11 eras live, 7 with a guide video:** the folders in `public/demo/` today. The guide videos are the Royal Albert
  Hall 1871, Queen's Tower 1962, Raffles' Landing 1819, Zócalo 1519, Praça do Comércio 1775, East Berlin 1987 and
  the Roman Forum AD 120.
- **5 of 6 panoramas right first time:** `notebook/agent-2.md`, the last six live runs with the final panorama
  method. It's a small sample, which is why the line says "in testing".
- Not said aloud, but true and available for the card if you want more: the critic agreed with a human on 10 of
  10 labelled panoramas (tuned on that same set), and 574 automated tests pass.

## For the edit (Agent 2's notes, not read aloud)

- Reused from the first video: the welcome, map, capture, memory, Time Machine, guide and chat recordings. The
  chat is a real DeepSeek reply and Edith's real spoken reply.
- New: the problem card (part 1) and the pipeline card (part 3), built from Royal Albert Hall 1871's real files.
  The end card is the first video's, unchanged (the human asked for the same ending); the numbers are spoken
  over it. No new fal spend; nothing is regenerated.
- The globe and the ducks are dropped to make room for parts 1, 3 and 4. Say if you want a 3-second glimpse
  of them kept.
- Each part's length is set from your recording, as last time.

## As built (15 Nov, from the team's three files)

- **Voice-over:** the team's recording (104 s), transcribed with word timings by fal Scribe v2 (`transcribe.mts`,
  about 1.5 cents) and cut into its blocks; each block placed on its pictures, with the pauses lengthened to fit.
- **Part 2:** the team's street film and the phone's screen recording side by side, in sync (the screen runs
  0.55 s, then 0.85 s, behind the street film; matched on the cloud burst, map, badge twirl, motion prompt and the
  horse). 43.6 s up to the tap on Meet Edith, then Edith's own clips full frame (10.8 s), then the chat from the
  first video's recording (19 s): 73.4 s for the whole run.
- **Built by:** `cards2.mjs` (cards), `timeline2.mjs` (every timing), `build2.mjs` (assembly). Output
  `out/chronodex-demo-2.mp4`, 2:01, 1920x1080.
- The phone's screen recording shows the app's small MOCK DATA tag (the app was in mock mode during the run).

