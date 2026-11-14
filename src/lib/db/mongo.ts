/**
 * MongoDB Atlas connection, collection shapes and indexes. Server and worker only.
 *
 * Owner: Agent 1 (Core). Implements MASTER.md sections 2 and 4.4, task A1-08.
 *
 * Every document uses the domain id as `_id` (landmark id, era id, job id, capture id), so lookups
 * need no secondary index. Readers strip the storage-only fields with the `from*Doc` helpers, so
 * nothing outside this directory ever sees `_id`, `photoSpotGeo`, `active` or `workerId`.
 */
import { MongoClient, MongoServerError, type Collection, type Db } from 'mongodb';
import type { Capture, Era, Job, Landmark } from '@/lib/contracts';

/** MongoDB's error code for a unique index violation. */
export const DUPLICATE_KEY_ERROR = 11000;

/** GeoJSON point. Note the order: [lng, lat]. Only this directory and map code use it. */
export interface GeoPoint {
  type: 'Point';
  coordinates: [number, number];
}

/**
 * A landmark as stored: plus `_id`, a GeoJSON copy of photoSpot for the 2dsphere index, and
 * `seedOrder` (its position in the seed list), because MongoDB's natural order is not guaranteed.
 */
export type LandmarkDoc = Landmark & { _id: string; photoSpotGeo: GeoPoint; seedOrder: number };
/** An era as stored. */
export type EraDoc = Era & { _id: string };
/** A capture as stored. */
export type CaptureDoc = Capture & { _id: string };
/**
 * A job as stored. `active` is true while the job is queued or running and is removed when it
 * finishes: a unique partial index on `{ eraId }` where `active` is true allows one active job per era.
 */
export type JobDoc = Job & { _id: string; active?: true; workerId?: string };

/** The four collections. */
export interface Collections {
  landmarks: Collection<LandmarkDoc>;
  eras: Collection<EraDoc>;
  captures: Collection<CaptureDoc>;
  jobs: Collection<JobDoc>;
}

interface MongoState {
  client: MongoClient;
  ready: Promise<Collections>;
}

const GLOBAL_KEY = '__chronodexMongo';
/** Database name when MONGODB_DB is not set. */
const DEFAULT_DB_NAME = 'chronodex_dev';
/** Small pool: serverless functions each hold their own, and Atlas free tier allows 500 connections. */
const MAX_POOL_SIZE = 10;
/** Fail fast when Atlas is unreachable instead of hanging a request for 30 s. */
const SERVER_SELECTION_TIMEOUT_MS = 8000;

/**
 * Tell whether MongoDB is configured. When it is not, src/lib/db and src/lib/jobs use the
 * in-memory store, which is fine for local development and tests but loses data on restart.
 *
 * @returns True when MONGODB_URI is set.
 */
export function mongoConfigured(): boolean {
  return Boolean(process.env.MONGODB_URI);
}

/**
 * Connect once per process and return the collections, creating indexes on first use.
 *
 * The client is cached on globalThis so Next.js hot reloads and serverless warm starts reuse it.
 * Side effects: opens a connection pool; the first call also creates indexes (idempotent).
 *
 * @returns The collections.
 * @throws Error when MONGODB_URI is not set, or the server cannot be reached.
 */
export function collections(): Promise<Collections> {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is not set');
  const g = globalThis as typeof globalThis & { [GLOBAL_KEY]?: MongoState };
  if (!g[GLOBAL_KEY]) {
    const client = new MongoClient(uri, {
      maxPoolSize: MAX_POOL_SIZE,
      serverSelectionTimeoutMS: SERVER_SELECTION_TIMEOUT_MS,
      // Leave undefined fields out instead of writing them as null.
      ignoreUndefined: true,
      appName: 'chronodex',
    });
    const ready = client.connect().then(async () => {
      const db = client.db(process.env.MONGODB_DB || DEFAULT_DB_NAME);
      const cols = collectionsOf(db);
      await ensureIndexes(cols);
      return cols;
    });
    // A failed connection must not be cached for ever: the next call retries.
    ready.catch(() => {
      if (g[GLOBAL_KEY]?.ready === ready) delete g[GLOBAL_KEY];
    });
    g[GLOBAL_KEY] = { client, ready };
  }
  return g[GLOBAL_KEY].ready;
}

/**
 * Close the cached connection. Scripts call this before exiting so Node does not hang.
 *
 * @returns Resolves when closed. Does nothing when no connection was opened.
 */
export async function closeMongo(): Promise<void> {
  const g = globalThis as typeof globalThis & { [GLOBAL_KEY]?: MongoState };
  const state = g[GLOBAL_KEY];
  delete g[GLOBAL_KEY];
  if (state) await state.client.close();
}

/** The typed collections of a database. */
function collectionsOf(db: Db): Collections {
  return {
    landmarks: db.collection<LandmarkDoc>('landmarks'),
    eras: db.collection<EraDoc>('eras'),
    captures: db.collection<CaptureDoc>('captures'),
    jobs: db.collection<JobDoc>('jobs'),
  };
}

/**
 * Create every index the app relies on. Safe to run repeatedly.
 *
 * @param cols - The collections.
 */
async function ensureIndexes(cols: Collections): Promise<void> {
  await Promise.all([
    // "What is near me" (MASTER.md section 2).
    cols.landmarks.createIndex({ photoSpotGeo: '2dsphere' }, { name: 'photoSpotGeo_2dsphere' }),
    cols.landmarks.createIndex({ seedOrder: 1 }, { name: 'seed_order' }),
    cols.eras.createIndex({ landmarkId: 1, year: 1 }, { name: 'landmark_year', unique: true }),
    // One capture per player per landmark: a second capture returns the first.
    cols.captures.createIndex({ playerId: 1, landmarkId: 1 }, { name: 'player_landmark', unique: true }),
    // One active job per era, so fal is never paid twice for the same era.
    cols.jobs.createIndex(
      { eraId: 1 },
      { name: 'one_active_job_per_era', unique: true, partialFilterExpression: { active: { $eq: true } } },
    ),
    cols.jobs.createIndex({ state: 1, createdAt: 1 }, { name: 'claim_order' }),
  ]);
}

/**
 * Tell whether an error is a unique index violation.
 *
 * @param err - Anything thrown by the driver.
 * @returns True for MongoDB error 11000.
 */
export function isDuplicateKeyError(err: unknown): boolean {
  return err instanceof MongoServerError && err.code === DUPLICATE_KEY_ERROR;
}

/**
 * Convert a LatLng to GeoJSON.
 *
 * @param point - WGS84 degrees.
 * @param point.lat - Latitude.
 * @param point.lng - Longitude.
 * @returns A GeoJSON point, [lng, lat].
 */
export function toGeoPoint(point: { lat: number; lng: number }): GeoPoint {
  return { type: 'Point', coordinates: [point.lng, point.lat] };
}

/**
 * Landmark to stored document.
 *
 * @param landmark - The landmark.
 * @param seedOrder - Its position in the seed list. listLandmarks sorts by it.
 * @returns The document.
 */
export function toLandmarkDoc(landmark: Landmark, seedOrder: number): LandmarkDoc {
  return { ...landmark, _id: landmark.id, photoSpotGeo: toGeoPoint(landmark.photoSpot), seedOrder };
}

/**
 * Stored document to landmark.
 *
 * @param doc - The document.
 * @returns The landmark without storage fields.
 */
export function fromLandmarkDoc(doc: LandmarkDoc): Landmark {
  const { _id, photoSpotGeo, seedOrder, ...landmark } = doc;
  void _id;
  void photoSpotGeo;
  void seedOrder;
  return landmark;
}

/**
 * Stored document to era.
 *
 * @param doc - The document.
 * @returns The era without `_id`.
 */
export function fromEraDoc(doc: EraDoc): Era {
  const { _id, ...era } = doc;
  void _id;
  return era;
}

/**
 * Stored document to capture.
 *
 * @param doc - The document.
 * @returns The capture without `_id`.
 */
export function fromCaptureDoc(doc: CaptureDoc): Capture {
  const { _id, ...capture } = doc;
  void _id;
  return capture;
}

/**
 * Stored document to job.
 *
 * @param doc - The document.
 * @returns The job without storage fields.
 */
export function fromJobDoc(doc: JobDoc): Job {
  const { _id, active, workerId, ...job } = doc;
  void _id;
  void active;
  void workerId;
  return job;
}
