/**
 * What the Dex grid shows: one entry per landmark, collected or not (MASTER.md task A3-07).
 *
 * Owner: Agent 3 (Explorer). Pure functions with unit tests, so the screen only draws.
 */
import type { Capture, Landmark } from '@/lib/contracts';

/** One cell of the Dex grid. */
export interface DexEntry {
  landmark: Landmark;
  /** The player's capture of this landmark, or null while it is still to find. */
  capture: Capture | null;
}

/**
 * Pair every landmark with this player's capture of it, keeping the landmark order.
 *
 * If a landmark somehow has more than one capture, the earliest one is shown, because the first
 * time a player stood there is the one that earned the badge. Captures of landmarks that no longer
 * exist are ignored.
 *
 * @param landmarks - Every landmark, in route order.
 * @param captures - This player's captures, in any order.
 * @returns One entry per landmark.
 */
export function buildDexEntries(landmarks: readonly Landmark[], captures: readonly Capture[]): DexEntry[] {
  const earliest = new Map<string, Capture>();
  for (const capture of captures) {
    const seen = earliest.get(capture.landmarkId);
    if (!seen || Date.parse(capture.capturedAt) < Date.parse(seen.capturedAt)) {
      earliest.set(capture.landmarkId, capture);
    }
  }
  return landmarks.map((landmark) => ({ landmark, capture: earliest.get(landmark.id) ?? null }));
}

/**
 * How many of the entries are collected.
 *
 * @param entries - Output of buildDexEntries.
 * @returns The count of entries with a capture.
 */
export function countCollected(entries: readonly DexEntry[]): number {
  return entries.filter((entry) => entry.capture !== null).length;
}

/**
 * Format a capture time for a Dex card, for example "14 Nov 2026".
 *
 * @param iso - ISO 8601 time from `Capture.capturedAt`.
 * @param timeZone - IANA zone to show the date in. Defaults to the player's own zone; tests pass "UTC".
 * @returns The date, or an empty string when `iso` is not a valid date.
 */
export function formatCaptureDate(iso: string, timeZone?: string): string {
  const ms = Date.parse(iso);
  if (Number.isNaN(ms)) return '';
  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone }).format(ms);
}

/**
 * The locked-silhouette badge address for a landmark: `<id>-locked.png` beside the badge.
 *
 * Same rule the Map's landmark card uses, kept here so the Dex does not depend on `fixtures/`.
 *
 * @param badgeUrl - The landmark's `badgeUrl`.
 * @returns The silhouette's URL.
 */
export function lockedBadgeUrl(badgeUrl: string): string {
  return badgeUrl.replace(/\.png$/, '-locked.png');
}

/**
 * Whether a photo address is safe to put in an `<img src>`: a normal web address or a local blob.
 * The Dex cache lives in localStorage, so it is not trusted blindly.
 *
 * @param url - Address from `Capture.photoUrl`.
 * @returns True for http, https and blob URLs, except the showcase build's placeholders on the reserved
 *   `.invalid` domain (src/lib/showcase/photos.ts), which never load.
 */
export function isShowablePhotoUrl(url: string): boolean {
  if (/^https?:\/\/[^/]*\.invalid(?:[:/]|$)/i.test(url)) return false;
  return /^(https?:|blob:)/i.test(url);
}
