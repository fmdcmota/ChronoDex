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

import { LOCATION_SPOOFING } from './lib/spoofing';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { LngLatBounds, Map as MapLibreMap, Marker, setWorkerUrl, type GeoJSONSource } from 'maplibre-gl';
import { api, getPlayerId } from '@/lib/client';
import { haversineM, withinCaptureRange, type Landmark, type LandmarkId } from '@/lib/contracts';
import { buildGameMapStyle } from './lib/game-map-style';
import { LocationTracker, locationMessage, type LocationState, type PlayerFix } from './lib/location';
import { clearFix, loadFix, saveFix } from './lib/fix-store';
import { startDuckVoyages } from './duck-voyages';
import { directionHint, formatDistance, nearestLandmark } from './lib/geo-format';
import { circlePolygon } from './lib/map-geometry';
import { groupIntoRegions, pickRegion, REGION_GAP_M, shouldFly } from './lib/map-region';
import { PALETTE } from './lib/palette';
import { useUnavailableTimeMachines } from './lib/use-era-ready';
import { shouldShowIntro } from './lib/intro';
import WelcomeIntro, { sessionStorageOrNull } from './WelcomeIntro';

/**
 * Screen pixels kept clear around the landmarks when the map first frames them. Markers stand
 * 64 px tall above their point, and the top banner and bottom HUD each take about 130 px.
 */
/** Tiles kept in memory per source. MapLibre sizes its cache from the viewport; 400 vector tiles is a few MB. */
const MAX_TILE_CACHE_TILES = 400;
const FIT_PADDING_PX = { top: 200, bottom: 160, left: 40, right: 40 };
/** Zoom of the "whole globe" view. MapLibre 512 px tiles: about 1.6 shows the planet as a ball on a phone. */
const WORLD_ZOOM = 1.6;
/** Below this zoom the button reads "City" and takes the player back; at or above it, it reads "World". */
const WORLD_VIEW_BELOW = 10;
/** Below this zoom landmark markers shrink so eleven of them do not pile up on a city. */
const MARKERS_SHRINK_BELOW = 13;
/** Lowest zoom the player can pinch out to: the whole globe. */
const MIN_ZOOM = 1;
/**
 * Zoom used when the map first finds the player. MapLibre uses 512 px tiles, so zoom 17 is about
 * 145 m across a phone: enough to see a whole 50 m capture ring.
 */
const FOUND_ZOOM = 17;
/** True when the location-spoof tools are shown: permanently on unless switched off (./lib/spoofing.ts). */
const DEV_TOOLS = LOCATION_SPOOFING;
/**
 * With the dev spoof panel under the CHRONODEX chip, the location banner moves below its closed summary. Inline, not
 * a class: the project's CSS pipeline dropped a new `.banner-below-dev` rule from globals.css (15 Nov).
 */
const BANNER_BELOW_DEV_STYLE = { top: 'calc(var(--safe-top) + 100px)' } as const;
/** Default spoof accuracy, metres. */
const DEFAULT_SPOOF_ACCURACY_M = 10;

/**
 * The box around every given landmark's subject and photo spot, so the map opens framed on them.
 *
 * @param landmarks - The landmarks to frame (one region, see lib/map-region.ts).
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
 * The landmarks the map first frames: one city's worth.
 *
 * @param landmarks - Every landmark.
 * @returns The members of the region nearest the player's saved fix, else the biggest region.
 */
function openingRegion(landmarks: readonly Landmark[]): readonly Landmark[] {
  const regions = groupIntoRegions(landmarks, (l) => l.photoSpot, REGION_GAP_M);
  const saved = loadFix(Date.now(), DEV_TOOLS);
  return pickRegion(regions, (l) => l.photoSpot, saved?.position ?? null)?.items ?? landmarks;
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
  // The welcome intro (WelcomeIntro.tsx) plays once per session. While it is up the map opens on the globe and the
  // intro, not drawPlayer, makes the first move to the player. This screen only renders in the browser (ssr: false).
  const [introOpen, setIntroOpen] = useState(() => shouldShowIntro(sessionStorageOrNull(), window.location.search));
  const introOpenRef = useRef(introOpen);

  const [landmarks, setLandmarks] = useState<Landmark[] | null>(null);
  const [collected, setCollected] = useState<Set<LandmarkId>>(new Set());
  const [location, setLocation] = useState<LocationState>({ status: 'idle' });
  const [selected, setSelected] = useState<Landmark | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [worldView, setWorldView] = useState(false);
  // Landmarks whose Time Machine has no generated era yet: greyed out, no link in (task A3-r2-4).
  const landmarkIds = useMemo(() => landmarks?.map((l) => l.id), [landmarks]);
  const noTimeMachine = useUnavailableTimeMachines(landmarkIds);
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
    if (!hasCentredRef.current && !introOpenRef.current) {
      hasCentredRef.current = true;
      const to = { center: [fix.position.lng, fix.position.lat] as [number, number], zoom: FOUND_ZOOM };
      const here = map.getCenter();
      // A far-away player (another city) is jumped to: a flight would cross the globe.
      if (shouldFly({ lat: here.lat, lng: here.lng }, fix.position)) map.flyTo(to);
      else map.jumpTo(to);
    }
  }, []);

  /** React to a location state change: record the fix, draw it, and drive the HUD. */
  const onLocation = useCallback(
    (state: LocationState) => {
      setLocation(state);
      if (state.status === 'ready') {
        lastFixRef.current = state.fix;
        drawPlayer(state.fix);
        // The Capture screen starts from this position, including a dev spoof (see lib/fix-store.ts).
        saveFix(state.fix);
      } else if (state.status === 'idle' || state.status === 'denied') {
        lastFixRef.current = null;
        clearFix();
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
    let cancelled = false;
    const tracker = new LocationTracker();
    trackerRef.current = tracker;
    const unsubscribe = tracker.subscribe(onLocation);
    // If permission was already granted, start at once; otherwise wait for the button, because
    // some browsers only show the prompt in response to a tap.
    void (async () => {
      try {
        const status = await navigator.permissions?.query({ name: 'geolocation' });
        // Not if the screen closed (or React re-ran this effect) while the query was pending:
        // that would leave a GPS watch running that nothing can stop.
        if (!cancelled && status?.state === 'granted') tracker.start();
      } catch {
        // Permissions API missing or refusing the query (older Safari): wait for the button.
      }
    })();
    return () => {
      cancelled = true;
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
      // Open framed on one region (city): the nearest to the player's last fix, else the biggest. During the welcome
      // intro, open on the whole globe above that region instead, so the intro can fall from space to the street.
      ...(introOpenRef.current
        ? { center: landmarkBounds(openingRegion(landmarks)).getCenter(), zoom: WORLD_ZOOM }
        : { bounds: landmarkBounds(openingRegion(landmarks)), fitBoundsOptions: { padding: FIT_PADDING_PX } }),
      minZoom: MIN_ZOOM,
      maxZoom: 19,
      // A game map stays north-up and flat.
      dragRotate: false,
      pitchWithRotate: false,
      touchPitch: false,
      attributionControl: { compact: true },
      // Zoom polish (handed to Agent 4 by Agent 3, 15 Nov): MapLibre cannot fade vector tiles in, so the next
      // best thing is to have them ready sooner. Keep loading the destination zoom's tiles during a pinch instead
      // of cancelling them (fewer tiles arriving late and popping in), and keep more tiles in memory so zooming
      // back out and in again reuses them instead of loading and popping again.
      cancelPendingTileRequestsWhileZooming: false,
      maxTileCacheSize: MAX_TILE_CACHE_TILES,
    });
    // Zoomed far out the world is a globe; it flattens to the usual game map as you zoom in.
    map.on('style.load', () => map.setProjection({ type: 'globe' }));
    const onZoom = () => {
      const zoom = map.getZoom();
      map.getContainer().classList.toggle('zoomed-out', zoom < MARKERS_SHRINK_BELOW);
      setWorldView(zoom < WORLD_VIEW_BELOW);
    };
    map.on('zoom', onZoom);
    map.touchZoomRotate.disableRotation();
    map.keyboard.disableRotation();
    mapRef.current = map;
    // Dev tools only: lets a test driver set the zoom exactly (for example to check the detail fade).
    if (DEV_TOOLS) (window as unknown as { __chronodexMap?: MapLibreMap }).__chronodexMap = map;

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
    // Three costumed ducks that travel fixed routes across the world (see duck-voyages.ts).
    const stopDucks = startDuckVoyages(map);

    return () => {
      stopDucks();
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
      el.classList.toggle('no-era', noTimeMachine.has(id));
    }
  }, [collected, landmarks, noTimeMachine]);

  const inRange = useMemo(
    () => (lastFix && landmarks ? landmarkInRange(lastFix, landmarks) : null),
    [lastFix, landmarks],
  );

  const hint = useMemo(() => {
    if (!landmarks) return 'Loading the map…';
    if (!lastFix) return 'Share your location to start collecting.';
    if (inRange && !collected.has(inRange.id)) return `You are at ${inRange.name}. Face it and capture!`;
    // Point at the next landmark in the player's own city, not one on another continent.
    const here = pickRegion(groupIntoRegions(landmarks, (l) => l.photoSpot, REGION_GAP_M), (l) => l.photoSpot, lastFix.position);
    const next = nearestLandmark(lastFix.position, here?.items ?? landmarks, collected);
    if (next) return `Next: ${directionHint(next)}`;
    return landmarks.every((l) => collected.has(l.id))
      ? 'Every landmark collected. Nice work!'
      : 'You have them all here. Travel to another city for more!';
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

  /** The World button: out to the whole globe, or back in to the player's city. */
  const toggleWorld = () => {
    const map = mapRef.current;
    if (!map || !landmarks) return;
    if (map.getZoom() >= WORLD_VIEW_BELOW) {
      map.flyTo({ center: map.getCenter(), zoom: WORLD_ZOOM, duration: 1800 });
      return;
    }
    const regions = groupIntoRegions(landmarks, (l) => l.photoSpot, REGION_GAP_M);
    const city = pickRegion(regions, (l) => l.photoSpot, lastFixRef.current?.position ?? null);
    map.fitBounds(landmarkBounds(city?.items ?? landmarks), { padding: FIT_PADDING_PX, maxZoom: 17, duration: 1800 });
  };

  const spoof = (position: { lat: number; lng: number }, accuracyM: number) => {
    spoofAccuracyRef.current = accuracyM;
    trackerRef.current?.spoof(position, accuracyM);
    // Spoofing into another city moves the camera there too (the first fix only centres once).
    const map = mapRef.current;
    if (map) {
      const to = { center: [position.lng, position.lat] as [number, number], zoom: FOUND_ZOOM };
      const here = map.getCenter();
      if (shouldFly({ lat: here.lat, lng: here.lng }, position)) map.flyTo(to);
      else map.jumpTo(to);
    }
  };

  return (
    <div>
      <div className="map-root" ref={containerRef} />

      <div className="hud-top">
        <div className="title-chip">CHRONODEX</div>
        {/* The counter doubles as the way into the Dex. */}
        <button type="button" className="chip chip-link globe-btn" onClick={toggleWorld} aria-label={worldView ? 'Back to the city' : 'Show the whole world'}>
          {worldView ? 'City' : 'World'}
        </button>
        <Link href="/dex" className="chip chip-link" aria-label={landmarks ? `Dex: ${collected.size} of ${landmarks.length} collected` : 'Dex'}>
          {landmarks ? `Dex ${collected.size} / ${landmarks.length}` : 'Dex'}
        </Link>
      </div>

      {(error || bannerMessage) && (
        <div className="banner" style={DEV_TOOLS ? BANNER_BELOW_DEV_STYLE : undefined}>
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
          <p className="muted">
            {noTimeMachine.has(selected.id)
              ? 'Time Machine: coming soon'
              : `Time Machine years: ${selected.eraYears.join(', ')}`}
          </p>
          <p className="muted">
            {lastFix
              ? `${formatDistance(haversineM(lastFix.position, selected.photoSpot))} from the photo spot`
              : 'Share your location to see how far it is.'}
          </p>
          {collected.has(selected.id) && noTimeMachine.has(selected.id) ? (
            <p>Badge collected. Its Time Machine is coming soon.</p>
          ) : collected.has(selected.id) ? (
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

      {introOpen && (
        <WelcomeIntro
          mapRef={mapRef}
          trackerRef={trackerRef}
          fallbackBounds={() => (landmarks ? landmarkBounds(openingRegion(landmarks)) : null)}
          landingZoom={FOUND_ZOOM}
          fitPadding={FIT_PADDING_PX}
          onDone={(centredOnPlayer) => {
            introOpenRef.current = false;
            // After a landing on the player the next fix must not jump the camera; after a fallback it should.
            hasCentredRef.current = centredOnPlayer;
            setIntroOpen(false);
          }}
        />
      )}

      {DEV_TOOLS && (
        <details className="dev-panel">
          <summary>Spoof location</summary>
          {/* One row per city, so eleven buttons stay readable. */}
          {landmarks &&
            groupIntoRegions(landmarks, (l) => l.photoSpot, REGION_GAP_M).map((region) => (
              <div className="dev-jumps" key={region.items[0]!.id}>
                {region.items.map((landmark) => (
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
            ))}
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
