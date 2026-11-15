/**
 * Unit tests for the welcome intro's pure logic (lib/intro.ts). Owner: Agent 3; written by Agent 2.
 */
import { describe, expect, it } from 'vitest';
import { INTRO_SEEN_KEY, landingFor, markIntroSeen, shouldShowIntro } from './intro';
import type { PlayerFix } from './location';

/** A storage double backed by a plain object. */
function memoryStorage(initial: Record<string, string> = {}) {
  const data = { ...initial };
  return { getItem: (k: string) => data[k] ?? null, setItem: (k: string, v: string) => void (data[k] = v), data };
}

const fix: PlayerFix = { position: { lat: 51.498, lng: -0.176 }, accuracyM: 12, source: 'gps', atMs: 0 };

describe('shouldShowIntro', () => {
  it('plays once per session', () => {
    const storage = memoryStorage();
    expect(shouldShowIntro(storage, '')).toBe(true);
    markIntroSeen(storage);
    expect(storage.data[INTRO_SEEN_KEY]).toBe('1');
    expect(shouldShowIntro(storage, '')).toBe(false);
  });

  it('obeys ?intro=1 and ?intro=0', () => {
    expect(shouldShowIntro(memoryStorage({ [INTRO_SEEN_KEY]: '1' }), '?intro=1')).toBe(true);
    expect(shouldShowIntro(memoryStorage(), '?intro=0')).toBe(false);
  });

  it('plays when storage is missing or throws, and marking never throws', () => {
    expect(shouldShowIntro(null, '')).toBe(true);
    const broken = { getItem: () => { throw new Error('blocked'); }, setItem: () => { throw new Error('blocked'); } };
    expect(shouldShowIntro(broken, '')).toBe(true);
    expect(() => markIntroSeen(broken)).not.toThrow();
  });
});

describe('landingFor', () => {
  it('waits while the prompt or the first fix is pending', () => {
    expect(landingFor({ status: 'idle' })).toEqual({ kind: 'wait' });
    expect(landingFor({ status: 'locating' })).toEqual({ kind: 'wait' });
  });

  it('lands on the player with a fix, including the last fix after a timeout', () => {
    expect(landingFor({ status: 'ready', fix })).toEqual({ kind: 'player', position: fix.position });
    expect(landingFor({ status: 'timeout', lastFix: fix })).toEqual({ kind: 'player', position: fix.position });
  });

  it('falls back to the landmarks with a reason when there is no position', () => {
    for (const state of [{ status: 'denied' }, { status: 'insecure' }, { status: 'unsupported' }, { status: 'unavailable', lastFix: null }] as const) {
      const landing = landingFor(state);
      expect(landing.kind).toBe('fallback');
      expect(landing.kind === 'fallback' && landing.reason).toMatch(/\S/);
    }
  });
});
