/**
 * How the pipeline keeps what it makes and feeds stored files back to fal.
 *
 * Owner: Agent 2 (Studio). Implements tasks A2-a, A2-h and part of A2-i (notebook/agent-4-panorama-plan.md, "never
 * generate the same thing twice"). Built on Agent 4's media store in `@/lib/media`.
 *
 * - `toFalUrl`: every input URL a model receives goes through it. Our own `/api/media/<id>` files and paths under
 *   public/ (the seeded `/reference/<id>.jpg`) become a live fal URL, uploaded once per week rather than once per
 *   era or retry; an `.svg` is refused with a clear error (the mock reference photo used to be sent to fal as is).
 * - `persist`: every output is copied into the store before it is written on the Era, so the Era holds
 *   `/api/media/<id>`, which outlives fal's 7-day expiry and is never paid for twice.
 * - `prepareReference`: a period photograph is shrunk to 1024 px on its long side before it is uploaded, which cuts
 *   the input tokens of the token-priced models and the critic. It is stored once (deduplicated by content).
 */
import sharp from 'sharp';
import { persistBytes, persistFromUrl, toFalUrl } from '@/lib/media';
import { fetchBuffer } from './stages/image';

/** Long side, in pixels, period reference photographs are shrunk to before upload (A2-i). */
export const REFERENCE_MAX_SIDE_PX = 1024;
/** JPEG quality of a shrunk reference. High: it is a texture source, not a thumbnail. */
const REFERENCE_JPEG_QUALITY = 85;

/** The three media hooks runEraJob uses. Injected so tests and dry runs touch no store and no network. */
export interface PipelineMedia {
  /**
   * Turn a URL from the Era or the Landmark into one fal can fetch.
   *
   * @throws Error for an `.svg`, an unknown media id or a failed upload: the stage then fails with that message.
   */
  toFalUrl(url: string): Promise<string>;
  /** Keep an output and return the URL to write on the Era (`/api/media/<id>`). */
  persist(url: string, eraId: string, name: string): Promise<string>;
  /** Shrink, store and upload one period photograph; returns a fal URL. */
  prepareReference(url: string): Promise<string>;
}

/**
 * Return a URL unchanged. The pass-through hooks use it for all three jobs.
 *
 * @param url - Any URL.
 * @returns The same URL.
 */
async function sameUrl(url: string): Promise<string> {
  return url;
}

/** Media hooks that change nothing: fixtures and tests. URLs pass straight through. */
export const passThroughMedia: PipelineMedia = { toFalUrl: sameUrl, persist: sameUrl, prepareReference: sameUrl };

/**
 * Shrink one image to at most REFERENCE_MAX_SIDE_PX on its long side, as a JPEG. A smaller image is re-encoded
 * but never enlarged.
 *
 * @param bytes - The image.
 * @returns JPEG bytes.
 */
export async function shrinkReference(bytes: Buffer): Promise<Buffer> {
  return sharp(bytes)
    .rotate()
    .resize({ width: REFERENCE_MAX_SIDE_PX, height: REFERENCE_MAX_SIDE_PX, fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: REFERENCE_JPEG_QUALITY })
    .toBuffer();
}

/**
 * Keep an output in the media store.
 *
 * @param url - The fal URL of the output.
 * @param eraId - The era it belongs to.
 * @param name - What it is, for example "panorama".
 * @returns The durable `/api/media/<id>` URL.
 */
async function persistOutput(url: string, eraId: string, name: string): Promise<string> {
  return (await persistFromUrl(url, { eraId, name })).url;
}

/**
 * Shrink one period photograph, store it once (deduplicated by content) and return a live fal URL for it.
 *
 * @param url - The photograph: an http(s) URL or a path under public/.
 * @returns A fal URL of the shrunk copy.
 */
async function prepareStoredReference(url: string): Promise<string> {
  const source = /^https?:\/\//i.test(url) ? url : await toFalUrl(url);
  const shrunk = await shrinkReference(await fetchBuffer(source));
  const stored = await persistBytes(new Uint8Array(shrunk), { eraId: null, name: 'period-reference', contentType: 'image/jpeg', sourceUrl: url });
  return toFalUrl(stored.url);
}

/**
 * The real hooks, on Agent 4's media store (GridFS when MONGODB_URI is set, else the `.media` folder).
 *
 * Side effects: downloads, writes to the store, free fal storage uploads.
 */
export const storeMedia: PipelineMedia = { toFalUrl, persist: persistOutput, prepareReference: prepareStoredReference };
