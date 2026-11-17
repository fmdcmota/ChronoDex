/**
 * Showcase mode: keep players' capture photos in a folder on the hosting PC instead of on fal.
 *
 * Owner: Agent 4 (R3-4e, hosting). Server only (node:fs); the rest of src/lib/showcase is also loaded in the browser,
 * so this lives in its own file. The human asked for every picture taken on fmota.com/chronodex to land in a folder
 * on their PC.
 *
 * Flow: POST /api/uploads calls saveCapturePhoto, which writes `<folder>/<YYYY-MM-DD_HH-MM-SS>_<8 hex>.jpg` and returns
 * a placeholder URL on the reserved `.invalid` domain that carries the file id (the capture route needs an http(s)
 * URL; the Dex knows not to show it). When POST /api/captures collects a badge, labelCapturePhoto appends the landmark
 * id to the file name. The folder is CAPTURE_PHOTO_DIR (the `host` script sets it to Pictures/Chronodex captures),
 * else ./captured-photos.
 *
 * Limits: POST /api/uploads already caps the size (MAX_UPLOAD_BYTES), checks the JPEG header and rate-limits per caller.
 */
import { randomBytes } from 'node:crypto';
import { mkdir, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';

/** Start of every showcase photo URL. The `.invalid` TLD is reserved and never resolves. */
export const SHOWCASE_PHOTO_URL_PREFIX = 'https://showcase.invalid/';

/** A photo id: local time to the second, then 8 random hex digits. Strict, so a URL can never name another path. */
const PHOTO_URL_PATTERN = /^https:\/\/showcase\.invalid\/(\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}_[0-9a-f]{8})\.jpg$/;

/** Random bytes in a photo id: enough that two photos in the same second never collide. */
const ID_RANDOM_BYTES = 4;

/**
 * Where photos are written.
 *
 * @returns CAPTURE_PHOTO_DIR, or `<cwd>/captured-photos`.
 */
export function capturePhotoDir(): string {
  return process.env.CAPTURE_PHOTO_DIR || path.join(process.cwd(), 'captured-photos');
}

/**
 * Format a time as `YYYY-MM-DD_HH-MM-SS` in the PC's local time, so the folder sorts by when photos were taken.
 *
 * @param when - The time.
 * @returns For example "2026-11-17_14-50-12".
 */
export function photoStamp(when: Date): string {
  const two = (n: number) => String(n).padStart(2, '0');
  return (
    `${when.getFullYear()}-${two(when.getMonth() + 1)}-${two(when.getDate())}_` +
    `${two(when.getHours())}-${two(when.getMinutes())}-${two(when.getSeconds())}`
  );
}

/**
 * The photo id inside a showcase photo URL.
 *
 * @param url - A URL from saveCapturePhoto, or anything else.
 * @returns The id, or null when the URL is not exactly a showcase photo URL.
 */
export function photoIdFromUrl(url: string): string | null {
  return PHOTO_URL_PATTERN.exec(url)?.[1] ?? null;
}

/**
 * Write a capture photo to the folder.
 *
 * Side effects: creates the folder if needed and writes one JPEG.
 *
 * @param file - The JPEG, already checked by the upload route.
 * @param now - The time to name it by. Tests pass a fixed one.
 * @returns The placeholder URL to store on the capture, carrying the photo id.
 * @throws When the folder cannot be created or the file cannot be written.
 */
export async function saveCapturePhoto(file: Blob, now: Date = new Date()): Promise<string> {
  const id = `${photoStamp(now)}_${randomBytes(ID_RANDOM_BYTES).toString('hex')}`;
  const dir = capturePhotoDir();
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, `${id}.jpg`), Buffer.from(await file.arrayBuffer()));
  return `${SHOWCASE_PHOTO_URL_PREFIX}${id}.jpg`;
}

/**
 * Add the landmark to a saved photo's file name once it has collected a badge: `<id>_<landmarkId>.jpg`.
 *
 * Side effects: renames one file. Does nothing for a URL that is not a showcase photo, or a file already renamed
 * (the same photo sent twice) or gone. Never throws: a missing label must not fail the capture.
 *
 * @param photoUrl - The capture's photo URL.
 * @param landmarkId - The landmark collected (a kebab-case slug from the server, never from the request).
 * @returns Resolves when done.
 */
export async function labelCapturePhoto(photoUrl: string, landmarkId: string): Promise<void> {
  const id = photoIdFromUrl(photoUrl);
  if (!id || !/^[a-z0-9-]+$/.test(landmarkId)) return;
  const dir = capturePhotoDir();
  try {
    await rename(path.join(dir, `${id}.jpg`), path.join(dir, `${id}_${landmarkId}.jpg`));
  } catch {
    // Already labelled or removed by hand. The capture itself is unaffected.
  }
}
