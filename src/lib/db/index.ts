/**
 * Data access for landmarks and eras. Server and worker only.
 *
 * Owner: Agent 1 (Core). Implements MASTER.md section 4.4 (src/lib/db).
 *
 * M0 STUB: an in-memory store seeded from fixtures/. It has the final signatures, so callers
 * (API routes, Agent 2's pipeline) can be written now. TODO(agent-1): A1-08 replaces the bodies
 * with MongoDB Atlas (collections landmarks, eras, captures, jobs; 2dsphere index on photoSpot).
 * State lives on globalThis so it survives Next.js hot reloads, but not a server restart.
 */
import type { Era, EraId, Landmark, LandmarkId } from '@/lib/contracts';
import { eras as fixtureEras, landmarks as fixtureLandmarks } from '@fixtures/index';

interface MemoryDb {
  landmarks: Landmark[];
  eras: Map<EraId, Era>;
}

const GLOBAL_KEY = '__chronodexMemoryDb';

/** The in-memory store, created on first use. */
function memory(): MemoryDb {
  const g = globalThis as typeof globalThis & { [GLOBAL_KEY]?: MemoryDb };
  g[GLOBAL_KEY] ??= {
    landmarks: structuredClone(fixtureLandmarks),
    eras: new Map(structuredClone(fixtureEras).map((era) => [era.id, era])),
  };
  return g[GLOBAL_KEY];
}

/** Fields of an Era that identify it and can never be patched. */
const IMMUTABLE_ERA_FIELDS = ['id', 'landmarkId', 'year'] as const;

/**
 * List every landmark.
 *
 * @returns Landmarks in route order. Copies: changing them does not change the store.
 */
export async function listLandmarks(): Promise<Landmark[]> {
  return structuredClone(memory().landmarks);
}

/**
 * Get one landmark.
 *
 * @param id - Landmark id.
 * @returns The landmark, or null when there is none with that id.
 */
export async function getLandmark(id: LandmarkId): Promise<Landmark | null> {
  const landmark = memory().landmarks.find((l) => l.id === id);
  return landmark ? structuredClone(landmark) : null;
}

/**
 * Get one era.
 *
 * @param id - Era id, built with eraIdOf.
 * @returns The era, or null when there is none with that id.
 */
export async function getEra(id: EraId): Promise<Era | null> {
  const era = memory().eras.get(id);
  return era ? structuredClone(era) : null;
}

/**
 * List a landmark's eras, one per entry in its eraYears, ascending by year.
 *
 * @param landmarkId - Landmark id.
 * @returns The eras. Empty when the landmark has none or does not exist.
 */
export async function listEras(landmarkId: LandmarkId): Promise<Era[]> {
  return [...memory().eras.values()]
    .filter((era) => era.landmarkId === landmarkId)
    .sort((a, b) => a.year - b.year)
    .map((era) => structuredClone(era));
}

/**
 * Update some fields of an era. The pipeline calls this the moment each asset exists.
 *
 * `id`, `landmarkId` and `year` are ignored if present. `updatedAt` is always set to now.
 * Nested objects (guide, panorama, ...) are replaced whole, not merged.
 *
 * @param id - Era id.
 * @param patch - Fields to set.
 * @returns The era after the update.
 * @throws Error when there is no era with that id.
 */
export async function patchEra(id: EraId, patch: Partial<Era>): Promise<Era> {
  const store = memory();
  const era = store.eras.get(id);
  if (!era) throw new Error(`patchEra: no era "${id}"`);
  const clean: Partial<Era> = structuredClone(patch);
  for (const field of IMMUTABLE_ERA_FIELDS) delete clean[field];
  const updated: Era = { ...era, ...clean, updatedAt: new Date().toISOString() };
  store.eras.set(id, updated);
  return structuredClone(updated);
}
