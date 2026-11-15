/**
 * Tests for the voyage duck route maths (Agent 3).
 */
import { describe, expect, it } from 'vitest';
import type { LatLng } from '@/lib/contracts';
import { edgeFade, legLengthsM, loopFraction, positionAlong } from './route-path';

const at = (lat: number, lng: number): LatLng => ({ lat, lng });
const line = [at(0, 0), at(0, 10), at(0, 30)]; // two legs along the equator, 10 then 20 degrees

describe('legLengthsM', () => {
  it('measures each leg', () => {
    const [a, b] = legLengthsM(line);
    expect(b! / a!).toBeCloseTo(2, 5);
  });
});

describe('positionAlong', () => {
  it('starts at the first waypoint and ends at the last', () => {
    expect(positionAlong(line, 0).position).toEqual(at(0, 0));
    expect(positionAlong(line, 1).position.lng).toBeCloseTo(30, 6);
  });

  it('moves at a steady ground speed: a third of the way is the first waypoint bend', () => {
    expect(positionAlong(line, 1 / 3).position.lng).toBeCloseTo(10, 5);
    expect(positionAlong(line, 0.5).position.lng).toBeCloseTo(15, 5);
  });

  it('clamps outside 0 to 1', () => {
    expect(positionAlong(line, -4).position.lng).toBeCloseTo(0, 6);
    expect(positionAlong(line, 9).position.lng).toBeCloseTo(30, 6);
  });

  it('reports the east or west heading of the current leg', () => {
    expect(positionAlong(line, 0.2).eastward).toBe(1);
    const west = [at(0, 30), at(0, 0)];
    expect(positionAlong(west, 0.5).eastward).toBe(-1);
  });

  it('copes with repeated waypoints and needs two points', () => {
    expect(positionAlong([at(1, 1), at(1, 1), at(1, 3)], 0.5).position.lng).toBeCloseTo(2, 5);
    expect(() => positionAlong([at(0, 0)], 0.5)).toThrow();
  });
});

describe('loopFraction', () => {
  it('runs from 0 up to 1 and starts again', () => {
    expect(loopFraction(0, 10)).toBe(0);
    expect(loopFraction(2.5, 10)).toBeCloseTo(0.25, 6);
    expect(loopFraction(10, 10)).toBe(0);
    expect(loopFraction(14, 10)).toBeCloseTo(0.4, 6);
  });

  it('wraps negative times', () => {
    expect(loopFraction(-2, 10)).toBeCloseTo(0.8, 6);
  });
});

describe('edgeFade', () => {
  it('is invisible at both ends and solid in the middle', () => {
    expect(edgeFade(0, 0.1)).toBe(0);
    expect(edgeFade(1, 0.1)).toBe(0);
    expect(edgeFade(0.05, 0.1)).toBeCloseTo(0.5, 6);
    expect(edgeFade(0.95, 0.1)).toBeCloseTo(0.5, 6);
    expect(edgeFade(0.5, 0.1)).toBe(1);
  });

  it('is always solid with no margin', () => {
    expect(edgeFade(0, 0)).toBe(1);
  });
});
