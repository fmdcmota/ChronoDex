/**
 * Tests for region picking (Agent 3). Places are real city centres.
 */
import { describe, expect, it } from 'vitest';
import type { LatLng } from '@/lib/contracts';
import { FLY_MAX_M, groupIntoRegions, pickRegion, shouldFly } from './map-region';

const at = (lat: number, lng: number): LatLng => ({ lat, lng });
const pos = (p: LatLng) => p;
const kensington = [at(51.4994, -0.1745), at(51.5009, -0.1773), at(51.4967, -0.1764)];
const singapore = [at(1.2868, 103.8545), at(1.2816, 103.8636)];
const norway = [at(60.3913, 5.3221)];

describe('groupIntoRegions', () => {
  it('returns nothing for nothing', () => {
    expect(groupIntoRegions([], pos)).toEqual([]);
  });

  it('keeps one city together and splits far cities, biggest first', () => {
    const regions = groupIntoRegions([...norway, ...singapore, ...kensington], pos);
    expect(regions.map((r) => r.items.length)).toEqual([3, 2, 1]);
    expect(regions[0]!.items).toEqual(kensington);
  });

  it('merges regions that a middle item bridges', () => {
    const a = at(0, 0);
    const c = at(0, 0.4);
    const bridge = at(0, 0.2);
    expect(groupIntoRegions([a, c], pos)).toHaveLength(2);
    expect(groupIntoRegions([a, c, bridge], pos)).toHaveLength(1);
  });

  it('honours a custom gap', () => {
    expect(groupIntoRegions(kensington, pos, 10)).toHaveLength(3);
  });
});

describe('pickRegion', () => {
  const regions = groupIntoRegions([...kensington, ...singapore, ...norway], pos);

  it('is null with no regions', () => {
    expect(pickRegion([], pos, null)).toBeNull();
  });

  it('takes the biggest region before a fix', () => {
    expect(pickRegion(regions, pos, null)!.items).toEqual(kensington);
  });

  it('takes the region nearest the player', () => {
    expect(pickRegion(regions, pos, at(1.29, 103.85))!.items).toEqual(singapore);
    expect(pickRegion(regions, pos, at(59.9, 10.7))!.items).toEqual(norway);
  });
});

describe('shouldFly', () => {
  it('flies short hops and jumps long ones', () => {
    expect(shouldFly(at(51.5, -0.17), at(51.51, -0.16))).toBe(true);
    expect(shouldFly(at(51.5, -0.17), at(1.29, 103.85))).toBe(false);
    expect(FLY_MAX_M).toBeGreaterThan(REGION_SANITY);
  });
});

const REGION_SANITY = 30_000;
