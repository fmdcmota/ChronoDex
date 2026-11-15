/**
 * The welcome intro over the Map screen: "Welcome, time traveller", a CHRONODEX title over a slowly spinning globe
 * framed by clouds, and one button. Pressing it asks for the player's location, then the camera falls through the
 * cloud deck from the globe to the player's street (or to the nearest city of landmarks if there is no location).
 *
 * Owner: Agent 3 (Explorer). Written by Agent 2 at the human's request, 15 Nov 2026. Plays once per browser
 * session (lib/intro.ts); `?intro=1` forces it, `?intro=0` skips it.
 *
 * Why the location is asked for on the button and not on page load: iOS Safari shows the location prompt only in
 * response to a tap, and a prompt with no context is the one players refuse. The button press is that tap, so
 * `tracker.start()` runs synchronously inside the click handler, before anything is awaited.
 */
'use client';

import { useCallback, useEffect, useRef, useState, type CSSProperties, type RefObject } from 'react';
import type { LngLatBounds, Map as MapLibreMap, PaddingOptions } from 'maplibre-gl';
import { INTRO_TIMING, landingFor, markIntroSeen, type IntroLanding } from './lib/intro';
import type { LocationTracker } from './lib/location';
import { INTRO_CSS } from './WelcomeIntro.styles';

/** Degrees of longitude the globe turns per second while the title is up. */
const SPIN_DEG_PER_S = 4;

/**
 * The clouds framing the title: centre position in % of the screen, scale, the direction each one flies off in
 * during the dive (dx, dy), and its idle drift. Kept to the edges so the globe stays visible in the middle.
 */
const CLOUDS: readonly { x: number; y: number; s: number; dx: number; dy: number; drift: number; delay: number }[] = [
  // Top band, above the title.
  { x: 8, y: 8, s: 0.85, dx: -1, dy: -0.8, drift: 9, delay: 0 },
  { x: 90, y: 5, s: 0.75, dx: 1, dy: -0.9, drift: 11, delay: -3 },
  { x: 50, y: -5, s: 0.8, dx: 0.1, dy: -1, drift: 13, delay: -6 },
  { x: 72, y: 19, s: 0.45, dx: 0.8, dy: -0.6, drift: 7, delay: -2 },
  // Peeking in from the sides, mostly off screen, so the text stays clear.
  { x: -14, y: 47, s: 0.7, dx: -1, dy: 0, drift: 10, delay: -2 },
  { x: 114, y: 41, s: 0.7, dx: 1, dy: 0.05, drift: 12, delay: -5 },
  // Bottom band, below the small print (it also hides the map's buttons while the intro is up).
  { x: 12, y: 89, s: 1.1, dx: -0.9, dy: 1, drift: 8, delay: -1 },
  { x: 88, y: 92, s: 1.05, dx: 0.9, dy: 1, drift: 10, delay: -4 },
  { x: 50, y: 104, s: 1.3, dx: 0, dy: 1, drift: 14, delay: -7 },
  { x: 24, y: 79, s: 0.45, dx: -0.7, dy: 0.6, drift: 9, delay: -6 },
];

type Phase = 'title' | 'locating' | 'dive' | 'leaving';

/** Props of WelcomeIntro. MapScreen owns the map and the tracker; the intro only borrows them. */
export interface WelcomeIntroProps {
  /** The MapLibre map, null until it has been created. */
  mapRef: RefObject<MapLibreMap | null>;
  /** The screen's location tracker, null until mounted. */
  trackerRef: RefObject<LocationTracker | null>;
  /** Where to land without a location: the opening city's landmarks, or null if they have not loaded. */
  fallbackBounds: () => LngLatBounds | null;
  /** Zoom to land at on the player (MapScreen's FOUND_ZOOM). */
  landingZoom: number;
  /** Padding for the fallback framing (MapScreen's FIT_PADDING_PX). */
  fitPadding: PaddingOptions;
  /**
   * Called once the intro has gone.
   *
   * @param centredOnPlayer - True when the camera landed on the player, so the map should not re-centre on the
   *   next fix. False after a fallback landing, so the first real fix still centres the map.
   */
  onDone: (centredOnPlayer: boolean) => void;
}

/**
 * Wait for the tracker to give a landing: a fix, a refusal, or the timeout.
 *
 * @param tracker - The location tracker, already started.
 * @returns The landing.
 */
function waitForLanding(tracker: LocationTracker | null): Promise<IntroLanding> {
  if (!tracker) return Promise.resolve({ kind: 'fallback', reason: 'Landing at the landmarks.' });
  return new Promise((resolve) => {
    let settled = false;
    let unsubscribe: () => void = () => undefined;
    const settle = (landing: IntroLanding) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      // Unsubscribe after the current call returns: subscribe() calls the listener before handing back its handle.
      queueMicrotask(() => unsubscribe());
      resolve(landing);
    };
    const timer = setTimeout(() => {
      const landing = landingFor(tracker.current);
      settle(landing.kind === 'player' ? landing : { kind: 'fallback', reason: 'Could not find you yet. Landing at the landmarks.' });
    }, INTRO_TIMING.LOCATE_TIMEOUT_MS);
    unsubscribe = tracker.subscribe((state) => {
      const landing = landingFor(state);
      if (landing.kind !== 'wait') settle(landing);
    });
  });
}

/**
 * Wait until the map exists and has loaded its style, polling the ref.
 *
 * @param mapRef - MapScreen's map ref.
 * @returns The map, or null after INTRO_TIMING.MAP_WAIT_MS.
 */
async function waitForMap(mapRef: RefObject<MapLibreMap | null>): Promise<MapLibreMap | null> {
  const deadline = Date.now() + INTRO_TIMING.MAP_WAIT_MS;
  while (Date.now() < deadline) {
    const map = mapRef.current;
    if (map?.isStyleLoaded()) return map;
    await new Promise((r) => setTimeout(r, 100));
  }
  return mapRef.current;
}

/**
 * The welcome intro overlay.
 *
 * @param props - See WelcomeIntroProps.
 * @param props.mapRef - The map, borrowed from MapScreen.
 * @param props.trackerRef - The location tracker, borrowed from MapScreen.
 * @param props.fallbackBounds - Where to land without a location.
 * @param props.landingZoom - Zoom to land at on the player.
 * @param props.fitPadding - Padding for the fallback framing.
 * @param props.onDone - Called once the intro has gone.
 * @returns The overlay, until it has finished.
 */
export default function WelcomeIntro({ mapRef, trackerRef, fallbackBounds, landingZoom, fitPadding, onDone }: WelcomeIntroProps) {
  const [phase, setPhase] = useState<Phase>('title');
  const [note, setNote] = useState<string | null>(null);
  const phaseRef = useRef<Phase>('title');
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const aliveRef = useRef(true);

  const go = useCallback((next: Phase) => {
    phaseRef.current = next;
    setPhase(next);
  }, []);

  useEffect(() => {
    aliveRef.current = true;
    const timers = timersRef.current;
    return () => {
      aliveRef.current = false;
      for (const t of timers) clearTimeout(t);
    };
  }, []);

  // Turn the globe slowly behind the title until the dive starts.
  useEffect(() => {
    if (phase !== 'title' && phase !== 'locating') return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    let frame = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const map = mapRef.current;
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      if (map?.isStyleLoaded() && !map.isMoving()) {
        const c = map.getCenter();
        map.jumpTo({ center: [c.lng + SPIN_DEG_PER_S * dt, c.lat] });
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [phase, mapRef]);

  const later = (fn: () => void, ms: number) => {
    timersRef.current.push(setTimeout(() => aliveRef.current && fn(), ms));
  };

  /** The button: ask for location (synchronously, inside the tap), then dive. */
  const enter = async () => {
    if (phaseRef.current !== 'title') return;
    // Must run before the first await: iOS only shows the prompt inside the tap's own call stack.
    trackerRef.current?.start();
    go('locating');

    const landing = await waitForLanding(trackerRef.current);
    const map = await waitForMap(mapRef);
    if (!aliveRef.current) return;

    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    const duration = reduced ? 0 : INTRO_TIMING.FLY_DURATION_MS;
    if (landing.kind === 'fallback') setNote(landing.reason);
    go('dive');

    let centred = false;
    const fly = () => {
      if (!map) return;
      if (landing.kind === 'player') {
        centred = true;
        map.flyTo({ center: [landing.position.lng, landing.position.lat], zoom: landingZoom, duration, curve: 1.6, essential: true });
        return;
      }
      const bounds = fallbackBounds();
      const camera = bounds ? map.cameraForBounds(bounds, { padding: fitPadding, maxZoom: landingZoom }) : null;
      if (camera?.center) map.flyTo({ center: camera.center, zoom: camera.zoom, duration, curve: 1.6, essential: true });
    };
    const total = reduced ? INTRO_TIMING.REDUCED_MOTION_MS : INTRO_TIMING.FLY_DELAY_MS + INTRO_TIMING.FLY_DURATION_MS;
    later(fly, reduced ? 0 : INTRO_TIMING.FLY_DELAY_MS);
    // Fade the overlay out just before the camera lands, then hand the map back.
    later(() => go('leaving'), Math.max(0, total - 500));
    later(() => {
      markIntroSeen(sessionStorageOrNull());
      onDone(centred);
    }, total);
  };

  const className = ['ci-root', phase === 'dive' || phase === 'leaving' ? 'ci-dive' : '', phase === 'leaving' ? 'ci-leaving' : '']
    .filter(Boolean)
    .join(' ');

  return (
    <div className={className} role="dialog" aria-modal="true" aria-label="Welcome to Chronodex">
      <style>{INTRO_CSS}</style>
      <div className="ci-sky" />
      <div className="ci-clouds" aria-hidden="true">
        {CLOUDS.map((c, i) => (
          <div
            key={i}
            className="ci-cloud"
            style={{ '--x': `${c.x}%`, '--y': `${c.y}%`, '--s': c.s, '--dx': c.dx, '--dy': c.dy, '--drift': `${c.drift}s`, '--delay': `${c.delay}s` } as CSSProperties}
          />
        ))}
      </div>
      <div className="ci-fog" aria-hidden="true" />

      <div className="ci-card">
        <div className="ci-kicker">WELCOME, TIME TRAVELLER</div>
        <h1 className="ci-title">CHRONODEX</h1>
        <p className="ci-tagline">Every street remembers. Find its landmarks, catch their badges, and step into their past.</p>
        <button type="button" className="ci-enter" onClick={() => void enter()} disabled={phase !== 'title'} autoFocus>
          {phase === 'title' ? (
            '▶ ENTER THE TIMESTREAM'
          ) : (
            <>
              LOCKING ON TO YOU<span className="ci-cursor">_</span>
            </>
          )}
        </button>
        <p className="ci-fine">Chronodex uses your location to find where you land. Your browser will ask first.</p>
      </div>

      {note && <div className="ci-note">{note}</div>}
    </div>
  );
}

/**
 * sessionStorage, or null where reading it throws (some private modes).
 *
 * @returns The storage or null.
 */
export function sessionStorageOrNull(): Storage | null {
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}
