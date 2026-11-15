/**
 * Pure logic for the welcome intro on the Map screen: whether to show it, where the dive lands, and its timings.
 *
 * Owner: Agent 3 (Explorer). Written by Agent 2 at the human's request (15 Nov 2026); see WelcomeIntro.tsx.
 */
import type { LatLng } from '@/lib/contracts';
import type { LocationState } from './location';

/** sessionStorage key set once the intro has played, so returning to the map from the Dex does not replay it. */
export const INTRO_SEEN_KEY = 'chronodex.intro.seen';

/** Timings of the intro, in milliseconds. The dive's CSS animations in WelcomeIntro.styles.ts match these. */
export const INTRO_TIMING = {
  /** Give up waiting for a first GPS fix after this long and land on the nearest city of landmarks instead. */
  LOCATE_TIMEOUT_MS: 12_000,
  /** Give up waiting for the map to finish loading after this long (the intro then just fades away). */
  MAP_WAIT_MS: 10_000,
  /** The clouds close in for this long before the camera starts to fall. */
  FLY_DELAY_MS: 500,
  /** How long the camera takes to fall from the globe to street level. */
  FLY_DURATION_MS: 5_200,
  /** The whole dive with reduced motion: a short fade and a jump. */
  REDUCED_MOTION_MS: 400,
} as const;

/** Where the dive goes once the player pressed the button. */
export type IntroLanding =
  | { kind: 'wait' }
  | { kind: 'player'; position: LatLng }
  | { kind: 'fallback'; reason: string };

/**
 * Decide whether the intro plays when the map opens.
 *
 * `?intro=1` forces it and `?intro=0` skips it (for testing and rehearsals). Otherwise it plays once per browser
 * session. A storage that throws (private mode, blocked site data) counts as "not seen", so the intro plays.
 *
 * @param storage - sessionStorage, or null when there is none.
 * @param search - window.location.search, for example "?intro=1".
 * @returns True when the intro should play.
 */
export function shouldShowIntro(storage: Pick<Storage, 'getItem'> | null, search: string): boolean {
  const forced = new URLSearchParams(search).get('intro');
  if (forced === '1') return true;
  if (forced === '0') return false;
  try {
    return storage?.getItem(INTRO_SEEN_KEY) !== '1';
  } catch {
    return true;
  }
}

/**
 * Remember that the intro has played in this browser session. Never throws.
 *
 * @param storage - sessionStorage, or null.
 */
export function markIntroSeen(storage: Pick<Storage, 'setItem'> | null): void {
  try {
    storage?.setItem(INTRO_SEEN_KEY, '1');
  } catch {
    // Storage blocked: the intro may play again next time, which is harmless.
  }
}

/**
 * Turn a location state into where the dive lands.
 *
 * @param state - The tracker's current state.
 * @returns `wait` while the prompt or the first fix is pending, `player` with a fix, otherwise `fallback` with a
 *   short reason shown under the clouds.
 */
export function landingFor(state: LocationState): IntroLanding {
  switch (state.status) {
    case 'idle':
    case 'locating':
      return { kind: 'wait' };
    case 'ready':
      return { kind: 'player', position: state.fix.position };
    case 'denied':
      return { kind: 'fallback', reason: 'No location shared. Landing at the nearest landmarks instead.' };
    case 'unsupported':
    case 'insecure':
      return { kind: 'fallback', reason: 'This browser cannot share a location. Landing at the landmarks.' };
    case 'unavailable':
    case 'timeout':
      return state.lastFix
        ? { kind: 'player', position: state.lastFix.position }
        : { kind: 'fallback', reason: 'Could not find you yet. Landing at the landmarks.' };
  }
}
