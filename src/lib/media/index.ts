/**
 * The generated-media store, wired up for the app and the worker. Server and worker only.
 *
 * Owner: Agent 4 (Time Machine), by the human's grant (MASTER.md section 3, 15 Nov 2026).
 * Implements notebook/agent-4-panorama-plan.md section 3, task A4-11.
 *
 * Every generated file (scene, panorama, headshot, narration, clips) is saved here the moment it exists, and the
 * Era stores `/api/media/<id>` instead of the fal URL. Nobody pays fal for the same file twice, and fal's 7-day
 * expiry never forces a paid regeneration.
 *
 * Backend: GridFS on Atlas when MONGODB_URI is set, otherwise the folder MEDIA_DIR (default `.media`).
 *
 * For the pipeline (Agent 2, task A2-h):
 *   const { url } = await persistFromUrl(falUrl, { eraId, name: 'panorama' });  // before patchEra
 *   const input = await toFalUrl(era.sceneImageUrl);                              // before a model call
 */
import path from 'node:path';
import { uploadToFal } from '@/lib/fal';
import { createFolderBackend } from './backends/folder';
import { createGridFsBackend } from './backends/gridfs';
import { createMediaStore, type MediaStore, type PersistedMedia, type PersistOptions } from './store';
import type { ByteRange, MediaAsset, MediaBackend } from './types';

export {
  FAL_URL_ASSUMED_LIFETIME_MS,
  FAL_URL_MIN_REMAINING_MS,
  MAX_MEDIA_BYTES,
  MEDIA_ID_LENGTH,
  MEDIA_URL_PREFIX,
  contentTypeFor,
  createMediaStore,
  isFalUrl,
  isMediaId,
  mediaIdFromUrl,
  mediaUrl,
  type MediaStore,
  type MediaStoreDeps,
  type PersistOptions,
  type PersistedMedia,
} from './store';
export { etagMatches, parseRange, type RangeResult } from './range';
export { createMemoryBackend } from './backends/memory';
export { createFolderBackend } from './backends/folder';
export type { ByteRange, MediaAsset, MediaBackend } from './types';

/** Folder used when MONGODB_URI is not set and MEDIA_DIR is empty. It git-ignores itself. */
export const DEFAULT_MEDIA_DIR = '.media';

const GLOBAL_KEY = '__chronodexMediaStore';

interface Wired {
  backend: MediaBackend;
  store: MediaStore;
}

/** Build the process-wide store once (cached on globalThis so Next.js hot reloads reuse it). */
function wired(): Wired {
  const g = globalThis as typeof globalThis & { [GLOBAL_KEY]?: Wired };
  if (!g[GLOBAL_KEY]) {
    const uri = process.env.MONGODB_URI;
    const backend = uri ? createGridFsBackend(uri) : createFolderBackend(process.env.MEDIA_DIR || DEFAULT_MEDIA_DIR);
    const store = createMediaStore({
      backend,
      uploadToFal,
      fetch: (...args) => fetch(...args),
      now: () => new Date(),
      publicDir: path.resolve(process.cwd(), 'public'),
    });
    g[GLOBAL_KEY] = { backend, store };
  }
  return g[GLOBAL_KEY];
}

/**
 * Name of the backend in use, for logs and the persist script.
 *
 * @returns "gridfs" or "folder".
 */
export function mediaBackendKind(): string {
  return wired().backend.kind;
}

/**
 * Keep the file at a URL and return its durable `/api/media/<id>` URL. See MediaStore.persistFromUrl.
 *
 * Side effects: one download (none when the URL or the same bytes are already stored), one write to GridFS or
 * the folder. Cost: nothing on fal.
 *
 * @param url - A fal URL, any http(s) URL, a path under public/, or an /api/media URL (returned as is).
 * @param options - Era id, name, and optionally the content type and the fal URL's expiry.
 * @returns The stored file, its id and its durable URL.
 * @throws Error when the download fails or the file is empty or too large.
 */
export function persistFromUrl(url: string, options: PersistOptions): Promise<PersistedMedia> {
  return wired().store.persistFromUrl(url, options);
}

/**
 * Keep a file held as bytes. See MediaStore.persistBytes.
 *
 * @param bytes - The file.
 * @param options - Era id, name, content type, and optionally its source and fal URLs.
 * @returns The stored file, its id and its durable URL.
 * @throws Error on an empty file.
 */
export function persistBytes(
  bytes: Uint8Array,
  options: PersistOptions & { sourceUrl?: string | null; falUrl?: string | null },
): Promise<PersistedMedia> {
  return wired().store.persistBytes(bytes, options);
}

/**
 * Turn any URL from an Era or Landmark into one a fal model can fetch. See MediaStore.toFalUrl.
 *
 * Side effects: at most one free fal storage upload, recorded so the next call within six days makes none.
 *
 * @param url - For example `/api/media/<id>`, `/reference/queens-tower.jpg` or a fal URL.
 * @returns A public URL fal can read.
 * @throws Error for an SVG, an unknown media id, or a failed upload.
 */
export function toFalUrl(url: string): Promise<string> {
  return wired().store.toFalUrl(url);
}

/**
 * Look up a stored file's record.
 *
 * @param id - Media id.
 * @returns The record, or null.
 */
export function getMediaAsset(id: string): Promise<MediaAsset | null> {
  return wired().store.getAsset(id);
}

/**
 * Stream a stored file, or part of it. Used by GET /api/media/[mediaId].
 *
 * @param id - Media id. Must exist (check with getMediaAsset first).
 * @param range - Inclusive byte range, or undefined for the whole file.
 * @returns A web stream of the bytes.
 */
export function openMedia(id: string, range?: ByteRange): Promise<ReadableStream<Uint8Array>> {
  return wired().backend.read(id, range);
}
