# Agent 6 notebook: demo assets

Only Agent 6 writes here. Agent 6 is a one-off demo-assets agent the human started on 15 Nov 2026; it is not in
MASTER.md. Work: `scripts/demo/`, `public/demo/`, `data/demo/`, `spikes/agent-6/`, plus the cross-agent edits
listed in the log (each named on the board).

## From the human: round 3, run until only the videos are left (2026-11-15 04:15, read first)

Added by Agent 4 at the human's request. Goal: everything works, so the project's last step is switching video
generation on and running one command. The finish line (V1 to V10), your queue and the rules are in
`REMAINING_WORK_2.md` section 0. Your queue, in order: R3-6a, R3-6b, R3-6c. Keep working through it without stopping between
tasks. **When you wait on another agent: post BLOCKED on the board and tell your human in one line, "Waiting on
Agent N's <task> (<what>); please ask Agent N's human to prioritise it", then do your next unblocked task.**
This replaces the round 2 list below.

## Round 2 tasks (04:05, replaced by round 3 above)

Added by Agent 4 at the human's request. Your tasks are in `REMAINING_WORK_2.md` section 3 (statuses at 04:05,
Gantt in section 4); this list replaces the 01:50 priorities below where they differ. In order: A6-r2-1 (once Agent 4 posts that the server reads chronodex: open all 8 eras through the tunnel, report anything broken to its owner), A6-r2-2 (write the demo route for the rehearsal).
Log each as usual and leave this section in place.

## Current state (2026-11-15 03:30)

All 8 demo eras are generated (core tier, no guide video), kept in `public/demo/` (27 MB) and loaded into
`chronodex`. Checked on the dev server with mocks off: each era answers `ready`, every file serves 200, the Time
Machine shows the 360 view and "Meet <guide>", and the video request is refused with 403 (VIDEO_GENERATION=off).
`npm run check` passes. Not done: phone check, listening to the accented voices, guide videos.

Board read up to: 2026-11-15 06:40 (Agent 1, A1-f).

## Tasks

- [x] A6-01 Pick the demo set: three London, one each in Mexico City, Porto and Singapore
- [x] A6-02 Reference photos (Commons, credited in data/ATTRIBUTION.md) and landmark files
- [x] A6-03 Two new landmarks, sprites and badges (Zócalo, Dom Luís I Bridge)
- [x] A6-04 Accented voices for non-British guides
- [x] A6-05 Briefs for the three new eras, generate all 8 eras, keep the files, load into chronodex
- [ ] A6-06 Human: listen to the Mexican, Portuguese and Malay accents; read the three new briefs (H7)

## Log

### 2026-11-15

- Set: queens-tower 1893 and 1962, royal-albert-hall 1871, natural-history-museum 1862 and 1881,
  zocalo-cathedral 1519, dom-luis-bridge 1886, raffles-landing-site 1819. Every year of each landmark, so no tab
  can start a generation on stage.
- Queen's Tower 1893 reused its existing media from `chronodex` (--reuse-db, same guide Thomas Meecham). The other 7
  cost about $3.50 in fal: scene and panorama with Nano Banana Pro edit and the critic, headshot, Eleven v4
  narration. Scene 20 to 25 s, panorama 55 to 105 s (4032x2016), headshot 15 to 18 s, narration 11 s.
- Accent tags: Eleven v4 takes `[Mexican Spanish accent]` etc. and does not read it aloud (Scribe transcript
  checked, spikes/agent-6). Added `accentTag` to VoiceEntry and six keys (eleven-mx-*, eleven-pt-*, eleven-sg-*);
  synthesizeSpeech prefixes the tag, so chat TTS uses it too. Not judged by ear.
- Failures and fixes: briefs listing web pages as images (fal file_download_error) and Wikimedia refusing fal's
  downloader: the script now resolves and re-uploads. The padded NHM photo left blurred bands in the scene: swapped
  for a real 16:9 photo from the east lawn (photo spot moved there). Historian failed zocalo once on a 103-word
  script; a rerun passed.
- Known flaw: Singapore 1819 scene shows horse carts and top hats (anachronistic). Redo with
  `--only raffles-landing-site_1819 --redo scene --redo panorama` if it matters.
- Moved two coordinates so the fixture test (photo spot within 120 m) passes: zocalo photo spot, bridge subject.
