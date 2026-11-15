# Chronodex: 2-minute demo video script

Read the **VOICE-OVER** lines aloud in one take and send the audio file (MP3, WAV or M4A). Agent 2 then cuts the
screen recordings and the app's own sounds to your timing. Timings below are targets: speak naturally, and the
pictures will follow your voice.

**Total spoken: about 200 words, roughly 80 seconds.** The other 40 seconds belong to the app's own sounds, which
the video plays at the moments marked **[APP SOUND]**.

## Recording tips

- Record in a quiet room, phone or laptop mic held about a hand's width away. No music under it.
- At each **[PAUSE n s]**, stop talking and count the seconds in your head. Too long or too short is fine: the edit
  stretches the picture to fit. Between blocks, leave a breath of about a second.
- If you trip on a line, pause, then say the whole sentence again. Agent 2 keeps the last clean take.

## Why this order

The video follows one player's first walk. They **enter** (welcome screen), **explore** (map style, the globe and
its ducks), **collect** (camera, coin badge, Dex, memory box), then get the **payoff** (Royal Albert Hall in 1871:
360° view, period sound, the guide's video), then **talk** to the guide, then the **close**. The quietest,
most visual moments (360° view, guide video) come late, when the viewer already knows what they are looking at.
Royal Albert Hall is the one landmark followed all the way through.

## The script

| Time | On screen | Sound | VOICE-OVER |
|---|---|---|---|
| **0:00 to 0:09** · Welcome | Black, then the welcome screen: CHRONODEX over the spinning globe in pixel clouds. A tap on **▶ ENTER THE TIMESTREAM**. The camera falls through the clouds and lands on South Kensington. | Whoosh as the clouds burst (added in the edit). | "Every street has a past you can't see. Chronodex lets you step into it." |
| **0:09 to 0:28** · The map | The pixel map: landmark sprites, the dashed gold capture rings, the player's dot. A pan across Exhibition Road. Tap **World**: the map zooms out to a globe. Follow the British duck sailing the Atlantic in a top hat, the Saharan duck, and the duck walking the Great Wall. Tap **City** to fly back to London. | Soft map music bed (added in the edit). | "It starts as a game. A hand-drawn pixel map marks real landmarks, each with a ring on the pavement where you stand to catch it. Zoom out and the map becomes a globe, from London to Singapore, with a few costumed ducks on voyages of their own." |
| **0:28 to 0:44** · Collect | The dot walks into the Royal Albert Hall ring. The button lights up: **Capture Royal Albert Hall**. The camera opens and a photo is taken. The badge coin drops, twirls, bounces and shines. Cut to the Dex: the counter goes up and the new badge glows in colour. | **[APP SOUND]** shutter, then the coin landing (added in the edit). | "Stand within fifty metres of a landmark, take its picture, and you win its badge." **[PAUSE 3 s]** "Every badge lands in your Dex," |
| **0:44 to 0:52** · Memory box | The little pixel chest in the corner bounces as the photo lands. Tap it: the photos open as a stack of polaroids with their dates. | | "and every photo you take is kept in your memory box, right on your phone." |
| **0:52 to 1:16** · Time Machine, Royal Albert Hall 1871 | Open the Time Machine. The year bar slides to **1871**. The 360° view fills the screen: the camera turns slowly from the hall across the Horticultural Society's garden and back, then tilts up to the roof. Show the "AI reconstruction" label. Open the Sources drawer for a second. | **[APP SOUND]** the 1850 to 1899 ambience: music-hall piano and hooves on the cobbles, at full volume during the pause. | "Then the payoff: the Time Machine. Pick a year. Here it's 1871, the spring the Royal Albert Hall opened, and you can look all the way around the place as it stood." **[PAUSE 5 s]** "Every era is researched with its sources, and even the music and street sounds are made for the period." |
| **1:16 to 1:38** · The guide | Edith Marlow walks on into the 1871 scene, stops, and talks to camera, with captions. | **[APP SOUND]** Edith's own voice, about 9 s: "They say the organ inside has ten thousand pipes, and the whole place sits about eight thousand people." The ambience dips under her. | "Then someone from that year walks up to meet you." **[PAUSE 10 s]** |
| **1:38 to 1:50** · Chat | The chat thread: Edith's portrait, name and role at the top, her greeting bubble. The player types "What did a ticket cost on opening night?". Her reply streams in. Tap play on the reply. | **[APP SOUND]** the send and receive chimes, then a few words of her spoken reply. | "And she'll keep talking, by text or by voice, in her own voice." **[PAUSE 3 s]** |
| **1:50 to 2:00** · Close | The progress sheet: each stage with its fal model and time (scene, panorama, voice, guide video). Then the CHRONODEX title card. | Music bed swells and ends. | "Every picture, voice and video is generated with fal, checked, and kept. Chronodex: collect the city, then step into its past." |

### The voice-over on its own (to read from)

> Every street has a past you can't see. Chronodex lets you step into it.
>
> It starts as a game. A hand-drawn pixel map marks real landmarks, each with a ring on the pavement where you
> stand to catch it. Zoom out and the map becomes a globe, from London to Singapore, with a few costumed ducks on
> voyages of their own.
>
> Stand within fifty metres of a landmark, take its picture, and you win its badge.
> **[pause 3 seconds]**
> Every badge lands in your Dex, and every photo you take is kept in your memory box, right on your phone.
>
> Then the payoff: the Time Machine. Pick a year. Here it's 1871, the spring the Royal Albert Hall opened, and you
> can look all the way around the place as it stood.
> **[pause 5 seconds]**
> Every era is researched with its sources, and even the music and street sounds are made for the period.
>
> Then someone from that year walks up to meet you.
> **[pause 10 seconds]**
>
> And she'll keep talking, by text or by voice, in her own voice.
> **[pause 3 seconds]**
>
> Every picture, voice and video is generated with fal, checked, and kept. Chronodex: collect the city, then step
> into its past.

## Facts behind the lines (checked)

- 50 m capture radius: `GAME.CAPTURE_RADIUS_M` in the shared contracts.
- Royal Albert Hall opened 29 March 1871 (the era's brief, with sources). Edith Marlow is fictional, a garden
  attendant at the Royal Horticultural Society gardens; her lines come from her generated script.
- Royal Albert Hall 1871 media, all made with fal: scene and 360° panorama (Nano Banana Pro edit, 4032×2016),
  portrait (Nano Banana 2.1), voice (Eleven v4), walk on and walk off (Kling v4 image to video, 5 s each), talk
  (Kling AI Avatar v2, 39.2 s). Ambience: Sonilo music and ElevenLabs sound effects through fal.

## For the edit (Agent 2's notes, not read aloud)

- **Format:** 1920×1080, because the demo screen is landscape (MASTER A7). The phone screen is recorded at 390×844
  and sits in the centre in a simple phone frame, with a short caption beside it for each block.
- **Capture:** each block is recorded from the running app (headless Chrome at phone size, location spoofed onto
  the landmark), then cut to the voice-over's timing. The coin and shutter sounds and the music bed are added in the
  edit. The ambience, Edith's clip and the chat chimes are the app's own files.
- **Needs:** ffmpeg to assemble the video. It is not installed on this machine; it will go in
  `spikes/agent-2/demo-video/`'s own package (`ffmpeg-static`), touching nothing shared. The chat's spoken reply
  needs fal credit. Without a top-up, that block shows the text reply and the chimes only, and Edith's voice
  comes from her video.
- **Then/Now slider:** left out. It is hidden for the demo eras whose scene does not match the reference viewpoint.
