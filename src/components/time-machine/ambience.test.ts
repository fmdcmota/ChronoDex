/** Unit tests for ambience.ts. Owner: Agent 4. */
import { describe, expect, it } from 'vitest';
import { AMBIENCE_LEVELS, ambienceBucket, ambienceGain, ambienceMode, ambienceUrl, crossfadeLoop, placeholderLoop } from './ambience';

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

  it('builds both layers paths, matching Agent 2 file names', () => {
    expect(ambienceUrl('1900-1945', 'music')).toBe('/audio/ambience/1900-1945.m4a');
    expect(ambienceUrl('1900-1945', 'street')).toBe('/audio/ambience/1900-1945-street.mp3');
  });
});

describe('ambienceGain', () => {
  it('is silent when muted or recording, and lower in the chat than in the Time Machine', () => {
    expect(ambienceGain(true, 'normal', 'time-machine')).toBe(0);
    expect(ambienceGain(false, 'silent', 'time-machine')).toBe(0);
    expect(ambienceGain(false, 'silent', 'chat')).toBe(0);
    expect(ambienceGain(false, 'ducked', 'chat')).toBe(0);
    expect(ambienceGain(false, 'ducked', 'time-machine')).toBeLessThan(ambienceGain(false, 'normal', 'time-machine'));
    expect(AMBIENCE_LEVELS.chat.normal).toBeLessThan(AMBIENCE_LEVELS['time-machine'].normal / 2);
  });

  it('picks silent over ducked when the mic records while the guide speaks', () => {
    expect(ambienceMode(false)).toBe('normal');
    expect(ambienceMode(true)).toBe('ducked');
    expect(ambienceMode(true, true)).toBe('silent');
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

describe('crossfadeLoop', () => {
  it('shortens by the fade and joins end to start without a jump', () => {
    // A ramp has its biggest jump at the loop point: 1 back to 0.
    const ramp = Float32Array.from({ length: 1000 }, (_, i) => i / 999);
    const out = crossfadeLoop(ramp, 100);
    expect(out.length).toBe(900);
    expect(Math.abs(out[0] - out[out.length - 1])).toBeLessThan(0.01);
  });

  it('clamps the fade to half the buffer', () => {
    expect(crossfadeLoop(new Float32Array(10), 100).length).toBe(5);
  });
});
