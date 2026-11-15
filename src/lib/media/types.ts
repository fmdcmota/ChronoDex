/**
 * Types for the generated-media store: the ledger record and the storage backend interface.
 *
 * Owner: Agent 4 (Time Machine), by the human's grant (MASTER.md section 3, 15 Nov 2026).
 * Implements notebook/agent-4-panorama-plan.md section 3.1, task A4-11.
 */

/**
 * One stored file, as recorded in the `media_assets` ledger.
 *
 * The id is content-addressed (the first MEDIA_ID_LENGTH hex characters of the SHA-256 of the bytes), so the same
 * file stored twice is one record, and the id doubles as a strong ETag.
 */
export interface MediaAsset {
  /** Lowercase hex, MEDIA_ID_LENGTH characters. Also the GridFS file id and the folder file name. */
  id: string;
  /** Era the file was first made for, or null for landmark-level files (the reference photo). */
  eraId: string | null;
  /** What it is, for example "panorama", "narration" or "walk_on". For logs and the persist script. */
  name: string;
  /** MIME type served with the file, for example "image/jpeg". */
  contentType: string;
  /** Size in bytes. */
  bytes: number;
  /** Full SHA-256 of the bytes, lowercase hex. */
  sha256: string;
  /** Where the bytes were downloaded from (a fal CDN URL, or a /public path), or null when given as bytes. */
  sourceUrl: string | null;
  /** A public URL on fal's CDN holding the same bytes, for feeding the file back to a model, or null. */
  falUrl: string | null;
  /** ISO 8601. After this the falUrl may be gone. Null when unknown: toFalUrl then uploads again. */
  falUrlExpiresAt: string | null;
  /** ISO 8601, UTC. */
  createdAt: string;
}

/** An inclusive byte range, as in an HTTP `Range: bytes=start-end` header. */
export interface ByteRange {
  start: number;
  /** Inclusive. */
  end: number;
}

/**
 * Where the bytes and the ledger live. Three implementations: GridFS on Atlas (./backends/gridfs.ts), a local
 * folder (./backends/folder.ts) and memory (./backends/memory.ts, tests).
 */
export interface MediaBackend {
  /** Short name for logs: "gridfs", "folder" or "memory". */
  readonly kind: string;
  /**
   * Look up a ledger record.
   *
   * @param id - Media id.
   * @returns The record, or null.
   */
  get(id: string): Promise<MediaAsset | null>;
  /**
   * Find the record made from a source URL, so a URL is never downloaded twice.
   *
   * @param sourceUrl - The URL exactly as given to persistFromUrl.
   * @returns The record, or null.
   */
  findBySourceUrl(sourceUrl: string): Promise<MediaAsset | null>;
  /**
   * Store the bytes and the record. A no-op when the id already exists (content-addressed, so same bytes).
   *
   * @param asset - The record. `asset.bytes` must equal `bytes.byteLength`.
   * @param bytes - The file.
   */
  put(asset: MediaAsset, bytes: Uint8Array): Promise<void>;
  /**
   * Stream the file, or part of it.
   *
   * @param id - Media id. Must exist.
   * @param range - Inclusive byte range, or undefined for the whole file.
   * @returns A web stream of the bytes.
   */
  read(id: string, range?: ByteRange): Promise<ReadableStream<Uint8Array>>;
  /**
   * Record a fal CDN copy of the file.
   *
   * @param id - Media id.
   * @param falUrl - Public fal URL.
   * @param expiresAt - ISO 8601 time after which it may be gone.
   */
  setFalUrl(id: string, falUrl: string, expiresAt: string): Promise<void>;
}
