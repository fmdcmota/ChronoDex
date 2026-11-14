/**
 * Keeps the last Dex in `localStorage` so it still shows with no signal (MASTER.md task A3-08).
 *
 * Owner: Agent 3 (Explorer).
 *
 * The Dex screen shows the cached copy at once, then replaces it with the fresh one from the API.
 * If the API cannot be reached it keeps showing the cached copy and says so. The cache is tied to
 * the player id, so a browser whose id was reset never shows the previous player's badges.
 *
 * The functions take an explicit storage argument so the unit tests need no browser.
 */
import type { Capture, Landmark } from '@/lib/contracts';

/** localStorage key for the cached Dex. */
export const DEX_CACHE_KEY = 'chronodex.dexCache.v1';

/** What is cached: enough to draw the whole Dex offline. */
export interface DexSnapshot {
  /** The player this belongs to. */
  playerId: string;
  /** When it was saved, epoch milliseconds. */
  savedAtMs: number;
  landmarks: Landmark[];
  captures: Capture[];
}

/** The part of the Web Storage API these functions use. */
export type DexStorage = Pick<Storage, 'getItem' | 'setItem'>;

/**
 * The browser's localStorage, or null where it is missing or throws (server render, some private
 * modes).
 *
 * @returns The storage, or null.
 */
export function browserLocalStorage(): DexStorage | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage;
  } catch {
    return null;
  }
}

/**
 * Save the Dex. Failures (full or blocked storage) are ignored: the Dex just will not be
 * available offline.
 *
 * @param snapshot - What to save.
 * @param storage - Where to save it. Defaults to the browser's localStorage.
 */
export function saveDexCache(snapshot: DexSnapshot, storage: DexStorage | null = browserLocalStorage()): void {
  try {
    storage?.setItem(DEX_CACHE_KEY, JSON.stringify(snapshot));
  } catch {
    // Storage full or blocked: the Dex still works online.
  }
}

/**
 * Check one landmark has the fields the Dex draws.
 *
 * @param value - Anything read from storage.
 * @returns True when it can be drawn.
 */
function isLandmarkLike(value: unknown): value is Landmark {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.id === 'string' &&
    typeof v.name === 'string' &&
    typeof v.badgeUrl === 'string' &&
    typeof v.rarity === 'string' &&
    Array.isArray(v.eraYears)
  );
}

/**
 * Check one capture has the fields the Dex draws.
 *
 * @param value - Anything read from storage.
 * @returns True when it can be drawn.
 */
function isCaptureLike(value: unknown): value is Capture {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return typeof v.landmarkId === 'string' && typeof v.capturedAt === 'string' && typeof v.photoUrl === 'string';
}

/**
 * Read the cached Dex as the raw stored text, for React's `useSyncExternalStore`.
 *
 * @param storage - Where it was saved. Defaults to the browser's localStorage.
 * @returns The stored JSON text, or null when there is none or storage is unavailable. Returning the
 *   same string for the same content is what lets React tell nothing changed.
 */
export function readDexCacheRaw(storage: DexStorage | null = browserLocalStorage()): string | null {
  try {
    return storage?.getItem(DEX_CACHE_KEY) ?? null;
  } catch {
    return null;
  }
}

/**
 * Turn stored text into a snapshot for a player, checking its shape.
 *
 * @param raw - Text from readDexCacheRaw, or null.
 * @param playerId - The current player. A cache saved for another id is ignored.
 * @returns The snapshot, or null when there is none, it is malformed, or it belongs to someone else.
 */
export function parseDexCache(raw: string | null, playerId: string): DexSnapshot | null {
  if (!raw) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof parsed !== 'object' || parsed === null) return null;
  const v = parsed as Record<string, unknown>;
  if (v.playerId !== playerId || typeof v.savedAtMs !== 'number') return null;
  if (!Array.isArray(v.landmarks) || !Array.isArray(v.captures)) return null;
  if (!v.landmarks.every(isLandmarkLike) || !v.captures.every(isCaptureLike)) return null;
  return { playerId, savedAtMs: v.savedAtMs, landmarks: v.landmarks, captures: v.captures };
}

/**
 * Read the cached Dex for a player.
 *
 * @param playerId - The current player. A cache saved for another id is ignored.
 * @param storage - Where it was saved. Defaults to the browser's localStorage.
 * @returns The snapshot, or null when there is none, it is malformed, or it belongs to someone else.
 */
export function loadDexCache(
  playerId: string,
  storage: DexStorage | null = browserLocalStorage(),
): DexSnapshot | null {
  return parseDexCache(readDexCacheRaw(storage), playerId);
}
