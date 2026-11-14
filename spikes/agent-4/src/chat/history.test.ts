/**
 * Unit tests for history.ts (A4-07 spike, Agent 4). Uses an in-memory store, so no browser is needed.
 */
import { describe, expect, it } from 'vitest';
import type { ChatMessage } from './contracts';
import {
  HISTORY_KEY_PREFIX,
  MAX_HISTORY_MESSAGES,
  clearHistory,
  historyKey,
  loadHistory,
  saveHistory,
  type KeyValueStore,
} from './history';

/** Plain in-memory KeyValueStore for tests. */
class MemoryStore implements KeyValueStore {
  private readonly items = new Map<string, string>();
  getItem(key: string): string | null {
    return this.items.get(key) ?? null;
  }
  setItem(key: string, value: string): void {
    this.items.set(key, value);
  }
  removeItem(key: string): void {
    this.items.delete(key);
  }
}

/** Store whose getItem always throws, as with blocked storage. */
const throwingReadStore: KeyValueStore = {
  getItem() {
    throw new Error('blocked');
  },
  setItem() {},
  removeItem() {},
};

/** Store whose setItem always throws, as with a full quota. */
const throwingWriteStore: KeyValueStore = {
  getItem() {
    return null;
  },
  setItem() {
    throw new Error('QuotaExceededError');
  },
  removeItem() {
    throw new Error('blocked');
  },
};

const ERA = 'queens-tower_1893';
const OTHER_ERA = 'v-and-a_1941';

const sample: ChatMessage[] = [
  { role: 'guide', text: 'Good morning, I am Mabel.' },
  { role: 'player', text: 'What were the trams like?' },
];

describe('historyKey', () => {
  it('prefixes the era id', () => {
    expect(historyKey(ERA)).toBe(HISTORY_KEY_PREFIX + ERA);
  });
});

describe('saveHistory and loadHistory', () => {
  it('round-trips messages in order', () => {
    const store = new MemoryStore();
    saveHistory(ERA, sample, store);
    expect(loadHistory(ERA, store)).toEqual(sample);
  });

  it('keeps separate eras apart', () => {
    const store = new MemoryStore();
    saveHistory(ERA, sample, store);
    saveHistory(OTHER_ERA, [{ role: 'player', text: 'Hello' }], store);
    expect(loadHistory(ERA, store)).toEqual(sample);
    expect(loadHistory(OTHER_ERA, store)).toEqual([{ role: 'player', text: 'Hello' }]);
  });

  it('keeps only the last MAX_HISTORY_MESSAGES messages', () => {
    const store = new MemoryStore();
    const many: ChatMessage[] = Array.from({ length: MAX_HISTORY_MESSAGES + 5 }, (_, i) => ({
      role: 'player',
      text: `message ${i}`,
    }));
    saveHistory(ERA, many, store);
    const loaded = loadHistory(ERA, store);
    expect(loaded).toHaveLength(MAX_HISTORY_MESSAGES);
    expect(loaded[0].text).toBe('message 5');
    expect(loaded[MAX_HISTORY_MESSAGES - 1].text).toBe(`message ${MAX_HISTORY_MESSAGES + 4}`);
  });

  it('does not throw when setItem throws', () => {
    expect(() => saveHistory(ERA, sample, throwingWriteStore)).not.toThrow();
  });
});

describe('loadHistory', () => {
  it('returns [] when nothing is stored', () => {
    expect(loadHistory(ERA, new MemoryStore())).toEqual([]);
  });

  it('returns [] for invalid JSON', () => {
    const store = new MemoryStore();
    store.setItem(historyKey(ERA), '{not json');
    expect(loadHistory(ERA, store)).toEqual([]);
  });

  it('returns [] for the wrong version', () => {
    const store = new MemoryStore();
    store.setItem(historyKey(ERA), JSON.stringify({ v: 2, messages: sample }));
    expect(loadHistory(ERA, store)).toEqual([]);
  });

  it('returns [] when messages is not an array', () => {
    const store = new MemoryStore();
    store.setItem(historyKey(ERA), JSON.stringify({ v: 1, messages: 'nope' }));
    expect(loadHistory(ERA, store)).toEqual([]);
  });

  it('drops invalid items and keeps valid ones in order', () => {
    const store = new MemoryStore();
    const mixed = [
      { role: 'guide', text: 'first' },
      { role: 'narrator', text: 'bad role' },
      null,
      'a string',
      { role: 'player' },
      { role: 'player', text: 42 },
      { role: 'player', text: 'second' },
    ];
    store.setItem(historyKey(ERA), JSON.stringify({ v: 1, messages: mixed }));
    expect(loadHistory(ERA, store)).toEqual([
      { role: 'guide', text: 'first' },
      { role: 'player', text: 'second' },
    ]);
  });

  it('returns [] when getItem throws', () => {
    expect(loadHistory(ERA, throwingReadStore)).toEqual([]);
  });

  it('returns [] when there is no store', () => {
    expect(() => loadHistory(ERA, null)).not.toThrow();
    expect(loadHistory(ERA, null)).toEqual([]);
  });
});

describe('clearHistory', () => {
  it('removes the stored history for one era only', () => {
    const store = new MemoryStore();
    saveHistory(ERA, sample, store);
    saveHistory(OTHER_ERA, sample, store);
    clearHistory(ERA, store);
    expect(loadHistory(ERA, store)).toEqual([]);
    expect(loadHistory(OTHER_ERA, store)).toEqual(sample);
  });

  it('does not throw when removeItem throws or there is no store', () => {
    expect(() => clearHistory(ERA, throwingWriteStore)).not.toThrow();
    expect(() => clearHistory(ERA, null)).not.toThrow();
  });
});
