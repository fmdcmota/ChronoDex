/**
 * Tests for the duck tutorial's pure logic and voice helpers. Owner: Agent 3 (Explorer).
 */
import { describe, expect, it } from 'vitest';
import { TUTORIAL_LINES, TUTORIAL_SEEN_KEY, markTutorialSeen, shouldShowTutorial, tutorialDurationMs } from './duck-tutorial';
import { blipPitchHz, isVoiced } from './duck-voice';

/**
 * A minimal in-memory Storage.
 *
 * @returns Storage-like object.
 */
function memoryStorage() {
  const data = new Map<string, string>();
  return { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => void data.set(k, v) };
}

describe('duck tutorial', () => {
  it('runs about 15 seconds', () => {
    const s = tutorialDurationMs() / 1000;
    expect(s).toBeGreaterThan(13);
    expect(s).toBeLessThan(18);
  });

  it('has five short lines', () => {
    expect(TUTORIAL_LINES).toHaveLength(5);
    for (const line of TUTORIAL_LINES) expect(line.length).toBeLessThanOrEqual(70);
  });

  it('plays once per session, and obeys ?duck=', () => {
    const storage = memoryStorage();
    expect(shouldShowTutorial(storage, '')).toBe(true);
    markTutorialSeen(storage);
    expect(storage.getItem(TUTORIAL_SEEN_KEY)).toBe('1');
    expect(shouldShowTutorial(storage, '')).toBe(false);
    expect(shouldShowTutorial(storage, '?duck=1')).toBe(true);
    expect(shouldShowTutorial(memoryStorage(), '?duck=0')).toBe(false);
    expect(shouldShowTutorial(null, '')).toBe(true);
  });
});

describe('duck voice', () => {
  it('voices letters and digits, not spaces or punctuation', () => {
    expect(isVoiced('a')).toBe(true);
    expect(isVoiced('7')).toBe(true);
    expect(isVoiced(' ')).toBe(false);
    expect(isVoiced('!')).toBe(false);
  });

  it('gives each letter a steady pitch in a chirpy range', () => {
    expect(blipPitchHz('q')).toBe(blipPitchHz('Q'));
    for (const c of 'abcdefghijklmnopqrstuvwxyz') {
      const hz = blipPitchHz(c);
      expect(hz).toBeGreaterThan(350);
      expect(hz).toBeLessThan(950);
    }
  });
});
