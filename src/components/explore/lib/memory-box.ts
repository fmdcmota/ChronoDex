/**
 * The memory box: a small keepsake store of the photos a player has taken, kept in the browser
 * (a Chronodex extra added at the human's request on 15 Nov 2026).
 *
 * Owner: Agent 3 (Explorer).
 *
 * Why it exists: the Dex already shows the photo of each collected landmark, but those pictures are
 * links to files on the server (fal's CDN keeps files for a limited time, and the Dex is offline
 * without a network). The memory box keeps its own tiny thumbnail of every photo taken, as a data
 * address in localStorage, so the keepsakes stay on the phone: they open offline, never expire, and
 * even keep a retake. Thumbnails are about 10 to 20 KB each and the box holds at most
 * MAX_MEMORIES, newest first, far below localStorage's quota.
 *
 * Also here: the one-line "just collected" note that tells the Dex which badge to twirl when the
 * player lands on it straight after a capture.
 *
 * Every function takes the storage as an argument so the unit tests need no browser.
 */

/** localStorage key. The version suffix lets a future change of shape start fresh. */
export const MEMORY_BOX_KEY = 'chronodex.memoryBox.v1';

/** sessionStorage key for the badge to twirl on the Dex. */
export const JUST_COLLECTED_KEY = 'chronodex.justCollected';

/** Most photos kept. Older ones are dropped first. */
export const MAX_MEMORIES = 24;

/** Event fired on `window` whenever the box changes in this tab (localStorage tells no one in its own tab). */
export const MEMORY_BOX_EVENT = 'chronodex:memorybox';

/** The part of the Web Storage API these functions use. */
export type MemoryStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

/** One keepsake. */
export interface MemoryEntry {
  /** Unique, for example the capture id. */
  id: string;
  landmarkId: string;
  landmarkName: string;
  /** When the photo was taken, epoch milliseconds. */
  takenAtMs: number;
  /** A small JPEG as a `data:image/jpeg;base64,...` address. */
  thumb: string;
}

/** What is stored: the player it belongs to, so a different player never sees it. */
interface StoredBox {
  playerId: string;
  entries: MemoryEntry[];
}

/**
 * Check one stored entry has the right shape and a data-address picture.
 *
 * @param value - Anything read from storage.
 * @returns True when it can be used as a MemoryEntry.
 */
function isEntry(value: unknown): value is MemoryEntry {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.id === 'string' &&
    v.id.length > 0 &&
    typeof v.landmarkId === 'string' &&
    typeof v.landmarkName === 'string' &&
    typeof v.takenAtMs === 'number' &&
    Number.isFinite(v.takenAtMs) &&
    typeof v.thumb === 'string' &&
    v.thumb.startsWith('data:image/')
  );
}

/**
 * Read the box out of its stored text.
 *
 * @param raw - The stored text, or null when nothing is stored.
 * @param playerId - The current player. A box saved for another player reads as empty.
 * @returns The entries, newest first. Empty for nothing, bad JSON, another player or wrong shapes.
 */
export function parseMemoryBox(raw: string | null, playerId: string): MemoryEntry[] {
  if (!raw) return [];
  try {
    const value = JSON.parse(raw) as Partial<StoredBox> | null;
    if (!value || value.playerId !== playerId || !Array.isArray(value.entries)) return [];
    return value.entries.filter(isEntry).sort((a, b) => b.takenAtMs - a.takenAtMs).slice(0, MAX_MEMORIES);
  } catch {
    return [];
  }
}

/**
 * Add a keepsake, newest first.
 *
 * @param entries - The current entries.
 * @param entry - The new one. An older entry with the same id is replaced.
 * @param max - Most entries kept. Defaults to MAX_MEMORIES.
 * @returns A new array, newest first, at most `max` long.
 */
export function addMemory(entries: readonly MemoryEntry[], entry: MemoryEntry, max: number = MAX_MEMORIES): MemoryEntry[] {
  return [entry, ...entries.filter((e) => e.id !== entry.id)].sort((a, b) => b.takenAtMs - a.takenAtMs).slice(0, max);
}

/**
 * Read the raw stored text, for useSyncExternalStore.
 *
 * @param storage - Where it is kept. Defaults to localStorage in a browser.
 * @returns The text, or null.
 */
export function readMemoryBoxRaw(storage: MemoryStorage | null = browserLocalStorage()): string | null {
  try {
    return storage?.getItem(MEMORY_BOX_KEY) ?? null;
  } catch {
    return null;
  }
}

/**
 * Save the box. If the browser refuses (storage full), the oldest keepsakes are dropped one at a time
 * until it fits, so a new photo is never lost to old ones.
 *
 * Side effects: writes localStorage and fires MEMORY_BOX_EVENT on `window`.
 *
 * @param playerId - The current player.
 * @param entries - Entries to save, newest first.
 * @param storage - Where to keep them. Defaults to localStorage in a browser.
 * @returns The entries actually saved (possibly fewer than given), or null when nothing could be saved.
 */
export function saveMemoryBox(
  playerId: string,
  entries: readonly MemoryEntry[],
  storage: MemoryStorage | null = browserLocalStorage(),
): MemoryEntry[] | null {
  if (!storage) return null;
  for (let keep = entries.length; keep >= 1; keep--) {
    const kept = entries.slice(0, keep);
    try {
      storage.setItem(MEMORY_BOX_KEY, JSON.stringify({ playerId, entries: kept } satisfies StoredBox));
      if (typeof window !== 'undefined') window.dispatchEvent(new Event(MEMORY_BOX_EVENT));
      return kept;
    } catch {
      // Too big: try again with one fewer, oldest first.
    }
  }
  return null;
}

/**
 * Subscribe to changes of the box, for useSyncExternalStore.
 *
 * @param onChange - Called when the box changes in this tab or another.
 * @returns The unsubscribe function.
 */
export function subscribeMemoryBox(onChange: () => void): () => void {
  window.addEventListener(MEMORY_BOX_EVENT, onChange);
  window.addEventListener('storage', onChange);
  return () => {
    window.removeEventListener(MEMORY_BOX_EVENT, onChange);
    window.removeEventListener('storage', onChange);
  };
}

/**
 * Note that a landmark was just collected for the first time, so the Dex can twirl its badge.
 *
 * @param landmarkId - The landmark.
 * @param storage - Where to keep the note. Defaults to sessionStorage in a browser.
 */
export function markJustCollected(landmarkId: string, storage: MemoryStorage | null = browserSessionStorage()): void {
  try {
    storage?.setItem(JUST_COLLECTED_KEY, landmarkId);
  } catch {
    // Not worth failing a capture over a missed animation.
  }
}

/**
 * Read the "just collected" note without removing it, so reading is safe to repeat (React may render
 * twice in development).
 *
 * @param storage - Where the note is kept. Defaults to sessionStorage in a browser.
 * @returns The landmark id, or null.
 */
export function peekJustCollected(storage: MemoryStorage | null = browserSessionStorage()): string | null {
  try {
    return storage?.getItem(JUST_COLLECTED_KEY) ?? null;
  } catch {
    return null;
  }
}

/**
 * Remove the "just collected" note once the twirl has played.
 *
 * @param storage - Where the note is kept. Defaults to sessionStorage in a browser.
 */
export function clearJustCollected(storage: MemoryStorage | null = browserSessionStorage()): void {
  try {
    storage?.removeItem(JUST_COLLECTED_KEY);
  } catch {
    // Nothing to do.
  }
}

/** localStorage, or null where it is missing or throws (server render, some private modes). */
function browserLocalStorage(): MemoryStorage | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage;
  } catch {
    return null;
  }
}

/** sessionStorage, or null where it is missing or throws. */
function browserSessionStorage(): MemoryStorage | null {
  try {
    return typeof window === 'undefined' ? null : window.sessionStorage;
  } catch {
    return null;
  }
}
