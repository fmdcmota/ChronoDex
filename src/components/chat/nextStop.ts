/**
 * Pick the next landmark to suggest after a chat: the nearest one the player has not collected.
 *
 * Owner: Agent 4. Implements the "after the chat, a prompt to the next landmark" part of A4-09
 * (MASTER.md section 11). Distances use Agent 3's `nearestLandmark` (read only, not edited) so the
 * chat and the map's hint (A3-09) agree.
 *
 * Measured from the current landmark's photo spot, not the player's live position: the chat screen
 * does not ask for location, and a player chatting has usually just captured this landmark.
 */
import type { ChatMessage, Landmark, LandmarkId } from '@/lib/contracts';
import { nearestLandmark, type LandmarkFix } from '@/components/explore/lib/geo-format';

/**
 * The nearest uncollected landmark from the current one.
 *
 * @param currentId - The landmark whose guide the player is chatting with. Always excluded.
 * @param landmarks - Every landmark.
 * @param collectedIds - Landmarks the player has already collected.
 * @returns The suggestion with distance and bearing, or null when the current landmark is unknown
 *   or every other landmark is collected.
 */
export function nextStop(
  currentId: LandmarkId,
  landmarks: readonly Landmark[],
  collectedIds: Iterable<LandmarkId>,
): LandmarkFix | null {
  const current = landmarks.find((l) => l.id === currentId);
  if (!current) return null;
  const skip = new Set<LandmarkId>(collectedIds);
  skip.add(currentId);
  return nearestLandmark(current.photoSpot, landmarks, skip);
}

/**
 * Whether the chat has gone far enough to suggest moving on: the player has asked something and
 * the guide has answered it.
 *
 * @param messages - The thread, oldest first.
 * @returns True when a player message is followed by a guide reply and the guide spoke last.
 */
export function chatHasExchange(messages: readonly ChatMessage[]): boolean {
  const firstPlayer = messages.findIndex((m) => m.role === 'player');
  if (firstPlayer < 0) return false;
  return messages.length > firstPlayer + 1 && messages[messages.length - 1]?.role === 'guide';
}
