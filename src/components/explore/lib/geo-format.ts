/**
 * Distance and direction for people to read: "230 m", "north-east", "nearest landmark".
 *
 * Owner: Agent 3 (Explorer). Ported from spikes/agent-3/src/lib/geo-format.ts, with the spike's
 * `./contracts-copy` swapped for `@/lib/contracts`.
 *
 * Implements the display side of MASTER.md tasks A3-04, A3-06 (too-far message) and A3-09
 * (next-landmark hint). Pure functions, no DOM, so they are unit tested in geo-format.test.ts.
 */
import { bearingDeg, haversineM, type LatLng, type Landmark, type LandmarkId } from '@/lib/contracts';

/** Below this, distances are shown to the metre. Above it, rounded to tens of metres. */
const ROUND_TO_TENS_FROM_M = 100;
/** From this distance on, distances are shown in kilometres. */
const KM_FROM_M = 1000;

/**
 * Format a distance the way a player reads it on a phone.
 *
 * Examples: 7 -> "7 m", 123 -> "120 m", 995 -> "1.0 km", 1460 -> "1.5 km".
 *
 * @param distanceM - Distance in metres. Negative or non-finite input is treated as 0.
 * @returns A short label with the unit.
 */
export function formatDistance(distanceM: number): string {
  const m = Number.isFinite(distanceM) && distanceM > 0 ? distanceM : 0;
  if (m < ROUND_TO_TENS_FROM_M) return `${Math.round(m)} m`;
  const tens = Math.round(m / 10) * 10;
  // 995 m rounds to 1000 m, which reads better as "1.0 km" than "1000 m".
  if (tens < KM_FROM_M) return `${tens} m`;
  return `${(m / KM_FROM_M).toFixed(1)} km`;
}

/** The eight compass points, clockwise from north. Index = sector of 45 degrees. */
export const COMPASS_WORDS = [
  'north',
  'north-east',
  'east',
  'south-east',
  'south',
  'south-west',
  'west',
  'north-west',
] as const;

/** One of the eight compass words in COMPASS_WORDS. */
export type CompassWord = (typeof COMPASS_WORDS)[number];

/**
 * Turn a bearing into one of eight compass words.
 *
 * Each word covers 45 degrees centred on its direction, so 22.4 is "north" and 22.5 is
 * "north-east".
 *
 * @param bearing - Degrees clockwise from north. Any finite value; it is wrapped into [0, 360).
 * @returns The compass word.
 */
export function compassWord(bearing: number): CompassWord {
  const wrapped = ((bearing % 360) + 360) % 360;
  const sector = Math.floor((wrapped + 22.5) / 45) % 8;
  // The modulo keeps sector in 0..7, so the lookup always hits.
  return COMPASS_WORDS[sector] as CompassWord;
}

/** Where a landmark is relative to the player. */
export interface LandmarkFix {
  landmark: Landmark;
  /** Metres from the player to the landmark's photoSpot (assumption A3). */
  distanceM: number;
  /** Degrees clockwise from north, from the player towards the photoSpot. */
  bearingDeg: number;
}

/**
 * Find the landmark whose photo spot is closest to the player.
 *
 * Measures to `photoSpot`, not `subject`, because that is where the capture rule measures
 * (assumption A3, decision D-005).
 *
 * @param position - The player's position.
 * @param landmarks - Candidates.
 * @param excludeIds - Ids to skip, for example the ones already collected (task A3-09).
 * @returns The nearest landmark with distance and bearing, or null when there is no candidate.
 */
export function nearestLandmark(
  position: LatLng,
  landmarks: readonly Landmark[],
  excludeIds: ReadonlySet<LandmarkId> = new Set(),
): LandmarkFix | null {
  let best: LandmarkFix | null = null;
  for (const landmark of landmarks) {
    if (excludeIds.has(landmark.id)) continue;
    const distanceM = haversineM(position, landmark.photoSpot);
    if (best === null || distanceM < best.distanceM) {
      best = { landmark, distanceM, bearingDeg: bearingDeg(position, landmark.photoSpot) };
    }
  }
  return best;
}

/**
 * One-line hint such as "Royal Albert Hall is 230 m north-east". Used by the too-far message
 * (A3-06) and the next-landmark hint (A3-09).
 *
 * @param fix - Output of nearestLandmark.
 * @returns The sentence, without a full stop.
 */
export function directionHint(fix: LandmarkFix): string {
  return `${fix.landmark.name} is ${formatDistance(fix.distanceM)} ${compassWord(fix.bearingDeg)}`;
}
