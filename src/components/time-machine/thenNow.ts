/**
 * Pure maths for the then/now slider: where the divider sits, from a pointer or a key press.
 *
 * Owner: Agent 4. Implements A4-06 (MASTER.md section 11). Kept apart from the component so it is
 * unit tested without a DOM.
 */

/**
 * Eras whose scene is NOT an edit of the landmark's reference photo, so Then/Now would compare two viewpoints
 * (R3-4c, V9). Checked by eye at 04:50 on 15 Nov: Agent 6's 8 demo scenes (public/demo/) are period views from
 * other spots; even the closest, Dom Luis I Bridge 1886, is taken from the road deck, not the reference's bank.
 * Agent 2's crop for queens-tower_1893 was for an older scene and does not fit the demo one. Remove an id once
 * its scene is regenerated from the reference photo (Queen's Tower 1893 after Agent 5's wide photo, R3-2e).
 */
// Empty since 05:30 on 15 Nov (Agent 6, A6-06): all 8 demo scenes were regenerated from their reference photo's own
// viewpoint (scripts/demo/framing.ts), and the human asked for Then/Now on every location.
export const THEN_NOW_MISALIGNED_ERAS: ReadonlySet<string> = new Set<string>([]);

/**
 * Whether the Then/Now button is offered for an era.
 *
 * @param eraId - The era.
 * @param sceneImageUrl - The era's scene, or null.
 * @param referencePhotoUrl - The landmark's present-day photo, or empty.
 * @returns True when both pictures exist and the scene is known to keep the reference photo's framing.
 */
export function canCompareThenNow(eraId: string, sceneImageUrl: string | null | undefined, referencePhotoUrl: string | null | undefined): boolean {
  return Boolean(sceneImageUrl && referencePhotoUrl) && !THEN_NOW_MISALIGNED_ERAS.has(eraId);
}

/** Where the divider starts: half then, half now. */
export const THEN_NOW_START_PERCENT = 50;

/** How far one arrow-key press moves the divider, in percent of the width. */
export const THEN_NOW_KEY_STEP_PERCENT = 5;

/**
 * Clamp a divider position to the 0 to 100 range. NaN becomes the starting position.
 *
 * @param percent - A position in percent of the image width.
 * @returns The same position, inside 0 to 100.
 */
export function clampPercent(percent: number): number {
  if (Number.isNaN(percent)) return THEN_NOW_START_PERCENT;
  return Math.min(100, Math.max(0, percent));
}

/**
 * Divider position under a pointer.
 *
 * @param clientX - The pointer's x in viewport pixels.
 * @param boxLeftPx - The slider box's left edge in viewport pixels (from getBoundingClientRect).
 * @param boxWidthPx - The slider box's width in pixels. Zero or less gives the starting position.
 * @returns Position in percent of the width, 0 to 100.
 */
export function percentFromPointer(clientX: number, boxLeftPx: number, boxWidthPx: number): number {
  if (!(boxWidthPx > 0)) return THEN_NOW_START_PERCENT;
  return clampPercent(((clientX - boxLeftPx) / boxWidthPx) * 100);
}

/**
 * Divider position after a key press, for keyboard and screen-reader users.
 *
 * @param percent - The current position.
 * @param key - `KeyboardEvent.key`.
 * @returns The new position, or null when the key does not move the divider.
 */
export function percentAfterKey(percent: number, key: string): number | null {
  switch (key) {
    case 'ArrowLeft':
    case 'ArrowDown':
      return clampPercent(percent - THEN_NOW_KEY_STEP_PERCENT);
    case 'ArrowRight':
    case 'ArrowUp':
      return clampPercent(percent + THEN_NOW_KEY_STEP_PERCENT);
    case 'Home':
      return 0;
    case 'End':
      return 100;
    default:
      return null;
  }
}
