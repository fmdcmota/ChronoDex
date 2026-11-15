/**
 * Tests for the browser media cache's URL rule and the era snapshot.
 *
 * Owner: Agent 4. Task A4-14.
 */
import { describe, expect, it } from 'vitest';
import type { EraResponse } from '@/lib/contracts';
import { HERO_ERA_ID, eras } from '@fixtures/index';
import { loadEraSnapshot, saveEraSnapshot, type SnapshotStorage } from './eraSnapshot';
import { isCacheableMediaUrl } from './mediaCache';

const heroEra = eras.find((e) => e.id === HERO_ERA_ID)!;

const ORIGIN = 'https://abc.trycloudflare.com';

describe('isCacheableMediaUrl', () => {
  it('keeps our media and fal files only', () => {
    expect(isCacheableMediaUrl('/api/media/0123456789abcdef0123456789abcdef', ORIGIN)).toBe(true);
    expect(isCacheableMediaUrl(`${ORIGIN}/api/media/0123`, ORIGIN)).toBe(true);
    expect(isCacheableMediaUrl('https://v3.fal.media/files/lion/pano.jpg', ORIGIN)).toBe(true);
    expect(isCacheableMediaUrl('/mock/panorama.jpg', ORIGIN)).toBe(false);
    expect(isCacheableMediaUrl('/api/eras/x', ORIGIN)).toBe(false);
    expect(isCacheableMediaUrl('http://v3.fal.media/x.jpg', ORIGIN)).toBe(false);
    expect(isCacheableMediaUrl('https://example.com/api/media/0123', ORIGIN)).toBe(false);
  });
});

/** A Map-backed Storage. */
function fakeStorage(): SnapshotStorage & { map: Map<string, string> } {
  const map = new Map<string, string>();
  return {
    map,
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => void map.set(k, v),
    removeItem: (k) => void map.delete(k),
  };
}

describe('era snapshot', () => {
  it('keeps a ready era with no job and reads it back', () => {
    const s = fakeStorage();
    const res: EraResponse = { era: { ...heroEra, state: 'ready' }, job: null };
    saveEraSnapshot(res, s);
    expect(loadEraSnapshot(heroEra.id, s)?.id).toBe(heroEra.id);
  });

  it('ignores eras that are not complete, and junk in storage', () => {
    const s = fakeStorage();
    saveEraSnapshot({ era: { ...heroEra, state: 'generating' }, job: null }, s);
    expect(s.map.size).toBe(0);
    s.map.set(`chronodex:era:v1:${heroEra.id}`, '{not json');
    expect(loadEraSnapshot(heroEra.id, s)).toBeNull();
    expect(loadEraSnapshot(heroEra.id, null)).toBeNull();
  });

  it('survives a storage that throws', () => {
    const s: SnapshotStorage = {
      getItem: () => {
        throw new Error('denied');
      },
      setItem: () => {
        throw new Error('full');
      },
      removeItem: () => undefined,
    };
    expect(() => saveEraSnapshot({ era: { ...heroEra, state: 'ready' }, job: null }, s)).not.toThrow();
    expect(loadEraSnapshot(heroEra.id, s)).toBeNull();
  });
});
