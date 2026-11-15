/**
 * Player-facing wording for a capture that did not collect a badge (MASTER.md section 1.2 step 4,
 * task A3-06).
 *
 * Owner: Agent 3 (Explorer).
 *
 * The server answers a refused capture with `{ ok: false, reason, nearest }` (MASTER.md section
 * 4.1, CaptureResult). This turns that into one short sentence, including how far and in which
 * direction the nearest landmark is. Pure functions with unit tests.
 */
import { bearingDeg, GAME, type CaptureResult, type Landmark, type LatLng } from '@/lib/contracts';
import { compassWord, formatDistance } from './geo-format';

/** The refused half of a CaptureResult. */
export type CaptureFailure = Extract<CaptureResult, { ok: false }>;

/**
 * Describe why a capture was refused, and where to go next.
 *
 * Examples:
 * - too_far: "You are 230 m from Royal Albert Hall. Head north-east to reach its photo spot."
 * - location_missing: "We could not find you. Allow location access and try again."
 *
 * @param failure - The refused CaptureResult.
 * @param landmarks - Every landmark, to look the nearest one up by id.
 * @param position - Where the player was when they pressed the shutter, if known. Without it the
 *   direction is left out.
 * @returns One or two short sentences, no markup.
 */
export function describeCaptureFailure(
  failure: CaptureFailure,
  landmarks: readonly Landmark[],
  position: LatLng | null,
): string {
  switch (failure.reason) {
    case 'location_missing':
      return 'We could not find you. Allow location access and try again.';
    case 'photo_missing':
      return 'The photo did not come through. Take it again.';
    case 'too_far': {
      const near = failure.nearest;
      const landmark = near ? landmarks.find((l) => l.id === near.landmarkId) : undefined;
      if (!near || !landmark) {
        return `No landmark is within ${GAME.CAPTURE_RADIUS_M} m of you.`;
      }
      const distance = formatDistance(near.distanceM);
      if (!position) return `You are ${distance} from ${landmark.name}. Get within ${GAME.CAPTURE_RADIUS_M} m of its photo spot.`;
      const direction = compassWord(bearingDeg(position, landmark.photoSpot));
      return `You are ${distance} from ${landmark.name}. Head ${direction} to reach its photo spot.`;
    }
  }
}

/** The two fields of ApiError that decide the wording. Structural, so the tests need no class. */
export interface ApiFailureLike {
  /** HTTP status, or 0 when the request never reached the server. */
  status: number;
  /** Machine-readable code, for example "network_error". */
  code: string;
}

/** Which request failed. The same status can mean different things for each. */
export type ApiStep = 'upload' | 'capture';

/**
 * Statuses that mean "this route does not exist (yet)" for a photo upload. Next.js answers a
 * multipart POST to a missing route with 409 "Server Action unavailable", not 404, so 409 counts.
 */
const UPLOAD_ROUTE_MISSING_STATUSES: readonly number[] = [404, 405, 409, 501];

/**
 * Describe a failed API call to the player in one sentence.
 *
 * The raw server message is for developers and is never shown. A missing upload route is what the
 * server returns until the studio side ships it, so for the upload step it gets its own plain
 * wording.
 *
 * @param error - The thrown ApiError, or anything else (treated as an unknown failure).
 * @param step - Which request failed. Defaults to `capture`.
 * @returns One short sentence, no markup.
 */
export function describeApiFailure(error: unknown, step: ApiStep = 'capture'): string {
  const failure =
    typeof error === 'object' && error !== null && 'status' in error && 'code' in error
      ? (error as ApiFailureLike)
      : null;
  if (!failure) return 'Something went wrong. Try again.';
  if (failure.status === 0) return 'Could not reach the server. Check your signal and try again.';
  if (failure.status === 413) return 'That photo is too big to send. Take it again.';
  if (failure.status === 429) return 'Too many photos too fast. Wait a few seconds and try again.';
  if (step === 'upload' && failure.status === 415) return 'That file is not a photo we can use. Take it again.';
  if (step === 'upload' && UPLOAD_ROUTE_MISSING_STATUSES.includes(failure.status)) {
    return 'The server cannot take photos yet. Try again later.';
  }
  if (failure.status === 403 && failure.code.includes('spoof')) {
    return 'Fake locations are switched off on the server.';
  }
  if (failure.status >= 500) return 'The server had a problem. Try again in a moment.';
  return 'Something went wrong. Try again.';
}
