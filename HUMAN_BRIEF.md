# Chronodex — brief for the humans

Plain-language status, what to test, and the questions the agents need answered so they can keep
working without you. Written 2026-11-14. The detail is in [TECHNICAL_REVIEW.md](TECHNICAL_REVIEW.md).

## 1. Where we are

The foundation is solid. The whole app is one Next.js project with the shared types, database,
API, and the "brain" (the Historian and the guide chat) already written and unit-tested — but the
database and Claude parts have never been run against the real services, because the keys haven't
been shared yet.

The studio half (everything generated with fal — images, 360° view, voices, video) has been proven
in throwaway experiments and is waiting on your eyes and ears, then it gets built into the real app.

The visible screens are taking shape: the map (built this session) and the Time Machine and chat
screens (Agent 4 built them against mock data, desktop-checked).

**The single biggest risk is not code — it is the missing keys, the missing reference photos, and
the deadline.** Everything the agents build next depends on one of those.

## 2. What you can look at right now

1. **The map** — run it and open `/`. Six pixel-art landmarks on a game-style map, your position,
   capture rings, and the capture button. (Built this session; check it on a phone.)
2. **The Time Machine and chat (Agent 4, new)** — open `/time/queens-tower` directly (any landmark
   id works) for the year bar, 360° view, guide player and progress sheet; `/chat/queens-tower_1893`
   for the chat. Mock data, no keys needed.
3. **The map spike** — `spikes/agent-3/`: `npm ci`, `npm run dev`, open the local URL, add `?dev=1`
   to fake your location. Same thing, pre-port.
4. **The 360° viewer spike** — `spikes/agent-4/`: instructions are in its README. It accepts any
   panorama, including Agent 2's test one.
5. **The voice and video bake-off** — open `spikes/agent-2/out/review.html` and listen/watch. This
   is the decision point for the guide's voice and the talking-video model.

## 3. What is blocking the agents

| # | Blocker | Unblocks | What to do |
|---|---|---|---|
| 1 | `MONGODB_URI` + `ANTHROPIC_API_KEY` + `DEEPSEEK_API_KEY` | Agent 1: seed the database, run the real Historian (Claude), real chat (DeepSeek), deploy to Vercel | Share the values privately (never in git) |
| 2 | fal credit count (and key for the app) | Agent 2: how many guide videos we can afford | Check the fal dashboard, tell the team the number |
| 3 | The six reference photos with GPS (H1) | Real photo spots + the base image every era edit is built on | Take them if not already taken, or hand over the files |
| 4 | Voice picks + talk-model pick | Agent 2 writes `VOICE_CATALOG` and the 45 s clip | Open `spikes/agent-2/out/review.html`, pick ~4–6 voices and one talk model |
| 5 | Real-phone checks | M1 and M2 gates | See the test checklist below |
| 6 | iCloud | Stops git corruption | Move the repo out of the iCloud-synced folder |
| 7 | Node 24 | The unit tests fail on the installed Node 26.13.1 (vitest won't start) | Install Node 24 (`nvm use 24`, or match `.nvmrc`) and re-run `npm run check` |
| 8 | `MASTER.md` §7 | It still says the guide chat uses Claude; it is now DeepSeek | A human edits `MASTER.md` (agents may not) |

## 4. Test checklist for humans

Do these on **one iPhone and one Android** phone. Nothing below needs keys — mocks are on by
default in `.env.example` (copy it to `.env.local` if it is missing, so `NEXT_PUBLIC_USE_MOCKS=1`).

- [ ] **Map loads** — open the app; six landmark sprites render on the game map, no blank tiles.
- [ ] **Map frames the landmarks** — on open, all six are visible without zooming.
- [ ] **Location prompt** — tapping "Share location" shows the browser prompt; after allow, your
      dot appears and the map recentres on you.
- [ ] **Capture ring + button** — in the dev spoof panel (enable `NEXT_PUBLIC_DEV_TOOLS=1`, or use
      `?dev=1` in the spike), jump to a photo spot: the capture button lights up and says the name.
- [ ] **Landmark card** — tapping a marker opens its card (badge, rarity, blurb, years, distance).
- [ ] **360° viewer** — in `spikes/agent-4`, the panorama follows the gyroscope after you tap
      "Enable motion" (iOS needs that tap); pitch/yaw stop at the image edge with no black.
- [ ] **No scroll/overscroll jank** — the map stays fixed; pulling down does not bounce the page.
- [ ] **Attribution visible** — the OpenFreeMap / OpenMapTiles / OpenStreetMap credit is not hidden
      by the bottom bar.
- [ ] **Error states** — deny location: the banner explains how to re-enable it; fly to airplane
      mode and back: the map still shows landmarks.

## 5. Questions we need answered

The agents can run longest if these are answered now.

1. **When is the real submission deadline?** Everything is scheduled against "Sunday midday".
2. **How many fal credits do we have?** That decides one guide video per landmark vs all 18 eras.
3. **Who runs the worker, on whose machine?** (Default: Agent 2's human.) It must be up for live
   generation and for the overnight pre-generation run.
4. **Are the six H1 photos taken?** If not, they must be — the light was fading around 16:10.
5. **Which voices and which talk model?** From `spikes/agent-2/out/review.html`.
6. **What are the judging criteria and the fal prize criteria?** So the demo can be aimed at them.
7. **Do you confirm the assumptions in `MASTER.md` section 1.3?** Especially the "Pokémon-style but
   original" (A1) and "guide is fictional" (A2) rules.
8. **Can the repo move out of iCloud?** The `.git` folder is at risk.

Once these are answered, the agents' next autonomous chunks are: Agent 1 seeds Atlas + runs one
real Historian brief + one real chat reply + deploys; Agent 2 builds the fal library, pipeline and
worker; Agent 3 finishes the capture and Dex screens; Agent 4 builds the Time Machine and chat
screens against mocks.
