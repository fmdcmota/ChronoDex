/**
 * Agent 3 map spike: the game-look map with landmark sprites, the player's live position,
 * capture zones, a nearest-landmark hint and the capture button (MASTER.md task A3-02,
 * proving the logic of A3-04, A3-05 and A3-09 before the app scaffold exists).
 * Owner: Agent 3. Throwaway: port the pieces into src/app/page.tsx and src/components/explore/.
 *
 * What is real here: the map style, the tiles, the sprites, GPS and permission handling,
 * the distance and capture-range maths.
 * What is faked: landmarks come from src/lib/landmarks.ts rather than GET /api/landmarks, and
 * "Capture" just marks the landmark collected in localStorage. The real capture flow (camera,
 * upload, POST /api/captures) is task A3-06.
 */
import 'maplibre-gl/dist/maplibre-gl.css';
import '@fontsource/jersey-10/400.css';
import './spike.css';
import { LngLatBounds, Map as MapLibreMap, Marker, setWorkerUrl, type GeoJSONSource } from 'maplibre-gl';
// maplibre-gl 6 loads its web worker from a separate file next to its own module, found through
// import.meta.url. Bundlers do not copy that file, so without this line no tiles ever load
// ("Worker failed to load"). `?url` makes Vite ship the file and give us its address. The
// Next.js app needs the same fix: see the port notes in README.md.
import maplibreWorkerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url';
import { haversineM, withinCaptureRange, type Landmark, type LandmarkId } from '../lib/contracts-copy';
import { buildGameMapStyle } from '../lib/game-map-style';
import { directionHint, formatDistance, nearestLandmark } from '../lib/geo-format';
import { SPIKE_LANDMARKS } from '../lib/landmarks';
import { locationMessage, LocationTracker, type LocationState, type PlayerFix } from '../lib/location';
import { circlePolygon } from '../lib/map-geometry';
import { PALETTE } from '../lib/palette';

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
 * Zoom used when the map first finds the player. MapLibre uses 512 px tiles, so zoom 17 is
 * about 0.37 m per CSS pixel at this latitude: a 390 px phone shows about 145 m, enough to see
 * a whole 50 m capture ring.
 */
const FOUND_ZOOM = 17;
/** Where collected landmark ids are kept between visits. Spike only; the app uses the Dex API. */
const COLLECTED_KEY = 'chronodex-spike-collected';
/** Default spoof accuracy, metres. */
const DEFAULT_SPOOF_ACCURACY_M = 10;

const devTools = new URLSearchParams(location.search).has('dev');

/** Look up an element that index.html is known to contain. Throws early if the HTML changed. */
function $<T extends HTMLElement = HTMLElement>(id: string): T {
  const el = document.getElementById(id);
  if (!el) throw new Error(`index.html is missing #${id}`);
  return el as T;
}

setWorkerUrl(maplibreWorkerUrl);

// ---- State -------------------------------------------------------------------------------

/** Read the collected set from localStorage, ignoring anything malformed. */
function loadCollected(): Set<LandmarkId> {
  try {
    const raw: unknown = JSON.parse(localStorage.getItem(COLLECTED_KEY) ?? '[]');
    return new Set(Array.isArray(raw) ? raw.filter((x): x is string => typeof x === 'string') : []);
  } catch {
    return new Set();
  }
}

const collected = loadCollected();
const tracker = new LocationTracker();
let lastFix: PlayerFix | null = null;
let selected: Landmark | null = null;
let hasCentredOnPlayer = false;

// ---- Map -----------------------------------------------------------------------------------

/** The box around every landmark's subject and photo spot. */
function landmarkBounds(): LngLatBounds {
  const b = new LngLatBounds();
  for (const l of SPIKE_LANDMARKS) {
    b.extend([l.subject.lng, l.subject.lat]);
    b.extend([l.photoSpot.lng, l.photoSpot.lat]);
  }
  return b;
}

const map = new MapLibreMap({
  container: 'map',
  style: buildGameMapStyle(),
  // Open framed on all six landmarks, whatever the screen size.
  bounds: landmarkBounds(),
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

map.on('load', () => {
  // Capture zones: a dashed ring of captureRadiusM around each photo spot. "Stand in the ring."
  map.addSource('capture-zones', {
    type: 'geojson',
    data: {
      type: 'FeatureCollection',
      features: SPIKE_LANDMARKS.map((l) => ({ ...circlePolygon(l.photoSpot, l.captureRadiusM), properties: { id: l.id } })),
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
  if (lastFix) drawPlayer(lastFix);
});

if (devTools) {
  map.on('click', (e) => {
    tracker.spoof({ lat: e.lngLat.lat, lng: e.lngLat.lng }, spoofAccuracyM());
  });
}

// ---- Landmark markers ----------------------------------------------------------------------

const markerEls = new Map<LandmarkId, HTMLButtonElement>();

for (const landmark of SPIKE_LANDMARKS) {
  // MapLibre positions the root element with position: absolute and a CSS transform, so the
  // root gets no layout styles of its own: everything visual lives on the inner .marker-body.
  // (Setting position or transform on the root moves every marker to the wrong place.)
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
  el.addEventListener('click', (e) => {
    // Stop the click reaching the map, which would move the spoofed player in dev mode.
    e.stopPropagation();
    openCard(landmark);
  });
  markerEls.set(landmark.id, el);
  // The sprite stands on the building it depicts; the capture ring marks where to stand.
  new Marker({ element: el, anchor: 'bottom' }).setLngLat([landmark.subject.lng, landmark.subject.lat]).addTo(map);
}

// ---- Player marker -------------------------------------------------------------------------

// Same rule as the landmark markers: the bobbing animation is on the inner element, because
// MapLibre owns the root element's transform.
const playerEl = document.createElement('div');
playerEl.className = 'player';
playerEl.setAttribute('aria-label', 'You are here');
const playerDot = document.createElement('div');
playerDot.className = 'player-dot';
playerEl.append(playerDot);
const playerMarker = new Marker({ element: playerEl, anchor: 'center' });
let playerOnMap = false;

/** Move the player dot and accuracy ring to a fix. */
function drawPlayer(fix: PlayerFix): void {
  playerEl.classList.toggle('spoofed', fix.source === 'spoof');
  playerMarker.setLngLat([fix.position.lng, fix.position.lat]);
  if (!playerOnMap) {
    playerMarker.addTo(map);
    playerOnMap = true;
  }
  const src = map.getSource<GeoJSONSource>('accuracy');
  src?.setData(circlePolygon(fix.position, fix.accuracyM));
  if (!hasCentredOnPlayer) {
    hasCentredOnPlayer = true;
    map.flyTo({ center: [fix.position.lng, fix.position.lat], zoom: FOUND_ZOOM });
  }
}

// ---- HUD -----------------------------------------------------------------------------------

const banner = $('location-banner');
const bannerText = $('location-text');
const bannerButton = $<HTMLButtonElement>('location-button');
const hint = $('hint');
const captureBtn = $<HTMLButtonElement>('capture');
const captureLabel = $('capture-label');

bannerButton.addEventListener('click', () => tracker.start());

/** The landmark the player is standing at, if any: the nearest one, when it is in range. */
function landmarkInRange(fix: PlayerFix): Landmark | null {
  const nearest = nearestLandmark(fix.position, SPIKE_LANDMARKS);
  if (!nearest) return null;
  return withinCaptureRange(nearest.distanceM, fix.accuracyM, nearest.landmark.captureRadiusM) ? nearest.landmark : null;
}

/** Redraw everything that depends on the position or on the collected set. */
function render(): void {
  $('dex-count').textContent = `${collected.size} / ${SPIKE_LANDMARKS.length}`;
  for (const [id, el] of markerEls) el.classList.toggle('collected', collected.has(id));

  const here = lastFix ? landmarkInRange(lastFix) : null;
  captureBtn.disabled = here === null;
  captureLabel.textContent = here ? (collected.has(here.id) ? `Retake ${here.name}` : `Capture ${here.name}`) : 'Capture';

  if (!lastFix) {
    hint.textContent = 'Share your location to start collecting.';
  } else if (here && !collected.has(here.id)) {
    hint.textContent = `You are at ${here.name}. Face it and capture!`;
  } else {
    const next = nearestLandmark(lastFix.position, SPIKE_LANDMARKS, collected);
    hint.textContent = next ? `Next: ${directionHint(next)}` : 'All six collected. Nice work!';
  }
  if (selected) fillCard(selected);
}

/** React to a location state change. */
function onLocation(state: LocationState): void {
  const message = locationMessage(state);
  banner.hidden = message === null;
  bannerText.textContent = message ?? '';
  // Offer the button only where pressing it can help.
  bannerButton.hidden = !(state.status === 'idle' || state.status === 'unavailable' || state.status === 'timeout');
  bannerButton.textContent = state.status === 'idle' ? 'Share location' : 'Try again';

  if (state.status === 'ready') {
    lastFix = state.fix;
    drawPlayer(state.fix);
  } else if (state.status === 'idle' || state.status === 'denied') {
    lastFix = null;
  }
  // 'timeout' and 'unavailable' keep the last good fix on the map.
  render();
}

// ---- Landmark card -------------------------------------------------------------------------

const card = $('card');
$('card-close').addEventListener('click', () => {
  selected = null;
  card.hidden = true;
});

/** Show the card for a landmark. */
function openCard(landmark: Landmark): void {
  selected = landmark;
  fillCard(landmark);
  card.hidden = false;
}

/** Write a landmark's details into the card. */
function fillCard(landmark: Landmark): void {
  const isCollected = collected.has(landmark.id);
  const badge = $<HTMLImageElement>('card-badge');
  // The locked silhouette sits next to each badge as <id>-locked.png (scripts/make-pixel-art.ts).
  badge.src = isCollected ? landmark.badgeUrl : landmark.badgeUrl.replace(/\.png$/, '-locked.png');
  $('card-name').textContent = landmark.name;
  const rarity = $('card-rarity');
  rarity.textContent = landmark.rarity.toUpperCase();
  rarity.className = `rarity rarity-${landmark.rarity}`;
  $('card-blurb').textContent = landmark.blurb;
  $('card-years').textContent = `Time Machine years: ${landmark.eraYears.join(', ')}`;
  $('card-distance').textContent = lastFix
    ? `${formatDistance(haversineM(lastFix.position, landmark.photoSpot))} from the photo spot`
    : 'Share your location to see how far it is.';
  const action = $<HTMLButtonElement>('card-action');
  action.textContent = isCollected ? 'Open Time Machine' : 'Show photo spot';
  action.onclick = () => {
    if (isCollected) {
      // The real button routes to /time/[landmarkId] (Agent 4's screen).
      toast(`Would open /time/${landmark.id}`);
    } else {
      map.flyTo({ center: [landmark.photoSpot.lng, landmark.photoSpot.lat], zoom: 18 });
    }
  };
}

// ---- Capture (faked) ----------------------------------------------------------------------

captureBtn.addEventListener('click', () => {
  const here = lastFix ? landmarkInRange(lastFix) : null;
  if (!here) return;
  const isNew = !collected.has(here.id);
  collected.add(here.id);
  localStorage.setItem(COLLECTED_KEY, JSON.stringify([...collected]));
  toast(isNew ? `Badge collected: ${here.name}!` : `${here.name} already in your Dex`);
  openCard(here);
  render();
});

/** Show a short message at the top of the screen for 2.5 seconds. */
function toast(text: string): void {
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = text;
  document.body.append(el);
  setTimeout(() => el.remove(), 2500);
}

// ---- Dev spoof panel ------------------------------------------------------------------------

/** Accuracy chosen on the slider, metres. */
function spoofAccuracyM(): number {
  return Number($<HTMLInputElement>('dev-acc').value) || DEFAULT_SPOOF_ACCURACY_M;
}

if (devTools) {
  // Shown collapsed, so it does not cover the map until opened.
  $('dev-panel').hidden = false;
  const jumps = $('dev-jumps');
  for (const l of SPIKE_LANDMARKS) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'btn btn-small';
    b.textContent = l.name;
    b.addEventListener('click', () => tracker.spoof(l.photoSpot, spoofAccuracyM()));
    jumps.append(b);
  }
  const acc = $<HTMLInputElement>('dev-acc');
  acc.addEventListener('input', () => {
    $('dev-acc-label').textContent = `${acc.value} m`;
    if (lastFix?.source === 'spoof') tracker.spoof(lastFix.position, spoofAccuracyM());
  });
  $('dev-clear').addEventListener('click', () => {
    tracker.clearSpoof();
    if (tracker.current.status === 'idle') tracker.start();
  });
}

// ---- Start ----------------------------------------------------------------------------------

tracker.subscribe(onLocation);

// If permission was already granted, start at once; otherwise wait for the button, because
// some browsers only prompt in response to a tap.
void (async () => {
  try {
    const status = await navigator.permissions?.query({ name: 'geolocation' });
    if (status?.state === 'granted') tracker.start();
  } catch {
    // Permissions API missing or refusing the query (older Safari): wait for the button.
  }
})();
