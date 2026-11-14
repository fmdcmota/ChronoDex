/**
 * Tests for the fix hand-off between the Map and Capture screens (task A3-06). Owner: Agent 3.
 */
import { describe, expect, it } from 'vitest';
import { clearFix, FIX_STORAGE_KEY, GPS_FIX_MAX_AGE_MS, loadFix, saveFix, type FixStorage } from './fix-store';
import type { PlayerFix } from './location';

/** An in-memory stand-in for sessionStorage. */
function memoryStorage(): FixStorage & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => void data.set(key, value),
    removeItem: (key) => void data.delete(key),
  };
}

const NOW = 1_000_000;
const gps: PlayerFix = { position: { lat: 51.498, lng: -0.1769 }, accuracyM: 12, source: 'gps', atMs: NOW - 1000 };
const spoof: PlayerFix = { ...gps, source: 'spoof', accuracyM: 10 };

describe('fix store', () => {
  it('round-trips a fresh GPS fix', () => {
    const s = memoryStorage();
    saveFix(gps, s);
    expect(loadFix(NOW, false, s)).toEqual(gps);
  });

  it('drops a GPS fix older than the maximum age, keeps one exactly at the limit', () => {
    const s = memoryStorage();
    saveFix({ ...gps, atMs: NOW - GPS_FIX_MAX_AGE_MS }, s);
    expect(loadFix(NOW, false, s)).not.toBeNull();
    saveFix({ ...gps, atMs: NOW - GPS_FIX_MAX_AGE_MS - 1 }, s);
    expect(loadFix(NOW, false, s)).toBeNull();
  });

  it('returns a spoofed fix only when the dev tools allow it, whatever its age', () => {
    const s = memoryStorage();
    saveFix({ ...spoof, atMs: 0 }, s);
    expect(loadFix(NOW, false, s)).toBeNull();
    expect(loadFix(NOW, true, s)?.source).toBe('spoof');
  });

  it('returns null for nothing, malformed JSON, wrong shapes and impossible numbers', () => {
    const s = memoryStorage();
    expect(loadFix(NOW, true, s)).toBeNull();
    for (const bad of [
      'not json',
      '{}',
      'null',
      JSON.stringify({ ...gps, position: { lat: 91, lng: 0 } }),
      JSON.stringify({ ...gps, position: { lat: 0, lng: 181 } }),
      JSON.stringify({ ...gps, accuracyM: -1 }),
      JSON.stringify({ ...gps, source: 'other' }),
      JSON.stringify({ ...gps, atMs: 'now' }),
    ]) {
      s.data.set(FIX_STORAGE_KEY, bad);
      expect(loadFix(NOW, true, s), bad).toBeNull();
    }
  });

  it('clears the stored fix', () => {
    const s = memoryStorage();
    saveFix(gps, s);
    clearFix(s);
    expect(loadFix(NOW, true, s)).toBeNull();
  });

  it('never throws when storage is missing or broken', () => {
    const broken: FixStorage = {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('full');
      },
      removeItem: () => {
        throw new Error('blocked');
      },
    };
    expect(() => saveFix(gps, broken)).not.toThrow();
    expect(() => clearFix(broken)).not.toThrow();
    expect(loadFix(NOW, true, broken)).toBeNull();
    expect(() => saveFix(gps, null)).not.toThrow();
    expect(loadFix(NOW, true, null)).toBeNull();
  });
});
