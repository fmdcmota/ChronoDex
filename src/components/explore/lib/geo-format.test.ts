/**
 * Tests for the distance and direction labels (tasks A3-04, A3-06, A3-09). Owner: Agent 3.
 * Ported from spikes/agent-3/src/lib/geo-format.test.ts; uses the real fixtures instead of the
 * spike's SPIKE_LANDMARKS.
 */
import { describe, expect, it } from 'vitest';
import { landmarks } from '@fixtures/index';
import { haversineM } from '@/lib/contracts';
import { compassWord, directionHint, formatDistance, nearestLandmark } from './geo-format';

describe('formatDistance', () => {
  it.each([
    [0, '0 m'],
    [7.4, '7 m'],
    [99.4, '99 m'],
    [99.6, '100 m'],
    [123, '120 m'],
    [125, '130 m'],
    [994, '990 m'],
    [995, '1.0 km'],
    [1460, '1.5 km'],
    [12_345, '12.3 km'],
  ])('%d m reads as %s', (m, label) => {
    expect(formatDistance(m)).toBe(label);
  });

  it('treats bad input as zero', () => {
    expect(formatDistance(-5)).toBe('0 m');
    expect(formatDistance(Number.NaN)).toBe('0 m');
  });
});

describe('compassWord', () => {
  it.each([
    [0, 'north'],
    [22.4, 'north'],
    [22.5, 'north-east'],
    [45, 'north-east'],
    [90, 'east'],
    [135, 'south-east'],
    [180, 'south'],
    [225, 'south-west'],
    [270, 'west'],
    [315, 'north-west'],
    [337.4, 'north-west'],
    [337.5, 'north'],
    [359.9, 'north'],
    [360, 'north'],
    [-90, 'west'],
    [450, 'east'],
  ])('%d degrees is %s', (deg, word) => {
    expect(compassWord(deg)).toBe(word);
  });
});

describe('nearestLandmark', () => {
  const qt = landmarks.find((l) => l.id === 'queens-tower')!;

  it('finds the landmark whose photo spot the player stands on', () => {
    const fix = nearestLandmark(qt.photoSpot, landmarks);
    expect(fix?.landmark.id).toBe('queens-tower');
    expect(fix?.distanceM).toBeCloseTo(0, 6);
  });

  it('skips excluded ids', () => {
    const fix = nearestLandmark(qt.photoSpot, landmarks, new Set(['queens-tower']));
    expect(fix).not.toBeNull();
    expect(fix?.landmark.id).not.toBe('queens-tower');
  });

  it('returns null when nothing is left', () => {
    const all = new Set(landmarks.map((l) => l.id));
    expect(nearestLandmark(qt.photoSpot, landmarks, all)).toBeNull();
    expect(nearestLandmark(qt.photoSpot, [])).toBeNull();
  });

  it('writes a readable hint', () => {
    // 0.001 deg south of the Queen's Tower photo spot is about 111 m, so the tower is north.
    const fix = nearestLandmark({ lat: qt.photoSpot.lat - 0.001, lng: qt.photoSpot.lng }, [qt]);
    expect(directionHint(fix!)).toBe('Queen’s Tower is 110 m north');
  });
});

describe('fixture landmarks', () => {
  it('has thirteen landmarks (six in London, then Singapore, Oslo, Cambridge and Beijing) with unique kebab-case ids and ascending years', () => {
    expect(landmarks).toHaveLength(13);
    expect(new Set(landmarks.map((l) => l.id)).size).toBe(13);
    for (const l of landmarks) {
      expect(l.id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
      expect([...l.eraYears].sort((a, b) => a - b)).toEqual(l.eraYears);
    }
  });

  it('keeps every photo spot within 120 m of its subject', () => {
    for (const l of landmarks) {
      expect(haversineM(l.photoSpot, l.subject), l.id).toBeLessThan(120);
    }
  });
});
