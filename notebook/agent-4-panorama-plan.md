# Plan: the 360° view of the past, made once with fal and kept

Written Sun 15 Nov 2026 at 01:50 at the human's request. Owner: Agent 4 (the human made this Agent 4's top
priority). Pieces that live in Agent 1's or Agent 2's files are listed as their tasks in their notebooks.

## 1. Where it stands

| Piece | State |
|---|---|
| Panorama stage (`src/lib/pipeline/stages/panorama.ts`, Agent 2) | Built. Paste the era's scene into a grey 2:1 canvas, outpaint it with `fal-ai/nano-banana-pro/edit` at 2K, local "unpainted grey" check, Sonnet critic through fal, one corrective retry, SeedVR2 upscale ×1.4 to 4032×2016 |
| 360° viewer (`PanoramaView.tsx`, Agent 4) | Built, passes on an iPhone with test images. **Never shown a real generated panorama on a phone** |
| "Generate once, share with every player" | Built at the database level: one Era per landmark and year, `generate` is safe to call twice, `runEraJob` skips any stage whose output is already on the Era, fal request ids are saved so a restarted worker resumes instead of paying again |
| Keeping the files | **Missing.** The Era stores fal CDN URLs only. fal keeps files for at least 7 days, then the era points at dead links and the only fix is to pay to regenerate. `scripts/backup-media.ts` downloads copies but nothing serves them and the Era is not rewritten |
| Keeping them on the phone | **Missing.** Every visit downloads the 2 to 4 MB panorama again. Nothing is cached in the browser |
| First real panorama | **Blocked** on A2-a: the scene stage would send the mock `.svg` reference photo to fal. Needs a real 16:9 reference photo (H1 or Agent 5's A5-b) |

What one era's 360° view costs today (list prices, `src/lib/pipeline/assets.ts`): scene $0.15 + panorama $0.15
+ two critic checks $0.025 + upscale $0.02, times about 1.4 for retries: **about $0.47**, and up to about $0.70
when both pictures need their retry.

## 2. How to spend as little as possible on fal

In order of how much they save.

1. **Pay once per landmark and year, ever** (section 3). After the first generation, every player and every
   visit costs $0. Keeping our own copy means the 7-day fal expiry never forces a paid regeneration.
2. **Generate only on demand, plus a fixed demo list.** A year is painted the first time someone opens it, or by
   `scripts/pregenerate.ts` for the demo eras. Live generation is core tier only; `VIDEO_GENERATION=off` until
   the credit count is known (H2).
3. **Cap paid retries per era** (Agent 1, `generate.ts`). Today a `failed` era goes back in the queue every time
   someone taps Retry. Allow at most 2 failed jobs per era; after that the server answers `retry_limit` until a
   human reruns it with `force`. Stops a stuck era burning credits in a loop.
4. **Free checks before paid ones.** The local unpainted-grey check already runs before the critic. Add the
   same for aspect ratio and file size so an obviously broken picture never reaches the $0.0125 critic or a
   retry.
5. **Resolution where it is free, upscale where it is not.** Nano Banana Pro is a flat $0.15 at 1K and 2K and
   double at 4K, so keep 2K, never ask for 4K, and enlarge with SeedVR2 ($0.02). 4032 px also stays under the
   4096 px texture limit of older phones.
6. **Fewer input tokens.** At most `MAX_REFERENCE_PHOTOS` (3) period photos, each downscaled to 1024 px on the
   long side before upload, and short prompts built by the prompt functions. This matters most on the
   token-priced fallback (`google/nano-banana-2.1/edit`) and for the critic, which is token priced.
7. **Upload each input once.** The reference photo is uploaded to fal storage once per landmark and the fal URL
   kept in the media ledger (section 3) with its expiry, not re-uploaded per era or per retry.
8. **Experiment E1: one picture instead of two (saves about 45 %).** Paste the present-day reference photo, not
   the generated scene, into the 2:1 canvas and ask the model to re-date the centre and paint the rest in one
   request. Crop the centre 16:9 out as the era's `sceneImageUrl`. One $0.15 call and one check instead of two.
   Try it once on Queen's Tower 1893 against the current two-step result, look at both on a phone, and adopt it
   only if the human cannot tell them apart. Agent 2 runs it (their stage); Agent 4 shows both side by side.
9. **Do not trim the critic.** At $0.0125 it is cheap insurance against keeping a bad panorama, which would
   cost a full regeneration later.

With 1 to 3 and the current pipeline, the demo (about 12 eras) costs about $6 in panoramas and scenes once, and
nothing after. With E1 adopted, about $3.50.

## 3. Saving every generated file so it is never made twice

### 3.1 Design

- **Where:** MongoDB GridFS in the Atlas database we already use (bucket `media`). It works wherever the app
  runs (laptop with a tunnel, or Vercel) and wherever the worker runs, with no new account or key. Size per era
  without video: panorama about 2.5 MB, scene 0.3 MB, headshot 0.1 MB, narration 0.7 MB, so about 3.6 MB; 20
  eras is about 75 MB, well inside the free tier's 512 MB. Guide video clips (tens of MB each) stay on fal plus
  the local backup, and move to the store only if space allows.
- **Without `MONGODB_URI`** (local development, tests): a folder `media/` (git-ignored), same interface.
- **Ledger:** a `media_assets` record per file: `{ _id, eraId, name, contentType, bytes, sha256, sourceUrl,
  falUrl, falUrlExpiresAt, createdAt }`. `sha256` dedupes identical files.
- **What the Era stores:** the durable URL `/api/media/<id>` in place of the fal URL. Same contract fields, no
  contract change (they are strings).
- **Serving:** `GET /api/media/[mediaId]` streams the file with `Cache-Control: public, max-age=31536000,
  immutable` and an `ETag` (the sha256), and answers `Range` requests with 206, because iOS Safari will not play
  audio or video from a server that ignores Range.
- **Feeding stored files back to fal:** later stages (panorama after scene, guide frame, walks) need a public
  URL. `toFalUrl(url)` returns the ledger's `falUrl` while it has more than a day left, else uploads the bytes
  to fal storage again (free) and records the new URL. Agent 2's A2-a (relative reference photo) becomes the
  same function.

### 3.2 Flow, after the change

```
player opens a year
  └─ GET /api/eras/:id ── era ready? ── yes ── panorama URL /api/media/<id>
        │                                       └─ browser: Cache Storage hit? show at once : fetch once, keep
        no
  └─ POST generate (once, shared) ── worker runs the stage on fal
        └─ persistFromUrl(falUrl) → GridFS + ledger → patchEra({ panorama: { url: '/api/media/<id>', ... } })
```

### 3.3 In the browser (Agent 4's own files)

- `mediaCache.ts`: Cache Storage (`chronodex-media-v1`). The Time Machine reads the panorama, scene, headshot
  and narration through it; on a hit nothing is downloaded. Wrapped in try/catch, because private mode and
  some in-app browsers refuse Cache Storage; then it falls back to a plain fetch.
- Prefetch: when the Time Machine opens, fetch the panoramas of the landmark's other ready years in the
  background, so switching year is instant.
- Era snapshot: the last `EraResponse` per era in `localStorage`, shown at once while the network answers, so a
  ready era never shows a spinner on a second visit.

## 4. Tasks

| Id | Task | Owner | Needs |
|---|---|---|---|
| A4-11 | `src/lib/media/`: store (GridFS and folder backends), ledger, `persistFromUrl`, `toFalUrl`, unit tests with a fake store, README | Agent 4 (new path, granted by the human) | Atlas URI (have) |
| A4-12 | `src/app/api/media/[mediaId]/route.ts`: stream, immutable cache header, ETag, Range 206; test with a fake store | Agent 4 (new path, granted by the human) | A4-11 |
| A4-13 | `scripts/persist-media.ts`: copy every existing era's fal URLs into the store and rewrite the Era (Queen's Tower 1893 in the dev databases already has real media); `--dry-run` | Agent 4 (new file) | A4-11 |
| A4-14 | Browser cache: `mediaCache.ts`, year prefetch, era snapshot, wired into PanoramaView, ThenNowSlider, GuidePlayer, Avatar | Agent 4 | none |
| A4-15 | First real panorama on two phones (T12, M1 gate): open the real Queen's Tower 1893 era, check level horizon, no seam in front, landmark centred; fix the viewer if not | Agent 4 with the human | A2-a, a reference photo |
| A2-h | In `runEraJob`, persist each stage's output with `persistFromUrl` before `patchEra`; pass inputs through `toFalUrl` (this also closes A2-a) | Agent 2 | A4-11 |
| A2-i | Free pre-checks (aspect, size) before the critic; downscale references to 1024 px; upload the reference photo once per landmark | Agent 2 | none |
| A2-j | Experiment E1 (one picture instead of two) on Queen's Tower 1893; report cost and result on the board | Agent 2 | A2-a |
| A1-f | Retry cap in `requestEraGeneration`: at most 2 failed jobs per era, then `retry_limit` unless forced; add `media_assets` to the database docs and `MEDIA_DIR` to `.env.example` | Agent 1 | none |

Order: A4-11 and A4-14 now (no keys needed), A4-12, then A2-h, then A4-13 on the dev database, then A4-15 when
A2-a and a reference photo land.

## 5. How we know it works

- Generate Queen's Tower 1893 once; open it from two browsers: the second open makes no fal request (worker log
  and fal dashboard) and its panorama comes from `/api/media/...`.
- Change the stored fal URL to a dead one: the era still loads, because the Era points at our copy.
- Reload the Time Machine with the network throttled: the panorama appears from Cache Storage with no new request
  for it in the Network panel.
- Narration from `/api/media` plays on an iPhone (proves Range).
- `npm run check` passes with the new tests.
