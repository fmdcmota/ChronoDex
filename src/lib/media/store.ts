/**
 * The media store's logic: keep every generated file once, serve it from our own URL, and hand a fresh fal URL
 * back to the pipeline when a later stage needs the file as model input.
 *
 * Owner: Agent 4 (Time Machine). Task A4-11, notebook/agent-4-panorama-plan.md sections 3.1 and 3.2.
 * Backend-agnostic and dependency-injected so it is unit tested without a network, fal or MongoDB. The wired-up
 * instance the app and worker use is in ./index.ts.
 */
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import type { MediaAsset, MediaBackend } from './types';

/** Length of a media id: hex characters of the SHA-256. 32 (128 bits) never collides at our scale. */
export const MEDIA_ID_LENGTH = 32;
/** Path prefix of a stored file's durable URL. The Era stores `/api/media/<id>` in place of the fal URL. */
export const MEDIA_URL_PREFIX = '/api/media/';
/**
 * How long a fal URL is assumed to live after we first see it. fal says at least 7 days (MASTER.md 5.3 rule 8);
 * 6 leaves a day of margin for a file that was a few hours old when persisted.
 */
export const FAL_URL_ASSUMED_LIFETIME_MS = 6 * 24 * 60 * 60 * 1000;
/** toFalUrl uploads again when the recorded fal URL has less than this left, so a long job never meets a dead link. */
export const FAL_URL_MIN_REMAINING_MS = 24 * 60 * 60 * 1000;
/** Largest file persistFromUrl accepts. A 45 s 720p talk clip is about 15 MB; this leaves room for 1080p. */
export const MAX_MEDIA_BYTES = 150 * 1024 * 1024;

const MEDIA_ID_PATTERN = new RegExp(`^[0-9a-f]{${MEDIA_ID_LENGTH}}$`);
/** Hosts fal serves generated and uploaded files from. */
const FAL_HOST_PATTERN = /(^|\.)fal\.(media|run|ai)$/i;

/** Content types by file extension, for a server that answers without a useful Content-Type. */
const TYPE_BY_EXTENSION: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
  svg: 'image/svg+xml',
  mp3: 'audio/mpeg',
  m4a: 'audio/mp4',
  wav: 'audio/wav',
  ogg: 'audio/ogg',
  webm: 'video/webm',
  mp4: 'video/mp4',
  mov: 'video/quicktime',
};

/**
 * Tell whether a string is a well-formed media id.
 *
 * @param id - Candidate id, for example from the route's path.
 * @returns True for MEDIA_ID_LENGTH lowercase hex characters.
 */
export function isMediaId(id: string): boolean {
  return MEDIA_ID_PATTERN.test(id);
}

/**
 * The durable URL the Era stores for a file.
 *
 * @param id - Media id.
 * @returns For example "/api/media/0123abcd...". Relative, so it works on any host the app is served from.
 */
export function mediaUrl(id: string): string {
  return `${MEDIA_URL_PREFIX}${id}`;
}

/**
 * Pull the media id out of one of our URLs, relative or absolute (any host, so a tunnel or deploy URL works).
 *
 * @param url - A URL as stored on an Era.
 * @returns The id, or null when the URL is not one of ours.
 * @example mediaIdFromUrl('/api/media/0123...') // '0123...'
 */
export function mediaIdFromUrl(url: string): string | null {
  let pathname = url;
  if (/^https?:\/\//i.test(url)) {
    try {
      pathname = new URL(url).pathname;
    } catch {
      return null;
    }
  }
  if (!pathname.startsWith(MEDIA_URL_PREFIX)) return null;
  const id = pathname.slice(MEDIA_URL_PREFIX.length).split(/[?#/]/)[0];
  return isMediaId(id) ? id : null;
}

/**
 * Tell whether a URL is served by fal's CDN.
 *
 * @param url - Any URL.
 * @returns True for http(s) URLs on fal.media, fal.run or fal.ai hosts.
 */
export function isFalUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return /^https?:$/.test(u.protocol) && FAL_HOST_PATTERN.test(u.hostname);
  } catch {
    return false;
  }
}

/**
 * Choose the content type to store.
 *
 * @param headerType - The Content-Type the source sent, or null.
 * @param urlOrPath - The source URL or file path, for its extension.
 * @returns A MIME type without parameters, `application/octet-stream` when nothing is known.
 */
export function contentTypeFor(headerType: string | null, urlOrPath: string): string {
  const fromHeader = headerType?.split(';')[0].trim().toLowerCase();
  if (fromHeader && fromHeader !== 'application/octet-stream' && fromHeader !== 'binary/octet-stream') return fromHeader;
  let pathname = urlOrPath;
  try {
    pathname = new URL(urlOrPath).pathname;
  } catch {
    // A path, not a URL.
  }
  const ext = pathname.match(/\.([a-z0-9]{2,5})$/i)?.[1]?.toLowerCase();
  return (ext && TYPE_BY_EXTENSION[ext]) || 'application/octet-stream';
}

/** What to record with a stored file. */
export interface PersistOptions {
  /** Era the file belongs to, or null for landmark-level files. */
  eraId: string | null;
  /** What it is, for example "panorama". */
  name: string;
  /** Overrides the detected content type. */
  contentType?: string;
  /**
   * When the source fal URL stops working. Undefined: now + FAL_URL_ASSUMED_LIFETIME_MS for a fal URL (right for a
   * file the pipeline has just made). Null: unknown, so toFalUrl uploads afresh (right for old eras).
   */
  falUrlExpiresAt?: string | null;
}

/** The result of storing a file. */
export interface PersistedMedia {
  /** Media id. */
  id: string;
  /** The durable URL to put on the Era: `/api/media/<id>`. */
  url: string;
  /** The ledger record. */
  asset: MediaAsset;
  /** False when the file was already stored (same source URL or same bytes): nothing was downloaded or written. */
  created: boolean;
}

/** What the store needs from the outside world. Injected so tests run without network, fal or a database. */
export interface MediaStoreDeps {
  backend: MediaBackend;
  /** Upload bytes to fal storage and return the public URL. In the app: uploadToFal from @/lib/fal. */
  uploadToFal: (file: Blob) => Promise<string>;
  /** fetch, for downloading sources. */
  fetch: typeof fetch;
  /** The clock. */
  now: () => Date;
  /** Folder that relative paths such as "/reference/queens-tower.jpg" are read from. In the app: ./public. */
  publicDir: string;
}

/** The store's operations. */
export interface MediaStore {
  /**
   * Keep a file we already hold as bytes.
   *
   * @param bytes - The file.
   * @param options - What to record. `sourceUrl` and `falUrl` are optional extras for the ledger.
   * @returns The stored file and its durable URL.
   */
  persistBytes(
    bytes: Uint8Array,
    options: PersistOptions & { sourceUrl?: string | null; falUrl?: string | null },
  ): Promise<PersistedMedia>;
  /**
   * Keep the file at a URL so it is never paid for twice and outlives fal's 7-day expiry.
   *
   * Accepts a fal (or any http/https) URL, which is downloaded once; a path under public/ such as
   * "/reference/queens-tower.jpg", which is read from disk; or one of our own `/api/media/<id>` URLs, which is
   * returned as is. A URL already persisted is not downloaded again.
   *
   * Side effects: one HTTP download (none on a repeat), one write to the backend.
   *
   * @param url - Where the file is now.
   * @param options - What to record.
   * @returns The stored file and its durable URL.
   * @throws Error when the download fails, the file is empty or over MAX_MEDIA_BYTES, or an /api/media id is unknown.
   */
  persistFromUrl(url: string, options: PersistOptions): Promise<PersistedMedia>;
  /**
   * Turn any URL into one a fal model can fetch.
   *
   * Our own `/api/media/<id>` URLs give the recorded fal copy while it has more than FAL_URL_MIN_REMAINING_MS
   * left, otherwise the bytes are uploaded to fal storage again (free) and the new URL recorded. A path under
   * public/ (the seeded reference photo) is stored first, then handled the same way, so it is uploaded once per
   * week rather than once per era. Any other http(s) URL is returned unchanged.
   *
   * Side effects: at most one fal storage upload (free, about 2 s for 1 MB).
   *
   * @param url - A URL from an Era or a Landmark.
   * @returns A public URL fal can read.
   * @throws Error for an SVG (models cannot read it), an unknown media id, or a failed upload.
   */
  toFalUrl(url: string): Promise<string>;
  /**
   * Look up a stored file's record.
   *
   * @param id - Media id.
   * @returns The record, or null.
   */
  getAsset(id: string): Promise<MediaAsset | null>;
}

/** Read a response body into bytes, refusing anything over MAX_MEDIA_BYTES. */
async function readCapped(response: Response, url: string): Promise<Uint8Array> {
  const declared = Number(response.headers.get('content-length'));
  if (declared > MAX_MEDIA_BYTES) throw new Error(`${url} is ${declared} bytes, over the ${MAX_MEDIA_BYTES} limit`);
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.byteLength > MAX_MEDIA_BYTES) throw new Error(`${url} is over the ${MAX_MEDIA_BYTES} byte limit`);
  return bytes;
}

/**
 * Resolve a site path to a file under publicDir, refusing anything that climbs out of it.
 *
 * @param publicDir - The public folder.
 * @param sitePath - For example "/reference/queens-tower.jpg".
 * @returns Absolute file path.
 * @throws Error on a path outside publicDir.
 */
function publicFile(publicDir: string, sitePath: string): string {
  const root = path.resolve(publicDir);
  const file = path.resolve(root, `.${decodeURIComponent(sitePath.split(/[?#]/)[0])}`);
  if (file !== root && !file.startsWith(root + path.sep)) throw new Error(`Path "${sitePath}" is outside public/`);
  return file;
}

/**
 * Build a media store over a backend.
 *
 * @param deps - Backend, fal upload, fetch, clock and public folder.
 * @returns The store.
 */
export function createMediaStore(deps: MediaStoreDeps): MediaStore {
  const { backend } = deps;
  const iso = (ms: number): string => new Date(ms).toISOString();

  const persistBytes: MediaStore['persistBytes'] = async (bytes, options) => {
    if (bytes.byteLength === 0) throw new Error(`Refusing to store an empty file for ${options.name}`);
    const sha256 = createHash('sha256').update(bytes).digest('hex');
    const id = sha256.slice(0, MEDIA_ID_LENGTH);
    const existing = await backend.get(id);
    if (existing) return { id, url: mediaUrl(id), asset: existing, created: false };
    const asset: MediaAsset = {
      id,
      eraId: options.eraId,
      name: options.name,
      contentType: options.contentType ?? 'application/octet-stream',
      bytes: bytes.byteLength,
      sha256,
      sourceUrl: options.sourceUrl ?? null,
      falUrl: options.falUrl ?? null,
      falUrlExpiresAt: options.falUrl ? (options.falUrlExpiresAt ?? null) : null,
      createdAt: deps.now().toISOString(),
    };
    await backend.put(asset, bytes);
    return { id, url: mediaUrl(id), asset, created: true };
  };

  const persistFromUrl: MediaStore['persistFromUrl'] = async (url, options) => {
    const ownId = mediaIdFromUrl(url);
    if (ownId) {
      const asset = await backend.get(ownId);
      if (!asset) throw new Error(`No stored media "${ownId}"`);
      return { id: ownId, url: mediaUrl(ownId), asset, created: false };
    }
    const already = await backend.findBySourceUrl(url);
    if (already) return { id: already.id, url: mediaUrl(already.id), asset: already, created: false };

    if (url.startsWith('/')) {
      const file = publicFile(deps.publicDir, url);
      // The path is checked to stay under public/; the comment stops Turbopack tracing the whole project.
      const bytes = new Uint8Array(await readFile(/*turbopackIgnore: true*/ file));
      return persistBytes(bytes, { ...options, contentType: options.contentType ?? contentTypeFor(null, file), sourceUrl: url });
    }
    if (!/^https?:\/\//i.test(url)) throw new Error(`Cannot persist "${url.slice(0, 60)}": not an http(s) URL or a site path`);

    const response = await deps.fetch(url);
    if (!response.ok) throw new Error(`Download of ${url} failed with HTTP ${response.status}`);
    const bytes = await readCapped(response, url);
    const fal = isFalUrl(url);
    return persistBytes(bytes, {
      ...options,
      contentType: options.contentType ?? contentTypeFor(response.headers.get('content-type'), url),
      sourceUrl: url,
      falUrl: fal ? url : null,
      falUrlExpiresAt: fal
        ? options.falUrlExpiresAt === undefined
          ? iso(deps.now().getTime() + FAL_URL_ASSUMED_LIFETIME_MS)
          : options.falUrlExpiresAt
        : null,
    });
  };

  /** Return a live fal URL for a stored file, uploading again when the recorded one is missing or nearly expired. */
  async function falUrlForStored(id: string): Promise<string> {
    const asset = await backend.get(id);
    if (!asset) throw new Error(`No stored media "${id}"`);
    if (asset.contentType === 'image/svg+xml') throw new Error(`Media ${id} is an SVG, which fal models cannot read`);
    const now = deps.now().getTime();
    const expires = asset.falUrlExpiresAt ? Date.parse(asset.falUrlExpiresAt) : 0;
    if (asset.falUrl && expires - now > FAL_URL_MIN_REMAINING_MS) return asset.falUrl;

    const stream = await backend.read(id);
    const bytes = new Uint8Array(await new Response(stream).arrayBuffer());
    const falUrl = await deps.uploadToFal(new Blob([bytes], { type: asset.contentType }));
    await backend.setFalUrl(id, falUrl, iso(now + FAL_URL_ASSUMED_LIFETIME_MS));
    return falUrl;
  }

  const toFalUrl: MediaStore['toFalUrl'] = async (url) => {
    const ownId = mediaIdFromUrl(url);
    if (ownId) return falUrlForStored(ownId);
    if (url.startsWith('/')) {
      if (/\.svg($|[?#])/i.test(url)) throw new Error(`"${url}" is an SVG, which fal models cannot read. Use a JPEG reference photo.`);
      const stored = await persistFromUrl(url, { eraId: null, name: path.posix.basename(url.split(/[?#]/)[0]) });
      return falUrlForStored(stored.id);
    }
    return url;
  };

  return { persistBytes, persistFromUrl, toFalUrl, getAsset: (id) => backend.get(id) };
}
