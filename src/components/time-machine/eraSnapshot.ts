/**
 * The last ready copy of each era, kept in localStorage so a second visit shows the year at once.
 *
 * Owner: Agent 4. Task A4-14, notebook/agent-4-panorama-plan.md section 3.3.
 * Only ready eras with no active job are kept: a half-made era must come from the server, which may have moved on.
 * The snapshot is only for showing; the screen still asks the server and replaces it with the answer. Every read
 * and write is wrapped in try/catch, because localStorage throws in some private modes and when full.
 */
import type { Era, EraId, EraResponse } from '@/lib/contracts';

/** Key prefix. Version it so a change to the Era shape can drop old snapshots. */
export const ERA_SNAPSHOT_PREFIX = 'chronodex:era:v1:';

/** The subset of Storage this needs, so tests can pass a fake. */
export type SnapshotStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

/** localStorage, or null on the server or where it throws. */
function defaultStorage(): SnapshotStorage | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage;
  } catch {
    return null;
  }
}

/**
 * Tell whether an era response is worth keeping: ready, no job running.
 *
 * @param res - A response from GET /api/eras/[eraId].
 * @returns True when it is complete.
 */
export function isSnapshotWorthy(res: EraResponse): boolean {
  return res.era.state === 'ready' && res.job === null;
}

/**
 * Keep an era response, if it is complete. A response that is not complete leaves any older snapshot in place.
 *
 * @param res - A response from GET /api/eras/[eraId].
 * @param storage - Defaults to localStorage.
 */
export function saveEraSnapshot(res: EraResponse, storage: SnapshotStorage | null = defaultStorage()): void {
  if (!storage || !isSnapshotWorthy(res)) return;
  try {
    storage.setItem(ERA_SNAPSHOT_PREFIX + res.era.id, JSON.stringify(res.era));
  } catch {
    // Full or refused: the screen just loads from the network as before.
  }
}

/**
 * Read the kept copy of an era.
 *
 * @param eraId - The era.
 * @param storage - Defaults to localStorage.
 * @returns The era, or null when none is kept or it cannot be read.
 */
export function loadEraSnapshot(eraId: EraId, storage: SnapshotStorage | null = defaultStorage()): Era | null {
  if (!storage) return null;
  try {
    const raw = storage.getItem(ERA_SNAPSHOT_PREFIX + eraId);
    if (!raw) return null;
    const era = JSON.parse(raw) as Era;
    return era?.id === eraId && era.state === 'ready' ? era : null;
  } catch {
    return null;
  }
}
