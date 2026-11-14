/**
 * Spike-only copy of the shared contracts Agent 3 needs (MASTER.md sections 4.1 and 4.2).
 * Owner: Agent 3, copied from Agent 1's contract text.
 *
 * Why a copy: the app scaffold and `src/lib/contracts/` did not exist when this spike was
 * written. Types and constants are copied from MASTER.md section 4.1 unchanged. The helpers
 * follow the definitions in section 4.2. When the spike is ported into the app, delete this
 * file and import from `@/lib/contracts` instead. Never edit the copy so it drifts from the
 * contract.
 */

/** Lowercase kebab-case slug, for example "queens-tower". Never contains "_". */
export type LandmarkId = string;

/**
 * WGS84 degrees.
 * GeoJSON, MongoDB and MapLibre all use [lng, lat] order. Convert only in src/lib/db and in map code.
 */
export interface LatLng {
  lat: number;
  lng: number;
}

/** Landmark rarity tier. Drives marker and badge rim colours. */
export type Rarity = 'common' | 'rare' | 'epic' | 'legendary';

/** A seeded landmark, exactly as in MASTER.md section 4.1. */
export interface Landmark {
  id: LandmarkId;
  name: string;
  /** One line for the map card. */
  blurb: string;
  /** Where the player stands. The 50 m check measures to this point, not to the building. */
  photoSpot: LatLng;
  /** The thing being photographed. With photoSpot it gives the viewing bearing. */
  subject: LatLng;
  /** Metres. GAME.CAPTURE_RADIUS_M unless a landmark needs more. */
  captureRadiusM: number;
  rarity: Rarity;
  /** Map marker art, transparent PNG. */
  spriteUrl: string;
  /** Dex badge art, transparent PNG. */
  badgeUrl: string;
  /** Present-day photo from photoSpot facing subject, normalised to 16:9. Base image for every era edit. */
  referencePhotoUrl: string;
  /** Ascending. Each year has one Era document, generated or not. */
  eraYears: number[];
}

/** Game constants, exactly as in MASTER.md section 4.1. */
export const GAME = {
  CAPTURE_RADIUS_M: 50,
  /** GPS is poor between tall buildings. Up to this much of the reported accuracy is forgiven. */
  ACCURACY_ALLOWANCE_MAX_M: 25,
  /** How often screens poll while a job is running. */
  POLL_INTERVAL_MS: 3000,
} as const;

/** Mean Earth radius in metres (IUGG). The usual value for haversine distances. */
const EARTH_RADIUS_M = 6_371_008.8;

const toRad = (deg: number): number => (deg * Math.PI) / 180;
const toDeg = (rad: number): number => (rad * 180) / Math.PI;

/**
 * Great-circle distance between two points (MASTER.md section 4.2).
 *
 * @param a - First point.
 * @param b - Second point.
 * @returns Distance in metres. Accurate to well under a metre at city scale.
 */
export function haversineM(a: LatLng, b: LatLng): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  // min() guards against floating-point h a hair above 1 for antipodal points.
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

/**
 * Initial compass bearing from one point towards another (MASTER.md section 4.2).
 *
 * @param from - Start point.
 * @param to - End point.
 * @returns Degrees clockwise from north, in the range [0, 360).
 */
export function bearingDeg(from: LatLng, to: LatLng): number {
  const phi1 = toRad(from.lat);
  const phi2 = toRad(to.lat);
  const dLng = toRad(to.lng - from.lng);
  const y = Math.sin(dLng) * Math.cos(phi2);
  const x = Math.cos(phi1) * Math.sin(phi2) - Math.sin(phi1) * Math.cos(phi2) * Math.cos(dLng);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

/**
 * The capture rule (MASTER.md section 4.2, decision D-005). The server decides captures. The
 * client uses this only to show distance and to enable the capture button.
 *
 * @param distanceM - Distance from the reported position to the landmark's photoSpot.
 * @param accuracyM - Accuracy radius the browser reported. Only up to
 *   GAME.ACCURACY_ALLOWANCE_MAX_M of it is forgiven.
 * @param radiusM - The landmark's captureRadiusM.
 * @returns True when the player counts as standing at the photo spot.
 */
export function withinCaptureRange(distanceM: number, accuracyM: number, radiusM: number): boolean {
  return Math.max(0, distanceM - Math.min(accuracyM, GAME.ACCURACY_ALLOWANCE_MAX_M)) <= radiusM;
}
