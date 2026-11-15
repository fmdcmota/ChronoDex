# Time Machine components

Owner: Agent 4. The `/time/[landmarkId]` screen (MASTER.md section 1.2 part 2, tasks A4-02 to A4-06 and A4-09).

## Entry points

- `TimeMachineScreen.tsx`: the whole screen. Loads the landmark and its eras through `@/lib/client`,
  generates a missing era (core tier only, once per visit; never the video tier, which the runbook makes on purpose), polls while a job runs.
- `PanoramaView.tsx`: Photo Sphere Viewer + gyroscope. Full 2:1 or a cropped band via `panoData.ts`.
- `GuidePlayer.tsx`: walk_on, talk, walk_off back to back (`segmentPlayer.ts`), or the narration
  until a video exists, with captions from `captions.ts`.
- `ProgressSheet.tsx`: the job's stages with model ids and seconds, a pill for the video tier, a queue note.
- `YearBar.tsx`: one button per era with a state marker.
- `useAmbience.ts`, `ambience.ts`, `AmbienceToggle.tsx`: period loop (`public/audio/ambience/<bucket>.mp3`,
  soft noise until it exists) through Web Audio, ducked while the guide speaks, mute saved per device.
- `pixel.ts`: class strings for the game look (pixel font, pixel frames, ink, paper and gold) built on
  Agent 3's CSS variables in `globals.css`. The chat imports it too.
- `ThenNowSlider.tsx` (A4-06): reference photo vs scene image with a draggable divider, maths in
  `thenNow.ts`. Opened from the header's "Then/Now" button once the era has a scene image.
- `SourcesDrawer.tsx` (A4-09): summary, fun facts and sources from the Era. Only http(s) links are
  rendered (`sources.ts`), because the Historian's URLs come from the open web.

## Run and test

    npm run dev        # mocks on: open /time/queens-tower (hero era has video), /time/royal-albert-hall (generates)
    npm run check

Gyroscope, motion permission and sound need a phone over HTTPS: `npx next dev --experimental-https`,
then follow `spikes/agent-4/PHONE_TEST.md` Test 4.

## Traps

- The screen is `fixed inset-0 z-40`, over the app shell: it is immersive and has its own back link.
- PSV touches `window`, so it is imported inside an effect. PanoramaView's `className` sets its position.
- Sound starts only from a tap ("Meet …"). SegmentPlayer primes its standby video inside that tap for iOS.
- Agent 3's `globals.css` styles bare `h2` and `p` outside any layer, so they beat Tailwind classes.
  Use Tailwind's important suffix (`m-0!`) where a `p` margin gets in the way.
- A pixel frame is a box-shadow 3 px outside the box: a parent with `overflow` clips it unless it has padding.
- No lookbehind regexes: Safari before iOS 16.4 cannot parse them and the whole page would fail.
- iOS ignores `audio.volume`, hence Web Audio for ambience; Web Audio is silent with the ring switch off.

## Browser media cache (A4-14)

`mediaCache.ts`: `/api/media` and fal files via Cache Storage (pictures, narration, chat headshot; clips stream).
`eraSnapshot.ts`: last ready era per id in localStorage, shown until the server answers. Failures fall back to the URL.
