/**
 * Tests for the Dex grid helpers (task A3-07). Owner: Agent 3.
 */
import { describe, expect, it } from 'vitest';
import { landmarks } from '@fixtures/index';
import type { Capture } from '@/lib/contracts';
import { buildDexEntries, countCollected, formatCaptureDate, isShowablePhotoUrl, lockedBadgeUrl } from './dex-view';

/** A capture of `landmarkId` at `capturedAt`. */
function capture(landmarkId: string, capturedAt: string, id = `${landmarkId}-${capturedAt}`): Capture {
  return {
    id,
    playerId: 'p',
    landmarkId,
    photoUrl: 'https://example.com/p.jpg',
    location: { lat: 51.5, lng: -0.17 },
    accuracyM: 5,
    distanceM: 10,
    capturedAt,
  };
}

describe('buildDexEntries', () => {
  it('lists every landmark in order, empty when nothing is collected', () => {
    const entries = buildDexEntries(landmarks, []);
    expect(entries.map((e) => e.landmark.id)).toEqual(landmarks.map((l) => l.id));
    expect(entries.every((e) => e.capture === null)).toBe(true);
    expect(countCollected(entries)).toBe(0);
  });

  it('attaches captures to their landmark and counts them', () => {
    const c = capture('queens-tower', '2026-11-14T16:00:00Z');
    const entries = buildDexEntries(landmarks, [c]);
    expect(entries.find((e) => e.landmark.id === 'queens-tower')?.capture).toBe(c);
    expect(countCollected(entries)).toBe(1);
  });

  it('keeps the earliest capture when there are two', () => {
    const late = capture('v-and-a', '2026-11-14T18:00:00Z');
    const early = capture('v-and-a', '2026-11-14T10:00:00Z');
    expect(buildDexEntries(landmarks, [late, early]).find((e) => e.landmark.id === 'v-and-a')?.capture).toBe(early);
    expect(buildDexEntries(landmarks, [early, late]).find((e) => e.landmark.id === 'v-and-a')?.capture).toBe(early);
  });

  it('ignores captures of landmarks that do not exist', () => {
    const entries = buildDexEntries(landmarks, [capture('atlantis', '2026-11-14T16:00:00Z')]);
    expect(entries).toHaveLength(landmarks.length);
    expect(countCollected(entries)).toBe(0);
  });
});

describe('formatCaptureDate', () => {
  it('formats a UTC date like a card', () => {
    expect(formatCaptureDate('2026-11-14T16:00:00Z', 'UTC')).toBe('14 Nov 2026');
  });
  it('returns an empty string for nonsense', () => {
    expect(formatCaptureDate('not a date')).toBe('');
    expect(formatCaptureDate('')).toBe('');
  });
});

describe('badge and photo addresses', () => {
  it('puts -locked before the extension', () => {
    expect(lockedBadgeUrl('/sprites/badges/queens-tower.png')).toBe('/sprites/badges/queens-tower-locked.png');
  });
  it('allows web and blob photo addresses only', () => {
    expect(isShowablePhotoUrl('https://x/y.jpg')).toBe(true);
    expect(isShowablePhotoUrl('http://x/y.jpg')).toBe(true);
    expect(isShowablePhotoUrl('blob:http://localhost/abc')).toBe(true);
    expect(isShowablePhotoUrl('javascript:alert(1)')).toBe(false);
    expect(isShowablePhotoUrl('data:image/png;base64,AAAA')).toBe(false);
    expect(isShowablePhotoUrl('')).toBe(false);
  });
});
