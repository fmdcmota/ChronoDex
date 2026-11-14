# Time Machine components

Owner: Agent 4. The `/time/[landmarkId]` screen (MASTER.md section 1.2 part 2, tasks A4-02 to A4-06 and A4-09).

## Entry points

- `TimeMachineScreen.tsx`: the whole screen. Loads the landmark and its eras through `@/lib/client`,
  generates a missing era (core tier, then video tier, each at most once per visit), polls while a job runs.
- `PanoramaView.tsx`: Photo Sphere Viewer + gyroscope. Full 2:1 or a cropped band via `panoData.ts`.
- `GuidePlayer.tsx`: walk_on, talk, walk_off back to back (`segmentPlayer.ts`), or the narration
  until a video exists, with captions from `captions.ts`.
- `ProgressSheet.tsx`: the job's stages with model ids and seconds. Collapses to a pill for the video tier.
- `YearBar.tsx`: one button per era with a state dot.
- `ThenNowSlider.tsx` (A4-06): reference photo vs scene image with a draggable divider, maths in
  `thenNow.ts`. Opened from the header's "Then / Now" button once the era has a scene image.
- `SourcesDrawer.tsx` (A4-09): summary, fun facts and sources from the Era. Only http(s) links are
  rendered (`sources.ts`), because the Historian's URLs come from the open web.

## Run and test

    npm run dev        # mocks on: open /time/queens-tower (hero era has video), /time/royal-albert-hall (generates)
    npm run check

Gyroscope, motion permission and sound need a phone over HTTPS: `npx next dev --experimental-https`,
then follow `spikes/agent-4/PHONE_TEST.md` Test 4.

## Traps

- The screen is `fixed inset-0 z-40`, over the app shell: it is immersive and has its own back link.
- PSV touches `window`: it is imported inside an effect, never at module top.
- PanoramaView's `className` sets its position. Do not add `relative` inside it: it beat `absolute` once.
- Sound starts only from a tap ("Meet …"). SegmentPlayer primes its standby video inside that tap for iOS.
- Agent 3's `globals.css` styles bare `h2` and `p` outside any layer, so they beat Tailwind classes.
- No lookbehind regexes: Safari before iOS 16.4 cannot parse them and the whole page would fail.
