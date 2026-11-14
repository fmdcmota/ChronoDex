/**
 * Chat history kept per era in the browser's localStorage, so a player can close the guide chat
 * and find the thread again when they come back.
 *
 * Owner: Agent 4. Spike for A4-07 (MASTER.md section 1.2 part 3 and task A4-07, "history kept in
 * `localStorage` per era"). Lift into src/components/chat/ once the scaffold lands.
 *
 * Why this exists: histories are per era, not per player, because the guide is per landmark and
 * year. The stored value is versioned JSON so a later shape change can be detected and ignored
 * instead of crashing the chat. Every read and write is wrapped in try/catch because localStorage
 * can be blocked (private browsing, disabled site data) or full (QuotaExceededError). The chat
 * must still work without it, so failures degrade to an empty or unsaved history.
 */

import type { ChatMessage, EraId } from './contracts';

/**
 * The part of the Web Storage API this module uses. The browser's `localStorage` satisfies it,
 * and tests pass an in-memory object instead.
 */
export interface KeyValueStore {
  /** Returns the stored string for `key`, or null when nothing is stored. */
  getItem(key: string): string | null;
  /** Stores `value` under `key`. May throw (for example QuotaExceededError). */
  setItem(key: string, value: string): void;
  /** Removes `key`. Does nothing when the key is absent. */
  removeItem(key: string): void;
}

/** Prefix for every storage key, so chat keys do not collide with other app keys. */
export const HISTORY_KEY_PREFIX = 'chronodex.chat.';

/**
 * Most messages kept per era. The oldest are dropped on save so one long chat cannot fill the
 * browser's storage quota.
 */
export const MAX_HISTORY_MESSAGES = 100;

/** Version tag written into the stored JSON. A stored value with any other version is ignored. */
const HISTORY_FORMAT_VERSION = 1;

/**
 * Builds the storage key for one era's history.
 *
 * @param eraId - Era whose history is stored, for example "queens-tower_1893".
 * @returns The key, `HISTORY_KEY_PREFIX` followed by `eraId`.
 */
export function historyKey(eraId: EraId): string {
  return HISTORY_KEY_PREFIX + eraId;
}

/**
 * Chooses the store to use. An explicit store (including null) wins. When the argument is
 * omitted, the browser's localStorage is used if it exists. Reading `globalThis.localStorage` can
 * itself throw (blocked storage), so that read is guarded too.
 *
 * @param store - Explicit store, null for "no storage", or undefined to use the browser's storage.
 * @returns The store to use, or null when there is none.
 */
function resolveStore(store: KeyValueStore | null | undefined): KeyValueStore | null {
  if (store !== undefined) return store;
  try {
    const browserStore = (globalThis as { localStorage?: KeyValueStore }).localStorage;
    return browserStore ?? null;
  } catch {
    return null;
  }
}

/**
 * Type guard for one stored message. Keeps only objects whose `role` is exactly 'player' or
 * 'guide' and whose `text` is a string. Anything else is dropped rather than shown.
 *
 * @param value - Item taken from the stored array. Its shape is not trusted.
 * @returns True when `value` is a valid ChatMessage.
 */
function isChatMessage(value: unknown): value is ChatMessage {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as { role?: unknown; text?: unknown };
  return (candidate.role === 'player' || candidate.role === 'guide') && typeof candidate.text === 'string';
}

/**
 * Loads one era's chat history. Never throws.
 *
 * Returns an empty array when there is no store, nothing is stored, the store throws, the stored
 * text is not valid JSON, the version is not 1, or `messages` is not an array. Inside a valid
 * array, invalid items are dropped and the valid ones are kept in their original order.
 *
 * @param eraId - Era whose history to load.
 * @param store - Store to read from. Omit to use the browser's localStorage. Pass null for none.
 * @returns The stored messages, oldest first. Empty when nothing usable is stored.
 */
export function loadHistory(eraId: EraId, store?: KeyValueStore | null): ChatMessage[] {
  const target = resolveStore(store);
  if (target === null) return [];
  try {
    const raw = target.getItem(historyKey(eraId));
    if (raw === null) return [];
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return [];
    const record = parsed as { v?: unknown; messages?: unknown };
    if (record.v !== HISTORY_FORMAT_VERSION || !Array.isArray(record.messages)) return [];
    return record.messages.filter(isChatMessage);
  } catch {
    return [];
  }
}

/**
 * Saves one era's chat history, keeping only the last `MAX_HISTORY_MESSAGES` messages. Never
 * throws: a failed write (quota full, storage blocked) is swallowed, and the chat keeps working
 * from memory for the rest of the session.
 *
 * @param eraId - Era whose history to save.
 * @param messages - Full history, oldest first. Only the newest 100 are stored.
 * @param store - Store to write to. Omit to use the browser's localStorage. Pass null to skip saving.
 * @returns Nothing.
 */
export function saveHistory(eraId: EraId, messages: ChatMessage[], store?: KeyValueStore | null): void {
  const target = resolveStore(store);
  if (target === null) return;
  const newest = messages.slice(-MAX_HISTORY_MESSAGES);
  try {
    target.setItem(historyKey(eraId), JSON.stringify({ v: HISTORY_FORMAT_VERSION, messages: newest }));
  } catch {
    // Quota exceeded or storage blocked. Losing the saved copy is acceptable; the chat must not fail.
  }
}

/**
 * Removes one era's stored chat history. Never throws.
 *
 * @param eraId - Era whose history to remove.
 * @param store - Store to clear from. Omit to use the browser's localStorage. Pass null to do nothing.
 * @returns Nothing.
 */
export function clearHistory(eraId: EraId, store?: KeyValueStore | null): void {
  const target = resolveStore(store);
  if (target === null) return;
  try {
    target.removeItem(historyKey(eraId));
  } catch {
    // Storage blocked. Nothing to clear.
  }
}
