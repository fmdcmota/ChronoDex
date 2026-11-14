# Agent 4 spike: 360° viewer (A4-01)

Throwaway. Never imported by `src/`. Owner: Agent 4. Proves Photo Sphere Viewer 5.15.1 and its
gyroscope plugin on a phone, for a full 2:1 panorama and for a cropped band placed by `vFovDeg`.

## Run

    npm install
    npm run dev          # HTTPS (self-signed) on the LAN, port 5173
    HTTP=1 npm run dev   # plain HTTP, desktop only (localhost counts as secure)
    npm run check        # tsc + vitest

On a phone on the same Wi-Fi open `https://<laptop LAN IP>:5173`, accept the certificate
warning, tap **Enable motion** (iOS asks for motion permission here), then move the phone.
Try a real panorama with `?src=<image url>&vfov=<degrees>`.

## Files

- `src/panoData.ts`: `Panorama` contract -> PSV `panoData`, plus view clamps. Unit tested. Lifts into A4-03.
- `src/testImage.ts`: draws a labelled test panorama on a canvas (FRONT is the image centre).
- `src/main.ts`: the page.

## Traps

- `vFovDeg` is rounded (a 21:9 full turn is 154.29°, not 154). Without snapping that leaves a
  thin seam at the back. `panoDataFor` snaps anything within 2 % of a full turn.
- PSV wants `three` at its peer version (0.185.x). npm installs a newer one unless pinned.
- iOS: `DeviceOrientationEvent.requestPermission` only works from a tap, and only over HTTPS.
- PSV's `before-rotate` event can edit the target position: one place clamps drag and gyroscope.
