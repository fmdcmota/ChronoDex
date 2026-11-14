/**
 * Unit tests for the shared helpers (MASTER.md 4.2). Owner: Agent 1.
 */
import { describe, expect, it } from 'vitest';
import {
  GAME,
  bearingDeg,
  buildStages,
  eraIdOf,
  eraNeedsGeneration,
  haversineM,
  parseEraId,
  resolveCapture,
  withinCaptureRange,
  type Landmark,
} from './index';

describe('eraIdOf and parseEraId', () => {
  it('builds the documented example', () => {
    expect(eraIdOf('queens-tower', 1893)).toBe('queens-tower_1893');
  });

  it('round-trips, including negative years', () => {
    for (const [id, year] of [['royal-albert-hall', 1871], ['v-and-a', 1941], ['a', -50]] as const) {
      expect(parseEraId(eraIdOf(id, year))).toEqual({ landmarkId: id, year });
    }
  });

  it.each(['Queens-Tower', 'queens_tower', 'queens--tower', '-queens', '', 'queens tower'])(
    'rejects landmark id %j',
    (id) => {
      expect(() => eraIdOf(id, 1893)).toThrow();
    },
  );

  it('rejects a non-integer year', () => {
    expect(() => eraIdOf('queens-tower', 1893.5)).toThrow();
    expect(() => eraIdOf('queens-tower', Number.NaN)).toThrow();
  });

  it.each(['queens-tower', 'queens-tower_', '_1893', 'queens-tower_18x3', 'Queens_1893', 'a_b_1893', 'queens-tower_1893.0'])(
    'parseEraId rejects %j',
    (id) => {
      expect(() => parseEraId(id)).toThrow();
    },
  );
});

describe('haversineM', () => {
  it('is zero for the same point', () => {
    expect(haversineM({ lat: 51.5, lng: -0.17 }, { lat: 51.5, lng: -0.17 })).toBe(0);
  });

  it('gives about 111.2 km for one degree of latitude', () => {
    expect(haversineM({ lat: 0, lng: 0 }, { lat: 1, lng: 0 })).toBeCloseTo(111_195, -1);
  });

  it('is symmetric and right for a short street distance', () => {
    const a = { lat: 51.4983, lng: -0.1768 };
    const b = { lat: 51.4983, lng: -0.1754 };
    // 0.0014 degrees of longitude at 51.5 N is about 96.9 m.
    expect(haversineM(a, b)).toBeCloseTo(96.9, 0);
    expect(haversineM(a, b)).toBeCloseTo(haversineM(b, a), 9);
  });

  it('handles antipodal points', () => {
    expect(haversineM({ lat: 0, lng: 0 }, { lat: 0, lng: 180 })).toBeCloseTo(Math.PI * 6_371_008.8, 0);
  });
});

describe('bearingDeg', () => {
  const o = { lat: 51.5, lng: -0.17 };
  it.each([
    ['north', { lat: 51.51, lng: -0.17 }, 0],
    ['south', { lat: 51.49, lng: -0.17 }, 180],
  ] as const)('due %s', (_name, to, expected) => {
    expect(bearingDeg(o, to)).toBeCloseTo(expected, 6);
  });

  it('east is about 90 and west about 270', () => {
    expect(bearingDeg(o, { lat: 51.5, lng: -0.16 })).toBeCloseTo(90, 1);
    expect(bearingDeg(o, { lat: 51.5, lng: -0.18 })).toBeCloseTo(270, 1);
  });

  it('stays in [0, 360) and is 0 for the same point', () => {
    expect(bearingDeg(o, o)).toBe(0);
    const b = bearingDeg(o, { lat: 51.5001, lng: -0.17001 });
    expect(b).toBeGreaterThanOrEqual(0);
    expect(b).toBeLessThan(360);
  });
});

describe('withinCaptureRange', () => {
  const r = GAME.CAPTURE_RADIUS_M;
  it('accepts inside and on the radius with perfect accuracy', () => {
    expect(withinCaptureRange(0, 0, r)).toBe(true);
    expect(withinCaptureRange(r, 0, r)).toBe(true);
    expect(withinCaptureRange(r + 0.01, 0, r)).toBe(false);
  });

  it('forgives reported accuracy up to the allowance and no more', () => {
    const max = GAME.ACCURACY_ALLOWANCE_MAX_M;
    expect(withinCaptureRange(r + 10, 10, r)).toBe(true);
    expect(withinCaptureRange(r + max, 1000, r)).toBe(true);
    expect(withinCaptureRange(r + max + 0.01, 1000, r)).toBe(false);
  });

  it('rejects NaN inputs', () => {
    expect(withinCaptureRange(Number.NaN, 0, r)).toBe(false);
    expect(withinCaptureRange(10, Number.NaN, r)).toBe(false);
  });
});

describe('resolveCapture', () => {
  const landmark = (id: string, lat: number, radius: number = GAME.CAPTURE_RADIUS_M): Landmark => ({
    id,
    name: id,
    blurb: '',
    photoSpot: { lat, lng: 0 },
    subject: { lat, lng: 0 },
    captureRadiusM: radius,
    rarity: 'common',
    spriteUrl: 's',
    badgeUrl: 'b',
    referencePhotoUrl: 'r',
    eraYears: [],
  });
  // 0.0001 degrees of latitude is about 11.1 m.
  const near = landmark('near', 0.0004); // about 44 m
  const far = landmark('far', 0.01); // about 1.1 km

  it('hits the landmark in range and reports it as nearest', () => {
    const result = resolveCapture({ lat: 0, lng: 0 }, 5, [far, near]);
    expect(result.hit?.landmark.id).toBe('near');
    expect(result.nearest?.landmark.id).toBe('near');
  });

  it('misses when out of range but still gives the nearest', () => {
    const result = resolveCapture({ lat: 0, lng: 0 }, 0, [far]);
    expect(result.hit).toBeNull();
    expect(result.nearest?.landmark.id).toBe('far');
    expect(result.nearest?.distanceM).toBeCloseTo(1112, -1);
  });

  it('respects a landmark with a larger capture radius', () => {
    expect(resolveCapture({ lat: 0, lng: 0 }, 0, [landmark('big', 0.01, 2000)]).hit?.landmark.id).toBe('big');
  });

  it('returns nulls with no landmarks', () => {
    expect(resolveCapture({ lat: 0, lng: 0 }, 0, [])).toEqual({ hit: null, nearest: null });
  });
});

describe('stages', () => {
  it('lists five core stages, or ten with video, all pending, with the year in the scene label', () => {
    expect(buildStages(1893, false).map((s) => s.key)).toEqual(['brief', 'scene', 'panorama', 'headshot', 'narration']);
    const all = buildStages(1893, true);
    expect(all).toHaveLength(10);
    expect(all.every((s) => s.state === 'pending')).toBe(true);
    expect(all.find((s) => s.key === 'scene')?.label).toContain('1893');
  });

  it('decides when generation is needed', () => {
    expect(eraNeedsGeneration({ state: 'missing', videoState: 'missing' }, false)).toBe(true);
    expect(eraNeedsGeneration({ state: 'ready', videoState: 'missing' }, false)).toBe(false);
    expect(eraNeedsGeneration({ state: 'ready', videoState: 'missing' }, true)).toBe(true);
    expect(eraNeedsGeneration({ state: 'ready', videoState: 'ready' }, true)).toBe(false);
    expect(eraNeedsGeneration({ state: 'failed', videoState: 'ready' }, false)).toBe(true);
  });
});
