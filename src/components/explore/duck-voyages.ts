/**
 * The voyage ducks: three costumed ducks that travel fixed routes across the world map, for charm
 * (cousins of the Emmanuel College pond duck). You see them when you zoom out to the globe.
 * - A British duck, in a top hat and a red, white and blue scarf, sails the Atlantic from
 *   Plymouth to New York in a little boat.
 * - A Saharan duck, in a white head cloth and an indigo robe, walks from Mauritania to the oasis
 *   of Siwa in Egypt.
 * - A Chinese duck, in a conical straw hat and a red jacket, walks the Great Wall from Shanhaiguan
 *   to Jiayuguan.
 * Each walks (or sails) its route one way in about a minute, fades out at the end, reappears at
 * the start, and goes again, for ever.
 *
 * Owner: Agent 3 (Explorer). Not in MASTER.md: added at the human's request on 15 Nov 2026 in place
 * of a duck that walked randomly across the screen, and built to be removed cleanly.
 *
 * HOW TO REMOVE IT (any one of these):
 * 1. Quickest: set VOYAGES_ENABLED below to false. Nothing starts.
 * 2. Remove the `startDuckVoyages` import and its two uses (start, and the cleanup call) from
 *    MapScreen.tsx.
 * 3. Delete this file, lib/route-path.ts (and its test) and public/sprites/duck/, then do 2.
 * 4. Or `git revert` the single commit that added it (that also brings the old random walker back).
 *
 * How: each duck is a MapLibre HTML marker whose position is set from the clock every animation
 * frame, so it is always where the clock says (no state, no re-renders), and it sits in the map so
 * it moves with the map, the way a landmark does. The picture is a 2-frame sprite sheet (the legs
 * swap, or the boat rocks). The styles are injected as one `<style>` element (this repo's Turbopack
 * rule breaks CSS modules, and global CSS may only be imported from the root layout) and removed
 * again by the returned stop function.
 */
import { Marker, type Map as MapLibreMap } from 'maplibre-gl';
import type { LatLng } from '@/lib/contracts';
import { edgeFade, loopFraction, positionAlong } from './lib/route-path';

/** Master switch. False removes the ducks without deleting anything. */
const VOYAGES_ENABLED = true;

/** Which sprite sheet a duck uses (public/sprites/duck/<sheet>.png). */
type Sheet = 'british' | 'saharan' | 'chinese';

/** One duck's trip. */
interface Voyage {
  /** Short name, for the marker's accessible label. */
  label: string;
  sheet: Sheet;
  /** True for the boat, which rocks slowly; walkers swap legs quickly. */
  rocks: boolean;
  /** Seconds to travel the whole route. */
  legS: number;
  /** Seconds into its cycle at page load, so the three ducks are not in step. */
  startOffsetS: number;
  /** Waypoints as [longitude, latitude], dense enough to stay on water, sand or the wall. */
  route: ReadonlyArray<readonly [number, number]>;
}

/** The three voyages. Waypoints were placed by hand on the map: sea, desert track, wall. */
const VOYAGES: readonly Voyage[] = [
  {
    label: 'A duck sailing the Atlantic',
    sheet: 'british',
    rocks: true,
    legS: 70,
    startOffsetS: 20,
    // Plymouth Sound to the sea south of Long Island, New York.
    route: [[-4.15, 50.33], [-5.8, 49.7], [-10, 49.3], [-18, 48.4], [-26, 47.2], [-34, 46], [-42, 44.8], [-50, 43.4], [-58, 42.2], [-66, 41.3], [-72.5, 40.4]],
  },
  {
    label: 'A duck crossing the Sahara',
    sheet: 'saharan',
    rocks: false,
    legS: 62,
    startOffsetS: 5,
    // Adrar in Mauritania, across the Algerian and Libyan desert, to Siwa oasis in Egypt.
    route: [[-12, 20.9], [-8, 21.5], [-3, 22.5], [3, 24], [8, 25.3], [13, 26.4], [18, 27.4], [23, 28.4], [25.5, 29.2]],
  },
  {
    label: 'A duck walking the Great Wall',
    sheet: 'chinese',
    rocks: false,
    legS: 50,
    startOffsetS: 33,
    // Shanhaiguan, where the wall meets the sea, west through Badaling to Jiayuguan.
    route: [[119.77, 40.01], [117.25, 40.68], [116.57, 40.43], [116.02, 40.36], [113.4, 40.2], [111.2, 39.7], [109.7, 38.3], [106.6, 37.9], [103, 37.6], [100.5, 38.5], [98.3, 39.8]],
  },
];

/**
 * On-screen size of one frame, CSS pixels: a 40 by 32 art frame at 1.5x. On a 2x phone screen
 * that is exactly 3 device pixels per art pixel, so it stays sharp (on a 1x desktop screen the
 * pixels are slightly uneven, which is fine for a decoration).
 */
const FRAME_W_PX = 60;
const FRAME_H_PX = 48;
/** Share of each crossing spent fading in at the start and out at the end. */
const FADE_MARGIN = 0.04;
/** Frame swap period in seconds: quick for a waddle, slow for a boat. */
const WALK_FRAME_S = 0.34;
const SAIL_FRAME_S = 0.9;
/** id of the injected style element. */
const STYLE_ID = 'emma-voyage-css';

/** The ducks' styles, all under the unique `emma-voyage` prefix so nothing else is touched. */
const VOYAGE_CSS = `
.emma-voyage { pointer-events: none; }
.emma-voyage-sprite { width: ${FRAME_W_PX}px; height: ${FRAME_H_PX}px; background-repeat: no-repeat; background-size: ${FRAME_W_PX * 2}px ${FRAME_H_PX}px; image-rendering: pixelated; }
.emma-voyage-left { transform: scaleX(-1); }
.emma-voyage-walk { animation: emma-voyage-frames ${WALK_FRAME_S}s steps(1, end) infinite; }
.emma-voyage-sail { animation: emma-voyage-frames ${SAIL_FRAME_S}s steps(1, end) infinite; }
@keyframes emma-voyage-frames { 0% { background-position: 0 0; } 50% { background-position: -${FRAME_W_PX}px 0; } }
`;

/**
 * Put the three voyage ducks on a map and start them moving. Safe to call once per map.
 *
 * Does nothing (and returns a no-op) when VOYAGES_ENABLED is false, or when the player prefers
 * reduced motion (a duck that never moves would just sit in the ocean).
 *
 * Side effects: adds three markers to the map and one `<style>` element to the document head.
 *
 * @param map - The MapLibre map to add the ducks to.
 * @returns A function that removes the markers, the style and the animation loop.
 */
export function startDuckVoyages(map: MapLibreMap): () => void {
  if (!VOYAGES_ENABLED || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return () => undefined;

  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = VOYAGE_CSS;
  document.head.append(style);

  const travellers = VOYAGES.map((voyage) => {
    // MapLibre positions the root element, so it gets no layout styles; everything visual is on
    // the inner sprite (the marker root rule in README.md).
    const root = document.createElement('div');
    root.className = 'emma-voyage';
    root.setAttribute('role', 'img');
    root.setAttribute('aria-label', voyage.label);
    const sprite = document.createElement('div');
    sprite.className = 'emma-voyage-sprite';
    sprite.style.backgroundImage = `url('/sprites/duck/${voyage.sheet}.png')`;
    sprite.classList.add(voyage.rocks ? 'emma-voyage-sail' : 'emma-voyage-walk');
    root.append(sprite);
    const waypoints: LatLng[] = voyage.route.map(([lng, lat]) => ({ lat, lng }));
    const start = positionAlong(waypoints, 0).position;
    const marker = new Marker({ element: root, anchor: 'center' }).setLngLat([start.lng, start.lat]).addTo(map);
    return { voyage, sprite, marker, waypoints, faceLeft: false };
  });

  const epochMs = performance.now();
  let frame = 0;
  const tick = () => {
    const nowS = (performance.now() - epochMs) / 1000;
    for (const t of travellers) {
      const fraction = loopFraction(nowS + t.voyage.startOffsetS, t.voyage.legS);
      const { position, eastward } = positionAlong(t.waypoints, fraction);
      t.marker.setLngLat([position.lng, position.lat]);
      t.sprite.style.opacity = String(edgeFade(fraction, FADE_MARGIN));
      // The art faces right. Face left on a leg that heads west.
      const faceLeft = eastward === -1;
      if (faceLeft !== t.faceLeft) {
        t.faceLeft = faceLeft;
        t.sprite.classList.toggle('emma-voyage-left', faceLeft);
      }
    }
    frame = requestAnimationFrame(tick);
  };
  frame = requestAnimationFrame(tick);

  return () => {
    cancelAnimationFrame(frame);
    for (const t of travellers) t.marker.remove();
    style.remove();
  };
}
