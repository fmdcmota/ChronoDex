/**
 * GridFS media backend: bytes in the GridFS bucket `media`, ledger in the collection `media_assets`, both in the
 * Atlas database the app already uses (MONGODB_URI, MONGODB_DB).
 *
 * Owner: Agent 4 (Time Machine). Task A4-11, notebook/agent-4-panorama-plan.md section 3.1.
 *
 * Why GridFS: it works wherever the app and the worker run (laptop with a tunnel, or Vercel) with no new account
 * or key. One era without video is about 3.6 MB, so 20 eras fit easily in the free tier's 512 MB.
 * Why its own client: src/lib/db (Agent 1) exposes collections, not the Db, and its file is not ours to change.
 * A second small pool is cheap; Atlas free tier allows 500 connections.
 */
import { GridFSBucket, MongoClient, MongoServerError, type Collection, type Db } from 'mongodb';
import { Readable } from 'node:stream';
import type { ByteRange, MediaAsset, MediaBackend } from '../types';

/** GridFS bucket name. Its collections are `media.files` and `media.chunks`. */
export const MEDIA_BUCKET = 'media';
/** Ledger collection name. */
export const MEDIA_ASSETS_COLLECTION = 'media_assets';
/** Database name when MONGODB_DB is not set. Same default as src/lib/db. */
const DEFAULT_DB_NAME = 'chronodex_dev';
/** Small pool: the media route streams files, which is short work. */
const MAX_POOL_SIZE = 5;
/** Fail fast when Atlas is unreachable. Same value as src/lib/db. */
const SERVER_SELECTION_TIMEOUT_MS = 8000;
/** MongoDB's duplicate-key error code. */
const DUPLICATE_KEY_ERROR = 11000;

type AssetDoc = MediaAsset & { _id: string };

interface MediaMongo {
  db: Db;
  assets: Collection<AssetDoc>;
  bucket: GridFSBucket;
}

const GLOBAL_KEY = '__chronodexMediaMongo';

/** Connect once per process (cached on globalThis for hot reloads) and create the ledger's index. */
function connect(uri: string): Promise<MediaMongo> {
  const g = globalThis as typeof globalThis & { [GLOBAL_KEY]?: Promise<MediaMongo> };
  g[GLOBAL_KEY] ??= (async () => {
    const client = new MongoClient(uri, {
      maxPoolSize: MAX_POOL_SIZE,
      serverSelectionTimeoutMS: SERVER_SELECTION_TIMEOUT_MS,
      ignoreUndefined: true,
      appName: 'chronodex-media',
    });
    await client.connect();
    const db = client.db(process.env.MONGODB_DB || DEFAULT_DB_NAME);
    const assets = db.collection<AssetDoc>(MEDIA_ASSETS_COLLECTION);
    await assets.createIndex({ sourceUrl: 1 });
    return { db, assets, bucket: new GridFSBucket(db, { bucketName: MEDIA_BUCKET }) };
  })().catch((error) => {
    // Let the next call try again instead of caching the failure for the life of the process.
    delete g[GLOBAL_KEY];
    throw error;
  });
  return g[GLOBAL_KEY];
}

/** Strip `_id` from a stored record. */
function fromDoc(doc: AssetDoc | null): MediaAsset | null {
  if (!doc) return null;
  const { _id: _ignored, ...asset } = doc;
  return asset;
}

/** True for a duplicate-key error, which here means another process stored the same bytes first. */
function isDuplicate(error: unknown): boolean {
  return error instanceof MongoServerError && error.code === DUPLICATE_KEY_ERROR;
}

/**
 * Create a backend on GridFS.
 *
 * Side effects: the first call opens a connection pool and creates an index on `media_assets.sourceUrl`.
 *
 * @param uri - MongoDB connection string (MONGODB_URI).
 * @returns The backend.
 */
export function createGridFsBackend(uri: string): MediaBackend {
  return {
    kind: 'gridfs',
    async get(id) {
      const { assets } = await connect(uri);
      return fromDoc(await assets.findOne({ _id: id }));
    },
    async findBySourceUrl(sourceUrl) {
      const { assets } = await connect(uri);
      return fromDoc(await assets.findOne({ sourceUrl }));
    },
    async put(asset, bytes) {
      const { assets, bucket } = await connect(uri);
      if (await assets.findOne({ _id: asset.id }, { projection: { _id: 1 } })) return;
      try {
        await new Promise<void>((resolve, reject) => {
          // The driver types GridFS ids as ObjectId, but any _id value works; ours is the content hash.
          const upload = bucket.openUploadStreamWithId(asset.id as never,`${asset.name}-${asset.id}`, {
            metadata: { contentType: asset.contentType, eraId: asset.eraId },
          });
          upload.once('error', reject);
          upload.once('finish', () => resolve());
          upload.end(Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength));
        });
      } catch (error) {
        if (!isDuplicate(error)) throw error;
      }
      // Bytes first, record last: a record always points at a complete file.
      try {
        await assets.insertOne({ _id: asset.id, ...asset });
      } catch (error) {
        if (!isDuplicate(error)) throw error;
      }
    },
    async read(id, range?: ByteRange) {
      const { bucket } = await connect(uri);
      // GridFS's `end` is exclusive; ours is inclusive like HTTP.
      const stream = bucket.openDownloadStream(id as never, range ? { start: range.start, end: range.end + 1 } : undefined);
      return Readable.toWeb(stream) as ReadableStream<Uint8Array>;
    },
    async setFalUrl(id, falUrl, expiresAt) {
      const { assets } = await connect(uri);
      await assets.updateOne({ _id: id }, { $set: { falUrl, falUrlExpiresAt: expiresAt } });
    },
  };
}
