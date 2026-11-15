/**
 * Data access for landmarks, eras and captures. Server and worker only.
 *
 * Owner: Agent 1 (Core). Implements MASTER.md section 4.4 (src/lib/db), task A1-08.
 *
 * Two backends behind one set of functions:
 * - MongoDB Atlas when MONGODB_URI is set (./mongo.ts).
 * - An in-memory store seeded from fixtures/ otherwise, for local development and tests. It lives
 *   on globalThis so it survives Next.js hot reloads, but not a restart. On Vercel a missing
 *   MONGODB_URI is an error rather than a silent fallback.
 * Every function returns copies: changing a result never changes the store.
 */
import type { Capture, Era, EraId, Landmark, LandmarkId } from '@/lib/contracts';
import { eras as fixtureEras, landmarks as fixtureLandmarks } from '@fixtures/index';
import {
  collections,
  fromCaptureDoc,
  fromEraDoc,
  fromLandmarkDoc,
  isDuplicateKeyError,
  mongoConfigured,
  toLandmarkDoc,
} from './mongo';

import { withDemoEras, withDemoLandmarks } from '@/lib/demo';
export { closeMongo, mongoConfigured } from './mongo';

// ---------------------------------------------------------------------------
// Backend choice and the in-memory store
// ---------------------------------------------------------------------------

/**
 * Tell whether to use MongoDB.
 *
 * @returns True when MONGODB_URI is set.
 * @throws Error on Vercel (the platform sets VERCEL=1) when MONGODB_URI is missing, so a deploy
 *   without a database fails loudly instead of losing every capture on the next cold start.
 */
export function usingMongo(): boolean {
  if (mongoConfigured()) return true;
  if (process.env.VERCEL) throw new Error('MONGODB_URI must be set on Vercel');
  return false;
}

interface MemoryDb {
  landmarks: Landmark[];
  eras: Map<EraId, Era>;
  captures: Capture[];
}

const GLOBAL_KEY = '__chronodexMemoryDb';

/** The in-memory store, created from fixtures and the demo set on first use. */
function memory(): MemoryDb {
  const g = globalThis as typeof globalThis & { [GLOBAL_KEY]?: MemoryDb };
  g[GLOBAL_KEY] ??= {
    // The kept demo set (src/lib/demo) over the fixtures, so a run with no database shows real eras.
    landmarks: withDemoLandmarks(fixtureLandmarks),
    eras: new Map(withDemoEras(fixtureEras).map((era) => [era.id, era])),
    captures: [],
  };
  return g[GLOBAL_KEY];
}

/**
 * Throw away the in-memory store so the next call starts again from fixtures. Tests only.
 * Has no effect on MongoDB.
 */
export function resetMemoryDb(): void {
  delete (globalThis as typeof globalThis & { [GLOBAL_KEY]?: MemoryDb })[GLOBAL_KEY];
}

/** Fields of an Era that identify it and can never be patched. */
const IMMUTABLE_ERA_FIELDS = ['id', 'landmarkId', 'year'] as const;

/**
 * Remove identity fields and undefined values from an era patch.
 *
 * @param patch - The caller's patch.
 * @returns A cleaned copy.
 */
function cleanEraPatch(patch: Partial<Era>): Partial<Era> {
  const clean: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(patch)) {
    if (value !== undefined && !(IMMUTABLE_ERA_FIELDS as readonly string[]).includes(key)) {
      clean[key] = structuredClone(value);
    }
  }
  return clean as Partial<Era>;
}

// ---------------------------------------------------------------------------
// Landmarks
// ---------------------------------------------------------------------------

/**
 * List every landmark.
 *
 * @returns Landmarks in seed order (the route order of MASTER.md section 12).
 */
export async function listLandmarks(): Promise<Landmark[]> {
  if (!usingMongo()) return structuredClone(memory().landmarks);
  const { landmarks } = await collections();
  const docs = await landmarks.find({}).sort({ seedOrder: 1 }).toArray();
  return docs.map(fromLandmarkDoc);
}

/**
 * Get one landmark.
 *
 * @param id - Landmark id.
 * @returns The landmark, or null when there is none with that id.
 */
export async function getLandmark(id: LandmarkId): Promise<Landmark | null> {
  if (!usingMongo()) {
    const landmark = memory().landmarks.find((l) => l.id === id);
    return landmark ? structuredClone(landmark) : null;
  }
  const { landmarks } = await collections();
  const doc = await landmarks.findOne({ _id: id });
  return doc ? fromLandmarkDoc(doc) : null;
}

/**
 * Create or fully replace a landmark. Used by scripts/seed.ts.
 *
 * @param landmark - The landmark, already validated.
 * @param seedOrder - Its position in the seed list; listLandmarks returns landmarks in this order.
 * @returns Resolves when written.
 */
export async function upsertLandmark(landmark: Landmark, seedOrder: number): Promise<void> {
  if (!usingMongo()) {
    const store = memory();
    const i = store.landmarks.findIndex((l) => l.id === landmark.id);
    if (i === -1) store.landmarks.push(structuredClone(landmark));
    else store.landmarks[i] = structuredClone(landmark);
    return;
  }
  const { landmarks } = await collections();
  // replaceOne keeps _id from the filter; the replacement must not change it, and it does not.
  await landmarks.replaceOne({ _id: landmark.id }, toLandmarkDoc(landmark, seedOrder), { upsert: true });
}

// ---------------------------------------------------------------------------
// Eras
// ---------------------------------------------------------------------------

/**
 * Get one era.
 *
 * @param id - Era id, built with eraIdOf.
 * @returns The era, or null when there is none with that id.
 */
export async function getEra(id: EraId): Promise<Era | null> {
  if (!usingMongo()) {
    const era = memory().eras.get(id);
    return era ? structuredClone(era) : null;
  }
  const { eras } = await collections();
  const doc = await eras.findOne({ _id: id });
  return doc ? fromEraDoc(doc) : null;
}

/**
 * List a landmark's eras, ascending by year.
 *
 * @param landmarkId - Landmark id.
 * @returns The eras. Empty when the landmark has none or does not exist.
 */
export async function listEras(landmarkId: LandmarkId): Promise<Era[]> {
  if (!usingMongo()) {
    return [...memory().eras.values()]
      .filter((era) => era.landmarkId === landmarkId)
      .sort((a, b) => a.year - b.year)
      .map((era) => structuredClone(era));
  }
  const { eras } = await collections();
  const docs = await eras.find({ landmarkId }).sort({ year: 1 }).toArray();
  return docs.map(fromEraDoc);
}

/**
 * Insert an era only if it does not exist yet. Used by scripts/seed.ts, so re-seeding never
 * wipes generated content.
 *
 * @param era - The era to insert.
 * @returns True when it was inserted, false when it already existed.
 */
export async function insertEraIfMissing(era: Era): Promise<boolean> {
  if (!usingMongo()) {
    const store = memory();
    if (store.eras.has(era.id)) return false;
    store.eras.set(era.id, structuredClone(era));
    return true;
  }
  const { eras } = await collections();
  // The upsert takes _id from the filter, so $setOnInsert must not repeat it.
  const result = await eras.updateOne({ _id: era.id }, { $setOnInsert: era }, { upsert: true });
  return result.upsertedCount === 1;
}

/**
 * Update some fields of an era. The pipeline calls this the moment each asset exists.
 *
 * `id`, `landmarkId` and `year` are ignored if present, and so are undefined values.
 * `updatedAt` is always set to now. Nested objects (guide, panorama, ...) are replaced whole, not
 * merged: to set the headshot, pass the whole guide.
 *
 * @param id - Era id.
 * @param patch - Fields to set.
 * @returns The era after the update.
 * @throws Error when there is no era with that id.
 */
export async function patchEra(id: EraId, patch: Partial<Era>): Promise<Era> {
  const clean = { ...cleanEraPatch(patch), updatedAt: new Date().toISOString() };
  if (!usingMongo()) {
    const store = memory();
    const era = store.eras.get(id);
    if (!era) throw new Error(`patchEra: no era "${id}"`);
    const updated: Era = { ...era, ...clean };
    store.eras.set(id, updated);
    return structuredClone(updated);
  }
  const { eras } = await collections();
  const doc = await eras.findOneAndUpdate({ _id: id }, { $set: clean }, { returnDocument: 'after' });
  if (!doc) throw new Error(`patchEra: no era "${id}"`);
  return fromEraDoc(doc);
}

// ---------------------------------------------------------------------------
// Captures
// ---------------------------------------------------------------------------

/**
 * List a player's captures, oldest first.
 *
 * @param playerId - The anonymous player id.
 * @returns The captures. Empty for an unknown player.
 */
export async function listCaptures(playerId: string): Promise<Capture[]> {
  if (!usingMongo()) {
    return memory()
      .captures.filter((c) => c.playerId === playerId)
      .sort((a, b) => a.capturedAt.localeCompare(b.capturedAt))
      .map((c) => structuredClone(c));
  }
  const { captures } = await collections();
  const docs = await captures.find({ playerId }).sort({ capturedAt: 1 }).toArray();
  return docs.map(fromCaptureDoc);
}

/**
 * Record a capture, unless the player already has one for that landmark.
 *
 * A player keeps their first photo of a landmark. Two captures racing for the same landmark are
 * settled by the unique index on (playerId, landmarkId).
 *
 * @param capture - The new capture, already checked against the capture rule.
 * @returns The stored capture (the earlier one when it already existed) and whether it already existed.
 */
export async function insertCapture(capture: Capture): Promise<{ capture: Capture; alreadyCollected: boolean }> {
  if (!usingMongo()) {
    const store = memory();
    const existing = store.captures.find((c) => c.playerId === capture.playerId && c.landmarkId === capture.landmarkId);
    if (existing) return { capture: structuredClone(existing), alreadyCollected: true };
    store.captures.push(structuredClone(capture));
    return { capture: structuredClone(capture), alreadyCollected: false };
  }
  const { captures } = await collections();
  try {
    await captures.insertOne({ ...capture, _id: capture.id });
    return { capture, alreadyCollected: false };
  } catch (err) {
    if (!isDuplicateKeyError(err)) throw err;
    const existing = await captures.findOne({ playerId: capture.playerId, landmarkId: capture.landmarkId });
    if (!existing) throw err;
    return { capture: fromCaptureDoc(existing), alreadyCollected: true };
  }
}
