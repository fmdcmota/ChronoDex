/** Unit tests for ambience.ts. Owner: Agent 4. */
import { describe, expect, it } from 'vitest';
import { AMBIENCE_DUCKED_GAIN, AMBIENCE_GAIN, ambienceBucket, ambienceGain, ambienceUrl, placeholderLoop } from './ambience';

describe('ambienceBucket', () => {
  it('maps years to the four loops at their edges', () => {
    expect(ambienceBucket(1700)).toBe('1850-1899');
    expect(ambienceBucket(1862)).toBe('1850-1899');
    expect(ambienceBucket(1899)).toBe('1850-1899');
    expect(ambienceBucket(1900)).toBe('1900-1945');
    expect(ambienceBucket(1941)).toBe('1900-1945');
    expect(ambienceBucket(1945)).toBe('1900-1945');
    expect(ambienceBucket(1946)).toBe('1946-1979');
    expect(ambienceBucket(1979)).toBe('1946-1979');
    expect(ambienceBucket(1980)).toBe('1980-now');
    expect(ambienceBucket(2011)).toBe('1980-now');
  });

  it('builds the public path', () => {
    expect(ambienceUrl('1900-1945')).toBe('/audio/ambience/1900-1945.mp3');
  });
});

describe('ambienceGain', () => {
  it('is silent when muted, low while the guide speaks, quiet otherwise', () => {
    expect(ambienceGain(true, false)).toBe(0);
    expect(ambienceGain(true, true)).toBe(0);
    expect(ambienceGain(false, true)).toBe(AMBIENCE_DUCKED_GAIN);
    expect(ambienceGain(false, false)).toBe(AMBIENCE_GAIN);
    expect(AMBIENCE_DUCKED_GAIN).toBeLessThan(AMBIENCE_GAIN);
  });
});

describe('placeholderLoop', () => {
  /** Deterministic pseudo-random numbers. */
  const seeded = () => {
    let x = 12345;
    return () => {
      x = (x * 1103515245 + 12345) % 2147483648;
      return x / 2147483648;
    };
  };

  it('has the requested length and stays within -1 to 1', () => {
    const s = placeholderLoop(8000, 2, seeded());
    expect(s.length).toBe(16000);
    expect(Math.max(...s.map(Math.abs))).toBeLessThanOrEqual(1);
  });

  it('loops without a jump: the seam step is no bigger than a normal step', () => {
    const s = placeholderLoop(8000, 2, seeded());
    let maxStep = 0;
    for (let i = 1; i < s.length; i++) maxStep = Math.max(maxStep, Math.abs(s[i] - s[i - 1]));
    expect(Math.abs(s[0] - s[s.length - 1])).toBeLessThanOrEqual(maxStep);
  });
});
