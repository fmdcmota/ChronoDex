/**
 * The Map screen: the retro game map with landmark sprites, the player's live position, capture
 * zones, a nearest-landmark hint and the capture button (MASTER.md section 1.1, task A3-04).
 *
 * Owner: Agent 3 (Explorer). Ported from spikes/agent-3/src/map-spike/main.ts.
 *
 * maplibre-gl needs the browser (DOM + a web worker), so this component is loaded with
 * `dynamic(..., { ssr: false })` from src/app/page.tsx and never runs on the server.
 *
 * The data comes from the typed client: `api.listLandmarks()` for the landmarks and
 * `api.getDex()` for what this player has already collected, so it works in mock mode and against
 * the real API. Landmark data is never hard-coded here.
 */
'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { LngLatBounds, Map as MapLibreMap, Marker, setWorkerUrl, type GeoJSONSource } from 'maplibre-gl';
import { api, getPlayerId } from '@/lib/client';
import { haversineM, withinCaptureRange, type Landmark, type LandmarkId } from '@/lib/contracts';
import { buildGameMapStyle } from './lib/game-map-style';
import { LocationTracker, locationMessage, type LocationState, type PlayerFix } from './lib/location';
import { directionHint, formatDistance, nearestLandmark } from './lib/geo-format';
import { circlePolygon } from './lib/map-geometry';
import { PALETTE } from './lib/palette';

/**
 * Screen pixels kept clear around the landmarks when the map first frames them. Markers stand
 * 64 px tall above their point, and the top banner and bottom HUD each take about 130 px.
 */
const FIT_PADDING_PX = { top: 200, bottom: 160, left: 40, right: 40 };
/** Keep the player inside the game world: South Kensington and a margin. [[west, south], [east, north]]. */
const WORLD_BOUNDS: [[number, number], [number, number]] = [
  [-0.1935, 51.4905],
  [-0.1595, 51.5065],
];
/**
 * Zoom used when the map first finds the player. MapLibre uses 512 px tiles, so zoom 17 is about
 * 145 m across a phone: enough to see a whole 50 m capture ring.
 */
const FOUND_ZOOM = 17;
/** True when the location-spoof panel may be shown (MASTER.md section 8.2). */
const DEV_TOOLS = process.env.NEXT_PUBLIC_DEV_TOOLS === '1';
/** Default spoof accuracy, metres. */
const DEFAULT_SPOOF_ACCURACY_M = 10;

/**
 * The box around every landmark's subject and photo spot, so the map opens framed on all six.
 *
 * @param landmarks - The landmarks to frame.
 * @returns Bounds that contain every subject and photo spot.
 */
function landmarkBounds(landmarks: readonly Landmark[]): LngLatBounds {
  const bounds = new LngLatBounds();
  for (const landmark of landmarks) {
    bounds.extend([landmark.subject.lng, landmark.subject.lat]);
    bounds.extend([landmark.photoSpot.lng, landmark.photoSpot.lat]);
  }
  return bounds;
}

/**
 * The landmark the player is standing at, if any: the nearest one, when it is in capture range.
 *
 * @param fix - The player's position.
 * @param landmarks - Every landmark.
 * @returns The in-range landmark, or null when none is close enough.
 */
function landmarkInRange(fix: PlayerFix, landmarks: readonly Landmark[]): Landmark | null {
  const nearest = nearestLandmark(fix.position, landmarks);
  if (!nearest) return null;
  return withinCaptureRange(nearest.distanceM, fix.accuracyM, nearest.landmark.captureRadiusM)
    ? nearest.landmark
    : null;
}

/**
 * The map page body: the MapLibre canvas plus the HUD (title, location banner, hint, capture
 * button, landmark card and the dev spoof panel).
 *
 * @returns The screen.
 */
export default function MapScreen() {
  const router = useRouter();

  // MapLibre owns the DOM it is given, so the map, its markers and the location tracker live in
  // refs and are wired up in effects; React state drives the HUD that re-renders.
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markersRef = useRef(new Map<LandmarkId, HTMLButtonElement>());
  const playerRef = useRef<{ el: HTMLDivElement; marker: Marker; added: boolean } | null>(null);
  const trackerRef = useRef<LocationTracker | null>(null);
  const lastFixRef = useRef<PlayerFix | null>(null);
  const hasCentredRef = useRef(false);
  /** Accuracy used by the dev click-to-spoof handler, which is registered once. Mirrors the state. */
  const spoofAccuracyRef = useRef(DEFAULT_SPOOF_ACCURACY_M);

  const [landmarks, setLandmarks] = useState<Landmark[] | null>(null);
  const [collected, setCollected] = useState<Set<LandmarkId>>(new Set());
  const [location, setLocation] = useState<LocationState>({ status: 'idle' });
  const [selected, setSelected] = useState<Landmark | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [spoofAccuracyM, setSpoofAccuracyM] = useState(DEFAULT_SPOOF_ACCURACY_M);

  /** The latest good fix, kept even when the tracker reports a timeout or an outage. */
  const lastFix = useMemo<PlayerFix | null>(() => {
    if (location.status === 'ready') return location.fix;
    if (location.status === 'timeout' || location.status === 'unavailable') return location.lastFix;
    return null;
  }, [location]);

  /** Move the player dot and accuracy ring to a fix. Must tolerate being called before map load. */
  const drawPlayer = useCallback((fix: PlayerFix) => {
    const map = mapRef.current;
    if (!map) return;
    if (!playerRef.current) {
      const el = document.createElement('div');
      el.className = 'player';
      el.setAttribute('aria-label', 'You are here');
      const dot = document.createElement('div');
      dot.className = 'player-dot';
      el.append(dot);
      playerRef.current = { el, marker: new Marker({ element: el, anchor: 'center' }), added: false };
    }
    const player = playerRef.current;
    player.el.classList.toggle('spoofed', fix.source === 'spoof');
    player.marker.setLngLat([fix.position.lng, fix.position.lat]);
    if (!player.added) {
      player.marker.addTo(map);
      player.added = true;
    }
    map.getSource<GeoJSONSource>('accuracy')?.setData(circlePolygon(fix.position, fix.accuracyM));
    if (!hasCentredRef.current) {
      hasCentredRef.current = true;
      map.flyTo({ center: [fix.position.lng, fix.position.lat], zoom: FOUND_ZOOM });
    }
  }, []);

  /** React to a location state change: record the fix, draw it, and drive the HUD. */
  const onLocation = useCallback(
    (state: LocationState) => {
      setLocation(state);
      if (state.status === 'ready') {
        lastFixRef.current = state.fix;
        drawPlayer(state.fix);
      } else if (state.status === 'idle' || state.status === 'denied') {
        lastFixRef.current = null;
      }
    },
    [drawPlayer],
  );

  // Load landmarks and this player's Dex once.
  useEffect(() => {
    let alive = true;
    Promise.all([api.listLandmarks(), api.getDex(getPlayerId())])
      .then(([landmarkList, captures]) => {
        if (!alive) return;
        setLandmarks(landmarkList);
        setCollected(new Set(captures.map((capture) => capture.landmarkId)));
      })
      .catch((err: Error) => {
        if (alive) setError(err.message);
      });
    return () => {
      alive = false;
    };
  }, []);

  // Track the player's position for the life of the screen.
  useEffect(() => {
    const tracker = new LocationTracker();
    trackerRef.current = tracker;
    const unsubscribe = tracker.subscribe(onLocation);
    // If permission was already granted, start at once; otherwise wait for the button, because
    // some browsers only show the prompt in response to a tap.
    void (async () => {
      try {
        const status = await navigator.permissions?.query({ name: 'geolocation' });
        if (status?.state === 'granted') tracker.start();
      } catch {
        // Permissions API missing or refusing the query (older Safari): wait for the button.
      }
    })();
    return () => {
      unsubscribe();
      tracker.stop();
      trackerRef.current = null;
    };
  }, [onLocation]);

  // Create the map and its markers once the landmarks have loaded.
  useEffect(() => {
    if (!landmarks || !containerRef.current) return;

    // maplibre-gl 6 loads its web worker from a separate file that bundlers do not copy, so the
    // worker is served from public/ (see components/explore/README.md). Without this the map
    // stays blank and the console reports "Worker failed to load".
    setWorkerUrl('/maplibre-gl-worker.mjs');

    const map = new MapLibreMap({
      container: containerRef.current,
      style: buildGameMapStyle(),
      // Open framed on all six landmarks, whatever the screen size.
      bounds: landmarkBounds(landmarks),
      fitBoundsOptions: { padding: FIT_PADDING_PX },
      minZoom: 14,
      maxZoom: 19,
      maxBounds: WORLD_BOUNDS,
      // A game map stays north-up and flat.
      dragRotate: false,
      pitchWithRotate: false,
      touchPitch: false,
      attributionControl: { compact: true },
    });
    map.touchZoomRotate.disableRotation();
    map.keyboard.disableRotation();
    mapRef.current = map;

    map.on('load', () => {
      // Capture zones: a dashed ring of captureRadiusM around each photo spot. "Stand in the ring."
      map.addSource('capture-zones', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: landmarks.map((landmark) => ({
            ...circlePolygon(landmark.photoSpot, landmark.captureRadiusM),
            properties: { id: landmark.id },
          })),
        },
      });
      map.addLayer({
        id: 'capture-zone-fill',
        type: 'fill',
        source: 'capture-zones',
        paint: { 'fill-color': PALETTE.gold, 'fill-opacity': 0.12 },
      });
      map.addLayer({
        id: 'capture-zone-line',
        type: 'line',
        source: 'capture-zones',
        paint: { 'line-color': PALETTE.goldDark, 'line-width': 2, 'line-dasharray': [2, 2] },
      });

      // Accuracy ring around the player, empty until the first fix.
      map.addSource('accuracy', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
      map.addLayer({
        id: 'accuracy-fill',
        type: 'fill',
        source: 'accuracy',
        paint: { 'fill-color': PALETTE.playerRing, 'fill-opacity': 0.15 },
      });
      map.addLayer({
        id: 'accuracy-line',
        type: 'line',
        source: 'accuracy',
        paint: { 'line-color': PALETTE.playerRing, 'line-width': 1.5, 'line-opacity': 0.6 },
      });
      if (lastFixRef.current) drawPlayer(lastFixRef.current);
    });

    if (DEV_TOOLS) {
      // Clicking the map moves the spoofed player there, for testing without a GPS.
      map.on('click', (event) => {
        trackerRef.current?.spoof(
          { lat: event.lngLat.lat, lng: event.lngLat.lng },
          spoofAccuracyRef.current,
        );
      });
    }

    // Landmark markers: HTML elements so the pixel art stays crisp, anchored on the subject.
    // Built into a local map and assigned to the ref, so the cleanup below never reads
    // `markersRef.current` (React warns that a ref read in cleanup may be stale).
    const markers = new Map<LandmarkId, HTMLButtonElement>();
    for (const landmark of landmarks) {
      // MapLibre positions the root element with position: absolute and a transform, so the root
      // gets no layout styles of its own; everything visual lives on the inner .marker-body.
      const el = document.createElement('button');
      el.type = 'button';
      el.className = `marker marker-${landmark.rarity}`;
      el.setAttribute('aria-label', landmark.name);
      const body = document.createElement('span');
      body.className = 'marker-body';
      const img = document.createElement('img');
      img.src = landmark.spriteUrl;
      img.alt = '';
      img.draggable = false;
      const flag = document.createElement('span');
      flag.className = 'marker-flag';
      flag.textContent = '★';
      body.append(img, flag);
      el.append(body);
      el.addEventListener('click', (event) => {
        // Stop the click reaching the map, which would move the spoofed player in dev mode.
        event.stopPropagation();
        setSelected(landmark);
      });
      markers.set(landmark.id, el);
      new Marker({ element: el, anchor: 'bottom' })
        .setLngLat([landmark.subject.lng, landmark.subject.lat])
        .addTo(map);
    }
    markersRef.current = markers;

    return () => {
      map.remove();
      mapRef.current = null;
      markersRef.current = new Map();
      playerRef.current = null;
      hasCentredRef.current = false;
    };
  }, [landmarks, drawPlayer]);

  // Keep the collected/uncollected look of the markers in step with the Dex.
  useEffect(() => {
    for (const [id, el] of markersRef.current) {
      el.classList.toggle('collected', collected.has(id));
    }
  }, [collected, landmarks]);

  const inRange = useMemo(
    () => (lastFix && landmarks ? landmarkInRange(lastFix, landmarks) : null),
    [lastFix, landmarks],
  );

  const hint = useMemo(() => {
    if (!landmarks) return 'Loading the map…';
    if (!lastFix) return 'Share your location to start collecting.';
    if (inRange && !collected.has(inRange.id)) return `You are at ${inRange.name}. Face it and capture!`;
    const next = nearestLandmark(lastFix.position, landmarks, collected);
    return next ? `Next: ${directionHint(next)}` : 'All six collected. Nice work!';
  }, [landmarks, lastFix, inRange, collected]);

  const bannerMessage = locationMessage(location);
  const showBannerButton =
    location.status === 'idle' || location.status === 'unavailable' || location.status === 'timeout';
  const bannerButtonText = location.status === 'idle' ? 'Share location' : 'Try again';

  const captureLabel = inRange
    ? collected.has(inRange.id)
      ? `Retake ${inRange.name}`
      : `Capture ${inRange.name}`
    : 'Capture';

  const spoof = (position: { lat: number; lng: number }, accuracyM: number) => {
    spoofAccuracyRef.current = accuracyM;
    trackerRef.current?.spoof(position, accuracyM);
  };

  return (
    <div>
      <div className="map-root" ref={containerRef} />

      <div className="hud-top">
        <div className="title-chip">CHRONODEX</div>
        <div className="chip">{landmarks ? `${collected.size} / ${landmarks.length}` : ''}</div>
      </div>

      {(error || bannerMessage) && (
        <div className="banner">
          <span>{error ?? bannerMessage}</span>
          {!error && showBannerButton && (
            <button type="button" className="btn btn-small" onClick={() => trackerRef.current?.start()}>
              {bannerButtonText}
            </button>
          )}
        </div>
      )}

      <div className="hud-bottom">
        <div className="hint">{hint}</div>
        <button type="button" className="capture" disabled={!inRange} onClick={() => router.push('/capture')}>
          <span className="capture-icon" aria-hidden="true" />
          {captureLabel}
        </button>
      </div>

      {selected && (
        <div className="sheet" role="dialog" aria-label={selected.name}>
          <button
            type="button"
            className="sheet-close"
            aria-label="Close"
            onClick={() => setSelected(null)}
          >
            ×
          </button>
          <div className="card-head">
            {/* eslint-disable-next-line @next/next/no-img-element -- pixel art must stay crisp; next/image would re-encode it */}
            <img
              className="card-badge"
              src={collected.has(selected.id) ? selected.badgeUrl : selected.badgeUrl.replace(/\.png$/, '-locked.png')}
              alt=""
            />
            <div>
              <h2>{selected.name}</h2>
              <span className={`rarity rarity-${selected.rarity}`}>{selected.rarity.toUpperCase()}</span>
            </div>
          </div>
          <p>{selected.blurb}</p>
          <p className="muted">Time Machine years: {selected.eraYears.join(', ')}</p>
          <p className="muted">
            {lastFix
              ? `${formatDistance(haversineM(lastFix.position, selected.photoSpot))} from the photo spot`
              : 'Share your location to see how far it is.'}
          </p>
          {collected.has(selected.id) ? (
            <Link href={`/time/${selected.id}`} className="btn" style={{ display: 'inline-block' }}>
              Open Time Machine
            </Link>
          ) : (
            <button
              type="button"
              className="btn"
              onClick={() =>
                mapRef.current?.flyTo({ center: [selected.photoSpot.lng, selected.photoSpot.lat], zoom: 18 })
              }
            >
              Show photo spot
            </button>
          )}
        </div>
      )}

      {DEV_TOOLS && (
        <details className="dev-panel">
          <summary>Spoof location</summary>
          <div className="dev-jumps">
            {landmarks?.map((landmark) => (
              <button
                key={landmark.id}
                type="button"
                className="btn btn-small"
                onClick={() => spoof(landmark.photoSpot, spoofAccuracyM)}
              >
                {landmark.name}
              </button>
            ))}
          </div>
          <label>
            Accuracy: {spoofAccuracyM} m
            <input
              type="range"
              min={5}
              max={50}
              value={spoofAccuracyM}
              onChange={(event) => {
                const value = Number(event.target.value);
                setSpoofAccuracyM(value);
                spoofAccuracyRef.current = value;
                if (lastFixRef.current?.source === 'spoof') trackerRef.current?.spoof(lastFixRef.current.position, value);
              }}
            />
          </label>
          <button
            type="button"
            className="btn btn-small"
            onClick={() => {
              trackerRef.current?.clearSpoof();
              if (trackerRef.current?.current.status === 'idle') trackerRef.current?.start();
            }}
          >
            Clear
          </button>
        </details>
      )}
    </div>
  );
}
