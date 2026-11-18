/**
 * Pure logic for the duck tutorial on the Map screen: what the duck says, how long it takes, and whether to show it.
 *
 * Owner: Agent 3 (Explorer). Added at the human's request, 18 Nov 2026; see DuckTutorial.tsx.
 */

/** sessionStorage key set once the tutorial has played, so coming back from the Dex does not replay it. */
export const TUTORIAL_SEEN_KEY = 'chronodex.duckTutorial.seen';

/** The duck's lines, in order. About 15 seconds in all at the speeds in TUTORIAL_TIMING. */
export const TUTORIAL_LINES: readonly string[] = [
  "Quack! I'm Professor Puddles, your guide through time.",
  'Walk to a landmark on the map. Get within 50 m of its photo spot.',
  'Tap Capture and snap a photo to win its badge for your Dex.',
  'Each badge opens a Time Machine: look around the past in 360°.',
  'Then chat with a guide from that year. Off you waddle!',
];

/** Timings of the tutorial, in milliseconds. */
export const TUTORIAL_TIMING = {
  /** Time to type out one character of a line. */
  CHAR_MS: 30,
  /** How long a finished line stays up before the next one starts. */
  HOLD_MS: 1_200,
  /** Fade in of the dark backdrop and the duck. */
  ENTER_MS: 400,
  /** Fade out at the end. */
  LEAVE_MS: 350,
} as const;

/**
 * Total time the tutorial runs without taps, in milliseconds.
 *
 * @param lines - The lines spoken.
 * @returns Typing time of every line, plus each hold, plus the fades.
 */
export function tutorialDurationMs(lines: readonly string[] = TUTORIAL_LINES): number {
  const typing = lines.reduce((sum, line) => sum + line.length * TUTORIAL_TIMING.CHAR_MS, 0);
  return TUTORIAL_TIMING.ENTER_MS + typing + lines.length * TUTORIAL_TIMING.HOLD_MS + TUTORIAL_TIMING.LEAVE_MS;
}

/**
 * Decide whether the tutorial plays when the map opens.
 *
 * `?duck=1` forces it and `?duck=0` skips it (for testing and rehearsals). Otherwise it plays once per browser
 * session. A storage that throws counts as "not seen", so the tutorial plays.
 *
 * @param storage - sessionStorage, or null when there is none.
 * @param search - window.location.search, for example "?duck=1".
 * @returns True when the tutorial should play.
 */
export function shouldShowTutorial(storage: Pick<Storage, 'getItem'> | null, search: string): boolean {
  const forced = new URLSearchParams(search).get('duck');
  if (forced === '1') return true;
  if (forced === '0') return false;
  try {
    return storage?.getItem(TUTORIAL_SEEN_KEY) !== '1';
  } catch {
    return true;
  }
}

/**
 * Remember that the tutorial has played in this browser session. Never throws.
 *
 * @param storage - sessionStorage, or null.
 */
export function markTutorialSeen(storage: Pick<Storage, 'setItem'> | null): void {
  try {
    storage?.setItem(TUTORIAL_SEEN_KEY, '1');
  } catch {
    // Storage blocked: the tutorial may play again next time, which is harmless.
  }
}
