/**
 * The demo set, bundled: the 8 kept demo eras and their 6 landmarks, read from the JSON in `data/demo/`.
 *
 * Owner: Agent 6 (demo assets). Why: the human wants anyone to run the app from their own PC. With no MONGODB_URI the
 * server answers from an in-memory store built from fixtures, and with NEXT_PUBLIC_USE_MOCKS=1 the browser does the
 * same; both used to show placeholder eras. They now lay these over the fixtures, so a fresh clone with no keys shows
 * the real scenes, 360 views, guides, narration and (for the Royal Albert Hall 1871) the guide video, all served from
 * `public/demo/`. Made by scripts/demo (generate-demo.ts, generate-video.ts, export-landmarks.ts).
 *
 * Safe in the browser: static JSON imports only, no file system. The database path (MongoDB) never uses this.
 */
import type { Era, Landmark } from '@/lib/contracts';
import landmarksJson from '../../../data/demo/landmarks.json';
import qt1893 from '../../../data/demo/eras/queens-tower_1893.json';
import qt1962 from '../../../data/demo/eras/queens-tower_1962.json';
import rah1871 from '../../../data/demo/eras/royal-albert-hall_1871.json';
import nhm1862 from '../../../data/demo/eras/natural-history-museum_1862.json';
import nhm1881 from '../../../data/demo/eras/natural-history-museum_1881.json';
import zocalo1519 from '../../../data/demo/eras/zocalo-cathedral_1519.json';
import luis1886 from '../../../data/demo/eras/dom-luis-bridge_1886.json';
import raffles1819 from '../../../data/demo/eras/raffles-landing-site_1819.json';
import berlin1987 from '../../../data/demo/eras/brandenburg-gate-east_1987.json';
import lisbon1775 from '../../../data/demo/eras/praca-do-comercio_1775.json';
import rome120 from '../../../data/demo/eras/roman-forum_120.json';

/** The kept demo eras, all core-tier ready. */
export const DEMO_ERAS: Era[] = [qt1893, qt1962, rah1871, nhm1862, nhm1881, zocalo1519, luis1886, raffles1819, berlin1987, lisbon1775, rome120].map(
  (file) => file.era as Era,
);

/** The demo landmarks with the Archivist's coordinates and a committed reference photo URL. */
export const DEMO_LANDMARKS: Landmark[] = landmarksJson as Landmark[];

/**
 * Whether the demo set is laid over the fixtures. Off under the test runner (vitest sets NODE_ENV=test), whose tests
 * are written against the plain fixtures; on everywhere else, in the browser too.
 *
 * @returns False in tests.
 */
export function demoSetEnabled(): boolean {
  return process.env.NODE_ENV !== 'test';
}

/**
 * Replace the fixture landmarks that are in the demo set with their demo versions. Order is kept.
 *
 * @param landmarks - Fixture landmarks.
 * @param enabled - Default demoSetEnabled(). False returns a plain copy.
 * @returns A new array; landmarks outside the demo set are returned as given.
 */
export function withDemoLandmarks(landmarks: Landmark[], enabled: boolean = demoSetEnabled()): Landmark[] {
  if (!enabled) return structuredClone(landmarks);
  return landmarks.map((landmark) => structuredClone(DEMO_LANDMARKS.find((d) => d.id === landmark.id) ?? landmark));
}

/**
 * Replace the fixture eras that are in the demo set with the kept demo eras.
 *
 * @param eras - Fixture eras.
 * @param enabled - Default demoSetEnabled(). False returns a plain copy.
 * @returns A new array; eras outside the demo set are returned as given.
 */
export function withDemoEras(eras: Era[], enabled: boolean = demoSetEnabled()): Era[] {
  if (!enabled) return structuredClone(eras);
  return eras.map((era) => structuredClone(DEMO_ERAS.find((d) => d.id === era.id) ?? era));
}
