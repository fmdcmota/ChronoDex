/**
 * The anonymous player id, kept in localStorage. There are no accounts (MASTER.md section 2).
 *
 * Owner: Agent 1 (Core). Browser only.
 */

/** localStorage key that holds the player id. */
export const PLAYER_ID_STORAGE_KEY = 'chronodex.playerId';

/**
 * Get this browser's player id, creating and storing one on first use.
 *
 * Side effects: writes to localStorage the first time. If storage is unavailable (private mode,
 * server render), returns a fresh id each call, so the Dex will not persist.
 *
 * @returns A UUID.
 * @throws Error when called on the server, where there is no player.
 */
export function getPlayerId(): string {
  if (typeof window === 'undefined') {
    throw new Error('getPlayerId() is browser only. Call it in an effect or event handler.');
  }
  try {
    const existing = window.localStorage.getItem(PLAYER_ID_STORAGE_KEY);
    if (existing) return existing;
    const id = randomUuid();
    window.localStorage.setItem(PLAYER_ID_STORAGE_KEY, id);
    return id;
  } catch {
    return randomUuid();
  }
}

/**
 * Make a random version 4 UUID.
 *
 * `crypto.randomUUID` exists only in secure contexts (HTTPS or localhost), and a phone testing the
 * dev server over plain-HTTP LAN is not one. `crypto.getRandomValues` works everywhere.
 *
 * @returns A UUID such as "3b241101-e2bb-4255-8caf-4136c566a962".
 */
export function randomUuid(): string {
  if (typeof crypto.randomUUID === 'function' && globalThis.isSecureContext !== false) {
    return crypto.randomUUID();
  }
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40; // version 4
  bytes[8] = (bytes[8] & 0x3f) | 0x80; // RFC 4122 variant
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
