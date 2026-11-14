# Phone test: Map, Capture and Dex

For a human with one iPhone (Safari) and one Android phone (Chrome). This is task A3-10. Camera and location only work over **HTTPS**, so use the Vercel deploy, or `npm run dev:phone` in this folder (accept the certificate warning). To test without standing at a landmark, open the app with `NEXT_PUBLIC_DEV_TOOLS=1` and use the "Spoof location" panel on the map. Mocks on (`NEXT_PUBLIC_USE_MOCKS=1`) means no keys are needed.

Report per row: pass, or what you saw. A screenshot helps for anything odd.

| # | Do this | Expect |
|---|---|---|
| 1 | Open `/`. Tap "Share location" and allow | Six pixel landmarks on a game map, your dot, the map zooms to you |
| 2 | Deny location instead (reload, tap Don't Allow) | A banner says how to turn it back on. The map still shows the landmarks |
| 3 | Spoof to a photo spot, press the gold capture button | `/capture` opens with the rear camera live and the landmark's name on the viewfinder |
| 4 | Deny the camera when asked | A message and a "Take or pick a photo" button that opens the phone's camera or library |
| 5 | Press the shutter, then "Use this photo" | "Sending your photo" steps, then "Badge collected!" with the badge bouncing in |
| 6 | Tap "Open Time Machine" | The Time Machine opens for that landmark |
| 7 | Spoof far from any landmark, take a photo | "Not quite. You are X m from Y. Head north-east to reach its photo spot." (check the direction) |
| 8 | Take the photo in portrait, then landscape | The preview is the right way up, not sideways |
| 9 | Open `/dex` (tap the "Dex 1 / 6" chip on the map) | Collected badge in colour with date, the rest as grey silhouettes, progress bar |
| 10 | Switch to airplane mode, reload `/dex` | The same badges show with an "Offline copy" tag |
| 11 | Safari: Share, Add to Home Screen. Chrome: menu, Install app | The Queen's Tower icon, name "Chronodex", opens full screen without browser bars |
| 12 | Pull down on the map and on the camera | The page does not bounce or reload. Nothing hides behind the notch or the home bar |
| 13 | Read the map's bottom corner | The OpenFreeMap / OpenMapTiles / OpenStreetMap credit is visible, not covered by the bottom bar |

Known gap: with mocks off, step 5 stops at "The server cannot take photos yet" until the upload route (A2-11) exists.
