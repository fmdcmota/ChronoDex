/**
 * Tests for the memory box store (Agent 3).
 */
import { describe, expect, it } from 'vitest';
import {
  addMemory,
  clearJustCollected,
  markJustCollected,
  MAX_MEMORIES,
  MEMORY_BOX_KEY,
  parseMemoryBox,
  peekJustCollected,
  readMemoryBoxRaw,
  saveMemoryBox,
  type MemoryEntry,
  type MemoryStorage,
} from './memory-box';

/** An in-memory stand-in for Web Storage, with an optional size limit. */
function memoryStorage(limitChars = Infinity): MemoryStorage & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => {
      if (v.length > limitChars) throw new Error('QuotaExceededError');
      data.set(k, v);
    },
    removeItem: (k) => void data.delete(k),
  };
}

const entry = (id: string, takenAtMs: number, thumb = 'data:image/jpeg;base64,AAAA'): MemoryEntry => ({
  id,
  landmarkId: 'queens-tower',
  landmarkName: 'Queen’s Tower',
  takenAtMs,
  thumb,
});

describe('addMemory', () => {
  it('puts the newest first', () => {
    const out = addMemory([entry('a', 100)], entry('b', 200));
    expect(out.map((e) => e.id)).toEqual(['b', 'a']);
  });

  it('replaces an entry with the same id instead of doubling it', () => {
    const out = addMemory([entry('a', 100)], entry('a', 300));
    expect(out).toHaveLength(1);
    expect(out[0]!.takenAtMs).toBe(300);
  });

  it('drops the oldest beyond the limit', () => {
    let list: MemoryEntry[] = [];
    for (let i = 0; i < MAX_MEMORIES + 5; i++) list = addMemory(list, entry(String(i), i));
    expect(list).toHaveLength(MAX_MEMORIES);
    expect(list[0]!.id).toBe(String(MAX_MEMORIES + 4));
    expect(list.at(-1)!.id).toBe('5');
  });
});

describe('save and parse', () => {
  it('round-trips for the same player', () => {
    const s = memoryStorage();
    saveMemoryBox('p1', [entry('b', 200), entry('a', 100)], s);
    expect(parseMemoryBox(readMemoryBoxRaw(s), 'p1').map((e) => e.id)).toEqual(['b', 'a']);
  });

  it('is empty for another player', () => {
    const s = memoryStorage();
    saveMemoryBox('p1', [entry('a', 100)], s);
    expect(parseMemoryBox(readMemoryBoxRaw(s), 'p2')).toEqual([]);
  });

  it('reads nothing, bad JSON, wrong shapes and non-image pictures as empty or skips them', () => {
    expect(parseMemoryBox(null, 'p')).toEqual([]);
    expect(parseMemoryBox('not json', 'p')).toEqual([]);
    expect(parseMemoryBox('null', 'p')).toEqual([]);
    expect(parseMemoryBox(JSON.stringify({ playerId: 'p', entries: 'x' }), 'p')).toEqual([]);
    const mixed = JSON.stringify({
      playerId: 'p',
      entries: [entry('ok', 1), { ...entry('bad', 2), thumb: 'https://example.com/x.jpg' }, { id: 3 }],
    });
    expect(parseMemoryBox(mixed, 'p').map((e) => e.id)).toEqual(['ok']);
  });

  it('when storage is full, drops the oldest until the new photo fits', () => {
    const big = 'data:image/jpeg;base64,' + 'A'.repeat(300);
    const entries = [entry('c', 300, big), entry('b', 200, big), entry('a', 100, big)];
    const s = memoryStorage(1000); // room for two entries (about 440 characters each), not three
    const saved = saveMemoryBox('p', entries, s);
    expect(saved!.map((e) => e.id)).toEqual(['c', 'b']);
    expect(parseMemoryBox(readMemoryBoxRaw(s), 'p').map((e) => e.id)).toEqual(['c', 'b']);
  });

  it('never throws when storage is missing or broken', () => {
    expect(saveMemoryBox('p', [entry('a', 1)], null)).toBeNull();
    expect(readMemoryBoxRaw(null)).toBeNull();
    const broken: MemoryStorage = {
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
    expect(saveMemoryBox('p', [entry('a', 1)], broken)).toBeNull();
    expect(readMemoryBoxRaw(broken)).toBeNull();
    expect(() => markJustCollected('x', broken)).not.toThrow();
    expect(peekJustCollected(broken)).toBeNull();
    expect(() => clearJustCollected(broken)).not.toThrow();
  });

  it('uses its own storage key', () => {
    const s = memoryStorage();
    saveMemoryBox('p', [entry('a', 1)], s);
    expect([...s.data.keys()]).toEqual([MEMORY_BOX_KEY]);
  });
});

describe('just collected note', () => {
  it('can be read again and again until it is cleared', () => {
    const s = memoryStorage();
    expect(peekJustCollected(s)).toBeNull();
    markJustCollected('queens-tower', s);
    expect(peekJustCollected(s)).toBe('queens-tower');
    expect(peekJustCollected(s)).toBe('queens-tower');
    clearJustCollected(s);
    expect(peekJustCollected(s)).toBeNull();
  });
});
