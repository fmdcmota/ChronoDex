/**
 * The 360° view of an era: look around by dragging or by moving the phone.
 *
 * Owner: Agent 4. Implements A4-03 (MASTER.md section 11, assumption A5). Proven on desktop in
 * spikes/agent-4 (A4-01); the phone checks are in spikes/agent-4/PHONE_TEST.md.
 *
 * Library: Photo Sphere Viewer 5 with its gyroscope plugin. It touches `window` when it loads, so
 * it is imported inside an effect and never runs during server rendering.
 * Handles both a full 2:1 equirectangular image and a cropped band: `panoDataFor` places the band
 * from `vFovDeg`, and the `before-rotate` clamp stops the camera showing the empty sphere around it.
 * iOS grants motion access only from a tap, so motion starts from the "Look around" button.
 */
'use client';

import '@photo-sphere-viewer/core/index.css';
import { useEffect, useRef, useState } from 'react';
import type { Viewer } from '@photo-sphere-viewer/core';
import type { GyroscopePlugin } from '@photo-sphere-viewer/gyroscope-plugin';
import type { Panorama } from '@/lib/contracts';
import { hFovDegOf, maxOffsetRad, panoDataFor } from './panoData';

/** Starting zoom, 0 (widest) to 100. Wide enough to read the scene on a phone held upright. */
const DEFAULT_ZOOM_LVL = 30;
/** Degrees in a full turn. */
const FULL_TURN_DEG = 360;

/** Props for PanoramaView. */
export interface PanoramaViewProps {
  panorama: Panorama;
  /** Classes for the outer box: its position (relative, absolute or fixed) and size. The viewer fills it. */
  className?: string;
}

/**
 * Full-bleed 360° viewer with "Look around" (gyroscope) and "Reset" buttons and the
 * "AI reconstruction" label (assumption A9).
 *
 * Side effects: creates a WebGL viewer while mounted and destroys it on unmount or when the
 * panorama URL changes. Asks for motion permission on iOS when "Look around" is tapped.
 *
 * @param props - Component props.
 * @param props.panorama - The era's panorama: URL and vertical coverage.
 * @param props.className - Position and size of the box. Must be positioned and sized.
 * @returns The viewer element.
 */
export function PanoramaView({ panorama, className = 'relative h-64' }: PanoramaViewProps) {
  const box = useRef<HTMLDivElement | null>(null);
  const viewerRef = useRef<Viewer | null>(null);
  const gyroRef = useRef<GyroscopePlugin | null>(null);
  const [gyroSupported, setGyroSupported] = useState(false);
  const [gyroOn, setGyroOn] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { url, vFovDeg } = panorama;

  useEffect(() => {
    let cancelled = false;
    let viewer: Viewer | null = null;
    // Coverage of the loaded image, set when it loads. Read by the clamp.
    let coverVDeg = vFovDeg;
    let coverHDeg = FULL_TURN_DEG;

    (async () => {
      const [{ Viewer }, { GyroscopePlugin }] = await Promise.all([
        import('@photo-sphere-viewer/core'),
        import('@photo-sphere-viewer/gyroscope-plugin'),
      ]);
      if (cancelled || !box.current) return;

      viewer = new Viewer({
        container: box.current,
        panorama: url,
        // Pixel size comes from the loaded image, so a wrong widthPx in the data cannot misplace the band.
        panoData: (img: HTMLImageElement) => {
          const size = { widthPx: img.naturalWidth, heightPx: img.naturalHeight, vFovDeg };
          coverHDeg = hFovDegOf(size);
          coverVDeg = vFovDeg;
          return panoDataFor(size);
        },
        defaultYaw: 0,
        defaultPitch: 0,
        defaultZoomLvl: DEFAULT_ZOOM_LVL,
        navbar: false,
        loadingTxt: 'Travelling…',
        plugins: [GyroscopePlugin.withConfig({ touchmove: true, roll: true, moveMode: 'smooth' })],
      });
      viewerRef.current = viewer;

      // One clamp for drag and gyroscope: keep the camera inside the image.
      viewer.addEventListener('before-rotate', (e) => {
        const v = viewer;
        if (!v) return;
        const pitchLimit = maxOffsetRad(coverVDeg, v.state.vFov);
        e.position.pitch = Math.max(-pitchLimit, Math.min(pitchLimit, e.position.pitch));
        if (coverHDeg < FULL_TURN_DEG) {
          const yawLimit = maxOffsetRad(coverHDeg, v.state.hFov);
          // PSV yaw runs 0..2pi. Clamp in -pi..pi around the image centre, then convert back.
          const signed = e.position.yaw > Math.PI ? e.position.yaw - 2 * Math.PI : e.position.yaw;
          const clamped = Math.max(-yawLimit, Math.min(yawLimit, signed));
          e.position.yaw = clamped < 0 ? clamped + 2 * Math.PI : clamped;
        }
      });
      viewer.addEventListener('panorama-error', () => setError('This view could not be loaded.'));

      const gyro = viewer.getPlugin<GyroscopePlugin>(GyroscopePlugin);
      gyroRef.current = gyro;
      gyro.addEventListener('gyroscope-updated', (e) => setGyroOn(e.gyroscopeEnabled));
      const supported = await gyro.isSupported();
      if (!cancelled) setGyroSupported(supported);
    })().catch(() => {
      if (!cancelled) setError('The 360° viewer could not start on this device.');
    });

    return () => {
      cancelled = true;
      viewer?.destroy();
      viewerRef.current = null;
      gyroRef.current = null;
      setGyroOn(false);
    };
  }, [url, vFovDeg]);

  // Must run inside the tap: iOS asks for DeviceOrientationEvent permission here.
  const toggleGyro = () => {
    const gyro = gyroRef.current;
    if (!gyro) return;
    if (gyro.isEnabled()) {
      gyro.stop();
      return;
    }
    gyro.start().catch(() => setError('Motion access was refused. You can still drag to look around.'));
  };

  const reset = () => {
    gyroRef.current?.stop();
    viewerRef.current?.animate({ yaw: 0, pitch: 0, zoom: DEFAULT_ZOOM_LVL, speed: '4rpm' });
  };

  return (
    <div className={`overflow-hidden bg-black ${className}`}>
      <div ref={box} className="absolute inset-0" />
      <span className="pointer-events-none absolute top-2 left-2 z-10 rounded bg-black/55 px-2 py-0.5 text-[11px] text-white">
        AI reconstruction
      </span>
      <div className="absolute right-2 bottom-2 z-10 flex gap-2">
        {gyroSupported && (
          <button
            type="button"
            onClick={toggleGyro}
            aria-pressed={gyroOn}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold shadow ${gyroOn ? 'bg-amber-400 text-black' : 'bg-black/60 text-white'}`}
          >
            {gyroOn ? 'Motion on' : 'Look around'}
          </button>
        )}
        <button type="button" onClick={reset} className="rounded-full bg-black/60 px-3 py-1.5 text-xs font-semibold text-white shadow">
          Reset
        </button>
      </div>
      {error && <p className="absolute inset-x-2 top-10 z-10 rounded bg-black/70 p-2 text-center text-xs text-white">{error}</p>}
    </div>
  );
}
