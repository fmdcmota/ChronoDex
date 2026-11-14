/**
 * Hands the player's latest position from the Map screen to the Capture screen (MASTER.md
 * tasks A3-05 and A3-06).
 *
 * Owner: Agent 3 (Explorer).
 *
 * Why this exists: the location tracker lives inside each screen, so a position the dev spoof
 * panel set on the map would be lost when the player taps Capture and the route changes. This
 * keeps the last fix in `sessionStorage` (per tab, gone when the tab closes) so the Capture
 * screen starts from the same position the map showed. A real GPS fix is only a starting point
 * (the Capture screen tracks the device itself and replaces it); a spoofed fix is authoritative
 * while the dev tools are on.
 *
 * The functions take an explicit storage argument so the unit tests need no browser.
 */
import type { PlayerFix } from './location';

/** sessionStorage key for the stored fix. */
export const FIX_STORAGE_KEY = 'chronodex.lastFix';

/** A real GPS fix older than this is not trusted as a starting point. */
export const GPS_FIX_MAX_AGE_MS = 2 * 60 * 1000;

/** The part of the Web Storage API these functions use. */
export type FixStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

/**
 * The browser's sessionStorage, or null where it is missing or throws (server render, some
 * private modes).
 *
 * @returns The storage, or null.
 */
export function browserSessionStorage(): FixStorage | null {
  try {
    return typeof window === 'undefined' ? null : window.sessionStorage;
  } catch {
    return null;
  }
}

/**
 * Remember a fix for the next screen. Failures (full or blocked storage) are ignored: the next
 * screen then simply starts without a position.
 *
 * @param fix - The fix to remember.
 * @param storage - Where to keep it. Defaults to the browser's sessionStorage.
 */
export function saveFix(fix: PlayerFix, storage: FixStorage | null = browserSessionStorage()): void {
  try {
    storage?.setItem(FIX_STORAGE_KEY, JSON.stringify(fix));
  } catch {
    // Storage full or blocked: not worth failing a screen over.
  }
}

/**
 * Forget the stored fix, for example when the dev spoof is cleared.
 *
 * @param storage - Where it was kept. Defaults to the browser's sessionStorage.
 */
export function clearFix(storage: FixStorage | null = browserSessionStorage()): void {
  try {
    storage?.removeItem(FIX_STORAGE_KEY);
  } catch {
    // Nothing to do.
  }
}

/**
 * Check that a parsed value has the shape of a PlayerFix with sane numbers.
 *
 * @param value - Anything read from storage.
 * @returns True when it can be used as a PlayerFix.
 */
function isFix(value: unknown): value is PlayerFix {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  const p = v.position as Record<string, unknown> | undefined;
  return (
    typeof p === 'object' &&
    p !== null &&
    typeof p.lat === 'number' &&
    typeof p.lng === 'number' &&
    Number.isFinite(p.lat) &&
    Number.isFinite(p.lng) &&
    Math.abs(p.lat) <= 90 &&
    Math.abs(p.lng) <= 180 &&
    typeof v.accuracyM === 'number' &&
    Number.isFinite(v.accuracyM) &&
    v.accuracyM >= 0 &&
    (v.source === 'gps' || v.source === 'spoof') &&
    typeof v.atMs === 'number' &&
    Number.isFinite(v.atMs)
  );
}

/**
 * Read the stored fix.
 *
 * @param nowMs - The current time, epoch milliseconds.
 * @param allowSpoof - True when the dev tools are on. A stored spoofed fix is ignored otherwise,
 *   so a stale dev value can never leak into a normal session.
 * @param storage - Where it was kept. Defaults to the browser's sessionStorage.
 * @returns The fix, or null when none is stored, it is malformed, it is a spoof that is not
 *   allowed, or it is a GPS fix older than GPS_FIX_MAX_AGE_MS.
 */
export function loadFix(
  nowMs: number,
  allowSpoof: boolean,
  storage: FixStorage | null = browserSessionStorage(),
): PlayerFix | null {
  let parsed: unknown;
  try {
    const raw = storage?.getItem(FIX_STORAGE_KEY);
    if (!raw) return null;
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!isFix(parsed)) return null;
  if (parsed.source === 'spoof') return allowSpoof ? parsed : null;
  return nowMs - parsed.atMs <= GPS_FIX_MAX_AGE_MS ? parsed : null;
}
