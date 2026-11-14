/**
 * Tests for the offline Dex cache (task A3-08). Owner: Agent 3.
 */
import { describe, expect, it } from 'vitest';
import { landmarks as fixtureLandmarks } from '@fixtures/index';
import type { Capture } from '@/lib/contracts';
import { DEX_CACHE_KEY, loadDexCache, saveDexCache, type DexSnapshot, type DexStorage } from './dex-cache';

/** An in-memory stand-in for localStorage. */
function memoryStorage(): DexStorage & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return { data, getItem: (k) => data.get(k) ?? null, setItem: (k, v) => void data.set(k, v) };
}

const capture: Capture = {
  id: 'c1',
  playerId: 'p1',
  landmarkId: 'queens-tower',
  photoUrl: 'https://example.com/p.jpg',
  location: { lat: 51.498, lng: -0.1769 },
  accuracyM: 10,
  distanceM: 12,
  capturedAt: '2026-11-14T16:00:00.000Z',
};
const snapshot: DexSnapshot = { playerId: 'p1', savedAtMs: 123, landmarks: fixtureLandmarks, captures: [capture] };

describe('dex cache', () => {
  it('round-trips the fixtures and a capture', () => {
    const s = memoryStorage();
    saveDexCache(snapshot, s);
    expect(loadDexCache('p1', s)).toEqual(snapshot);
  });

  it('ignores a cache saved for another player', () => {
    const s = memoryStorage();
    saveDexCache(snapshot, s);
    expect(loadDexCache('someone-else', s)).toBeNull();
  });

  it('returns null for nothing, bad JSON and wrong shapes', () => {
    const s = memoryStorage();
    expect(loadDexCache('p1', s)).toBeNull();
    for (const bad of [
      'not json',
      'null',
      '[]',
      JSON.stringify({ ...snapshot, landmarks: 'x' }),
      JSON.stringify({ ...snapshot, captures: [{ landmarkId: 1 }] }),
      JSON.stringify({ ...snapshot, landmarks: [{ id: 'a' }] }),
      JSON.stringify({ ...snapshot, savedAtMs: 'now' }),
    ]) {
      s.data.set(DEX_CACHE_KEY, bad);
      expect(loadDexCache('p1', s), bad).toBeNull();
    }
  });

  it('accepts an empty Dex', () => {
    const s = memoryStorage();
    saveDexCache({ ...snapshot, captures: [] }, s);
    expect(loadDexCache('p1', s)?.captures).toEqual([]);
  });

  it('never throws when storage is missing or broken', () => {
    const broken: DexStorage = {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('full');
      },
    };
    expect(() => saveDexCache(snapshot, broken)).not.toThrow();
    expect(loadDexCache('p1', broken)).toBeNull();
    expect(() => saveDexCache(snapshot, null)).not.toThrow();
    expect(loadDexCache('p1', null)).toBeNull();
  });
});
