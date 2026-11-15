/**
 * A4-01 spike: Photo Sphere Viewer + gyroscope plugin on a phone, full sphere and cropped band.
 *
 * Owner: Agent 4. Implements the A4-01 task in MASTER.md section 11 (feeds A4-03).
 *
 * What it proves:
 * - PSV renders a full 2:1 equirectangular image and a cropped band placed by `vFovDeg`.
 * - The gyroscope plugin follows the phone. On iOS, motion permission is asked from a tap
 *   (the "Enable motion" button), because Safari refuses the request without a user gesture.
 * - Pitch is clamped so a band never shows the empty sphere above or below it, and yaw is
 *   clamped on a band that covers less than a full turn.
 *
 * Try a real panorama from Agent 2 with `?src=<image url>&vfov=<degrees>`.
 */
import { Viewer, type PanoData } from '@photo-sphere-viewer/core';
import { GyroscopePlugin } from '@photo-sphere-viewer/gyroscope-plugin';
import '@photo-sphere-viewer/core/index.css';
import './style.css';
import { hFovDegOf, maxOffsetRad, panoDataFor } from './panoData';
import { makeTestPanorama } from './testImage';

/** Test panoramas. Sizes are chosen to keep the canvas under iOS's texture limits. */
const MODES = {
  full: { widthPx: 4096, heightPx: 2048, vFovDeg: 180, hFovDeg: 360 },
  // 21:9 at a full turn: 1440 / 3360 * 360 = 154 degrees of pitch.
  band360: { widthPx: 3360, heightPx: 1440, vFovDeg: 154, hFovDeg: 360 },
  // 21:9 covering half a turn: 77 degrees of pitch.
  band180: { widthPx: 3360, heightPx: 1440, vFovDeg: 77, hFovDeg: 180 },
} as const;
type ModeKey = keyof typeof MODES;

const logEl = document.getElementById('log') as HTMLPreElement;
const modeEl = document.getElementById('mode') as HTMLSelectElement;
const motionBtn = document.getElementById('motion') as HTMLButtonElement;
const resetBtn = document.getElementById('reset') as HTMLButtonElement;

/** Append a timestamped line to the on-screen log (phones have no console to hand). */
function log(msg: string): void {
  const t = new Date().toLocaleTimeString();
  logEl.textContent = `${t} ${msg}\n${logEl.textContent ?? ''}`.slice(0, 2000);
}

const params = new URLSearchParams(location.search);
const customSrc = params.get('src');
const customVFovDeg = Number(params.get('vfov') ?? '180');

/** Coverage of whatever is loaded now, used by the view clamps. Set when the image loads. */
let currentVFovDeg = 180;
let currentHFovDeg = 360;

/**
 * PanoData provider that reads the real pixel size once the image loads, so a URL from
 * Agent 2 works without knowing its size in advance.
 */
function providerFor(vFovDeg: number): (img: HTMLImageElement) => PanoData {
  return (img) => {
    const size = { widthPx: img.naturalWidth, heightPx: img.naturalHeight, vFovDeg };
    const data = panoDataFor(size);
    currentVFovDeg = vFovDeg;
    currentHFovDeg = hFovDegOf(size);
    log(`loaded ${img.naturalWidth}x${img.naturalHeight}, vFov ${vFovDeg}, hFov ${currentHFovDeg.toFixed(0)} -> full ${data.fullWidth}x${data.fullHeight}`);
    return data;
  };
}

/** Return the image URL and vFov for a mode, drawing the test image if needed. */
function sourceFor(mode: ModeKey | 'custom'): { url: string; vFovDeg: number } {
  if (mode === 'custom' && customSrc) return { url: customSrc, vFovDeg: customVFovDeg };
  const m = MODES[mode as ModeKey];
  return { url: makeTestPanorama(m.widthPx, m.heightPx, m.vFovDeg, m.hFovDeg), vFovDeg: m.vFovDeg };
}

if (customSrc) {
  const opt = document.createElement('option');
  opt.value = 'custom';
  opt.textContent = `Custom, vFov ${customVFovDeg}`;
  modeEl.prepend(opt);
  modeEl.value = 'custom';
}

const first = sourceFor(modeEl.value as ModeKey | 'custom');

const viewer = new Viewer({
  container: 'viewer',
  panorama: first.url,
  panoData: providerFor(first.vFovDeg),
  defaultYaw: 0,
  defaultPitch: 0,
  defaultZoomLvl: 45,
  // Gyroscope button only appears where the device supports it.
  navbar: ['zoom', 'move', 'gyroscope', 'fullscreen'],
  plugins: [GyroscopePlugin.withConfig({ touchmove: true, roll: true, moveMode: 'fast' })],
});
const gyro = viewer.getPlugin<GyroscopePlugin>(GyroscopePlugin);

// Keep the camera inside the image. Drag and gyroscope moves both go through this event.
viewer.addEventListener('before-rotate', (e) => {
  const pitchLimit = maxOffsetRad(currentVFovDeg, viewer.state.vFov);
  e.position.pitch = Math.max(-pitchLimit, Math.min(pitchLimit, e.position.pitch));
  if (currentHFovDeg < 360) {
    const yawLimit = maxOffsetRad(currentHFovDeg, viewer.state.hFov);
    // PSV yaw runs 0..2pi. Work in -pi..pi around the image centre, then convert back.
    const signed = e.position.yaw > Math.PI ? e.position.yaw - 2 * Math.PI : e.position.yaw;
    const clamped = Math.max(-yawLimit, Math.min(yawLimit, signed));
    e.position.yaw = clamped < 0 ? clamped + 2 * Math.PI : clamped;
  }
});

viewer.addEventListener('ready', () => log('viewer ready'), { once: true });

gyro.isSupported().then((ok) => {
  log(`gyroscope supported: ${ok}, secure context: ${window.isSecureContext}`);
  if (!ok) motionBtn.disabled = true;
});

gyro.addEventListener('gyroscope-updated', (e) => {
  motionBtn.textContent = e.gyroscopeEnabled ? 'Stop motion' : 'Enable motion';
  log(`gyroscope ${e.gyroscopeEnabled ? 'on' : 'off'}`);
});

// Must run inside a tap: iOS asks for DeviceOrientationEvent permission here.
motionBtn.addEventListener('click', () => {
  if (gyro.isEnabled()) {
    gyro.stop();
    return;
  }
  gyro.start().catch((err: unknown) => log(`gyroscope refused: ${String(err)}`));
});

resetBtn.addEventListener('click', () => {
  if (gyro.isEnabled()) gyro.stop();
  viewer.animate({ yaw: 0, pitch: 0, zoom: 45, speed: '4rpm' });
});

modeEl.addEventListener('change', () => {
  const next = sourceFor(modeEl.value as ModeKey | 'custom');
  viewer
    .setPanorama(next.url, { panoData: providerFor(next.vFovDeg), position: { yaw: 0, pitch: 0 }, transition: false })
    .catch((err: unknown) => log(`load failed: ${String(err)}`));
});
