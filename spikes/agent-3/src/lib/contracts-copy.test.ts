/**
 * Tests for the spike copy of the contract helpers (MASTER.md section 4.2). Owner: Agent 3.
 * Reference values were worked out independently, by hand and with a second formula.
 */
import { describe, expect, it } from 'vitest';
import { bearingDeg, GAME, haversineM, withinCaptureRange } from './contracts-copy';

describe('haversineM', () => {
  it('is zero for the same point', () => {
    expect(haversineM({ lat: 51.5, lng: -0.17 }, { lat: 51.5, lng: -0.17 })).toBe(0);
  });

  it('gives about 111.2 km for one degree of latitude', () => {
    expect(haversineM({ lat: 0, lng: 0 }, { lat: 1, lng: 0 })).toBeCloseTo(111_195, -1);
  });

  it('gives the Queen’s Tower to Royal Albert Hall distance at city scale', () => {
    // Equirectangular check: dLat 0.0026555 deg = 295.3 m, dLng 0.0005153 deg * cos(51.5) = 35.7 m.
    const d = haversineM({ lat: 51.4983515, lng: -0.1768905 }, { lat: 51.501007, lng: -0.1774058 });
    expect(d).toBeGreaterThan(296);
    expect(d).toBeLessThan(299);
  });

  it('is symmetric', () => {
    const a = { lat: 51.4965, lng: -0.176 };
    const b = { lat: 51.4989, lng: -0.1789 };
    expect(haversineM(a, b)).toBeCloseTo(haversineM(b, a), 9);
  });
});

describe('bearingDeg', () => {
  const o = { lat: 51.5, lng: -0.17 };
  it.each([
    ['north', { lat: 51.51, lng: -0.17 }, 0],
    ['east', { lat: 51.5, lng: -0.16 }, 90],
    ['south', { lat: 51.49, lng: -0.17 }, 180],
    ['west', { lat: 51.5, lng: -0.18 }, 270],
  ])('points %s', (_name, to, expected) => {
    expect(bearingDeg(o, to)).toBeCloseTo(expected, 0);
  });

  it('always returns a value in [0, 360)', () => {
    const b = bearingDeg(o, { lat: 51.51, lng: -0.1700001 });
    expect(b).toBeGreaterThanOrEqual(0);
    expect(b).toBeLessThan(360);
  });
});

describe('withinCaptureRange', () => {
  const r = GAME.CAPTURE_RADIUS_M;
  it('accepts a player inside the radius', () => {
    expect(withinCaptureRange(30, 5, r)).toBe(true);
  });
  it('accepts exactly on the edge', () => {
    expect(withinCaptureRange(50, 0, r)).toBe(true);
  });
  it('forgives reported accuracy', () => {
    expect(withinCaptureRange(70, 20, r)).toBe(true);
    expect(withinCaptureRange(71, 20, r)).toBe(false);
  });
  it('forgives at most ACCURACY_ALLOWANCE_MAX_M', () => {
    expect(withinCaptureRange(75, 500, r)).toBe(true);
    expect(withinCaptureRange(76, 500, r)).toBe(false);
  });
});
