/**
 * Keeps a just-taken photo in the memory box, and notes a first-time badge for the Dex to twirl.
 *
 * Owner: Agent 3 (Explorer). Browser only (it draws on a canvas). Best effort: a failure here must
 * never spoil a capture, so every error is swallowed.
 */
import type { Capture, Landmark } from '@/lib/contracts';
import { makeThumbnailDataUrl } from './image-resize';
import { addMemory, markJustCollected, parseMemoryBox, readMemoryBoxRaw, saveMemoryBox } from './memory-box';

/**
 * Put the photo in the memory box and, for a first-time badge, leave the Dex a note to twirl it.
 *
 * Side effects: decodes the photo, writes localStorage (the box) and sessionStorage (the note),
 * and tells the open screens the box changed.
 *
 * @param photo - The JPEG that was uploaded.
 * @param capture - The capture the server recorded.
 * @param landmark - The landmark that was captured.
 * @param isNew - True when this is the first time the player collected the landmark.
 * @param playerId - The current player.
 * @returns Resolves when done; never rejects.
 */
export async function rememberPhoto(
  photo: Blob,
  capture: Capture,
  landmark: Landmark,
  isNew: boolean,
  playerId: string,
): Promise<void> {
  if (isNew) markJustCollected(landmark.id);
  try {
    const takenAtMs = Date.now();
    const thumb = await makeThumbnailDataUrl(photo);
    // A retake returns the original capture, so the id carries the time to keep every photo.
    const entry = { id: `${capture.id}:${takenAtMs}`, landmarkId: landmark.id, landmarkName: landmark.name, takenAtMs, thumb };
    const entries = parseMemoryBox(readMemoryBoxRaw(), playerId);
    saveMemoryBox(playerId, addMemory(entries, entry));
  } catch {
    // The keepsake is a bonus; the badge is already safe on the server.
  }
}
