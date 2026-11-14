/**
 * Pure helpers shared by the server and the browser: era ids, geodesy, the capture rule.
 *
 * Owner: Agent 1 (Core). Implements MASTER.md section 4.2. Unit tested in helpers.test.ts.
 * The server decides captures. The client uses the same helpers only to show distance and to
 * enable the capture button.
 */
import { GAME, type EraId, type Landmark, type LandmarkId, type LatLng } from './types';

/** A landmark id: lowercase letters and digits in groups joined by single hyphens. */
export const LANDMARK_ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Mean Earth radius in metres (IUGG). Good to about 0.5 % for haversine distances. */
export const EARTH_RADIUS_M = 6_371_008.8;

const DEG_TO_RAD = Math.PI / 180;
const RAD_TO_DEG = 180 / Math.PI;
const FULL_CIRCLE_DEG = 360;

/**
 * Tell whether a string is a valid LandmarkId.
 *
 * @param id - Candidate id.
 * @returns True for lowercase kebab-case such as "queens-tower".
 */
export function isLandmarkId(id: string): id is LandmarkId {
  return LANDMARK_ID_PATTERN.test(id);
}

/**
 * Build the id of one landmark in one year, for example "queens-tower_1893".
 *
 * Always use this rather than string concatenation, so that every id in the database has the
 * same shape and parseEraId can split it.
 *
 * @param landmarkId - Kebab-case landmark id. Must not contain "_".
 * @param year - Whole year. Negative years (BCE) are allowed.
 * @returns The era id.
 * @throws Error when the landmark id is not kebab-case or the year is not an integer.
 */
export function eraIdOf(landmarkId: LandmarkId, year: number): EraId {
  if (!isLandmarkId(landmarkId)) {
    throw new Error(`Invalid landmark id "${landmarkId}": expected lowercase kebab-case`);
  }
  if (!Number.isInteger(year)) {
    throw new Error(`Invalid year ${year}: expected an integer`);
  }
  return `${landmarkId}_${year}`;
}

/**
 * Split an era id into its landmark id and year. Splits on the last "_".
 *
 * @param eraId - An id built by eraIdOf.
 * @returns The landmark id and the year.
 * @throws Error when the id has no "_", the landmark part is not kebab-case, or the year part is
 *   not a whole number.
 */
export function parseEraId(eraId: EraId): { landmarkId: LandmarkId; year: number } {
  const split = eraId.lastIndexOf('_');
  if (split <= 0) {
    throw new Error(`Invalid era id "${eraId}": expected "<landmarkId>_<year>"`);
  }
  const landmarkId = eraId.slice(0, split);
  const yearText = eraId.slice(split + 1);
  if (!isLandmarkId(landmarkId) || !/^-?\d+$/.test(yearText)) {
    throw new Error(`Invalid era id "${eraId}": expected "<landmarkId>_<year>"`);
  }
  return { landmarkId, year: Number(yearText) };
}

/**
 * Great-circle distance between two points, by the haversine formula.
 *
 * @param a - First point, WGS84 degrees.
 * @param b - Second point, WGS84 degrees.
 * @returns Distance in metres.
 */
export function haversineM(a: LatLng, b: LatLng): number {
  const dLat = (b.lat - a.lat) * DEG_TO_RAD;
  const dLng = (b.lng - a.lng) * DEG_TO_RAD;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(a.lat * DEG_TO_RAD) * Math.cos(b.lat * DEG_TO_RAD) * Math.sin(dLng / 2) ** 2;
  // min() guards against h creeping just above 1 through rounding for antipodal points.
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

/**
 * Initial compass bearing from one point towards another.
 *
 * @param from - Start point, WGS84 degrees.
 * @param to - End point, WGS84 degrees.
 * @returns Degrees clockwise from north, in [0, 360). 0 when the points are the same.
 */
export function bearingDeg(from: LatLng, to: LatLng): number {
  const lat1 = from.lat * DEG_TO_RAD;
  const lat2 = to.lat * DEG_TO_RAD;
  const dLng = (to.lng - from.lng) * DEG_TO_RAD;
  const y = Math.sin(dLng) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  const deg = Math.atan2(y, x) * RAD_TO_DEG;
  // The modulo can return 360 for tiny negative values, so wrap twice.
  return ((deg % FULL_CIRCLE_DEG) + FULL_CIRCLE_DEG) % FULL_CIRCLE_DEG;
}

/**
 * The capture rule: is a player close enough to collect a badge?
 *
 * Up to GAME.ACCURACY_ALLOWANCE_MAX_M of the browser's reported accuracy is forgiven, because GPS
 * is poor between tall buildings (assumption A4). Formula, from MASTER.md 4.2:
 * `max(0, distanceM - min(accuracyM, ACCURACY_ALLOWANCE_MAX_M)) <= radiusM`.
 * A NaN input gives false.
 *
 * @param distanceM - Distance from the player to the landmark's photo spot.
 * @param accuracyM - Accuracy radius the browser reported.
 * @param radiusM - The landmark's captureRadiusM.
 * @returns True when the capture counts.
 */
export function withinCaptureRange(distanceM: number, accuracyM: number, radiusM: number): boolean {
  return Math.max(0, distanceM - Math.min(accuracyM, GAME.ACCURACY_ALLOWANCE_MAX_M)) <= radiusM;
}

/** A landmark with its distance from the player. */
export interface LandmarkDistance {
  landmark: Landmark;
  distanceM: number;
}

/**
 * Work out which landmark, if any, a capture at this location collects.
 *
 * Used by POST /api/captures on the server and by mock mode in the browser, so both apply the
 * same rule.
 *
 * @param location - Player position.
 * @param accuracyM - Accuracy radius the browser reported, in metres.
 * @param landmarks - Every landmark in the game.
 * @returns `hit`: the closest landmark in capture range, or null. `nearest`: the closest landmark
 *   by distance to its photo spot whether in range or not, or null when there are no landmarks.
 */
export function resolveCapture(
  location: LatLng,
  accuracyM: number,
  landmarks: readonly Landmark[],
): { hit: LandmarkDistance | null; nearest: LandmarkDistance | null } {
  const ranked = landmarks
    .map((landmark) => ({ landmark, distanceM: haversineM(location, landmark.photoSpot) }))
    .sort((a, b) => a.distanceM - b.distanceM);
  const hit =
    ranked.find((r) => withinCaptureRange(r.distanceM, accuracyM, r.landmark.captureRadiusM)) ??
    null;
  return { hit, nearest: ranked[0] ?? null };
}
