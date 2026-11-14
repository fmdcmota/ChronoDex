/**
 * Tests for the accuracy ring (task A3-05). Owner: Agent 3.
 */
import { describe, expect, it } from 'vitest';
import { circlePolygon } from './map-geometry';
import { haversineM } from './contracts-copy';

describe('circlePolygon', () => {
  const centre = { lat: 51.4988, lng: -0.1789 };

  it('is closed and in [lng, lat] order', () => {
    const ring = circlePolygon(centre, 30).geometry.coordinates[0]!;
    expect(ring[0]).toEqual(ring[ring.length - 1]);
    expect(ring[0]![0]).toBeCloseTo(centre.lng, 6);
    expect(ring[0]![1]).toBeGreaterThan(centre.lat);
  });

  it('puts every corner the right distance from the centre', () => {
    for (const [lng, lat] of circlePolygon(centre, 40).geometry.coordinates[0]!) {
      expect(haversineM(centre, { lat, lng })).toBeCloseTo(40, 0);
    }
  });

  it('collapses to the centre for radius 0 or less', () => {
    for (const [lng, lat] of circlePolygon(centre, -5).geometry.coordinates[0]!) {
      expect([lng, lat]).toEqual([centre.lng, centre.lat]);
    }
  });
});
