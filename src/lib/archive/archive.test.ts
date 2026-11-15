/**
 * Tests for the data-directory reader. Owner: Agent 1. Every test builds a temporary data folder,
 * so the real `data/` is never read.
 */
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { landmarks } from '@fixtures/index';
import { applyLandmarkOverride, readEraDossier, readEraNotes, readLandmarkOverrides, urlsInNotes } from './index';

let root: string;
let dir: string;

beforeEach(() => {
  root = mkdtempSync(path.join(os.tmpdir(), 'chronodex-archive-test-'));
  dir = path.join(root, 'data');
  mkdirSync(path.join(dir, 'landmarks'), { recursive: true });
  mkdirSync(path.join(dir, 'eras'));
  mkdirSync(path.join(dir, 'reference'));
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});
afterEach(() => {
  rmSync(root, { recursive: true, force: true });
  vi.restoreAllMocks();
});

const landmarkFile = (over: Record<string, unknown> = {}) => ({
  schemaVersion: 1,
  id: 'queens-tower',
  status: 'validated',
  subject: { lat: 51.4986, lng: -0.1748 },
  photoSpot: { lat: 51.4983, lng: -0.1749 },
  captureRadiusM: 60,
  eraYears: [1962, 1893, 1893],
  referencePhoto: { status: 'commons_stand_in', file: 'data/reference/queens-tower.jpg' },
  ...over,
});
const write = (rel: string, body: unknown) => writeFileSync(path.join(dir, rel), typeof body === 'string' ? body : JSON.stringify(body));

describe('readLandmarkOverrides', () => {
  it('is empty with no landmarks folder', () => {
    expect(readLandmarkOverrides(path.join(root, 'nowhere')).size).toBe(0);
  });

  it('reads geometry, sorts and dedupes years, and finds the reference photo only if the file exists', () => {
    write('landmarks/queens-tower.json', landmarkFile());
    expect(readLandmarkOverrides(dir).get('queens-tower')).toMatchObject({ captureRadiusM: 60, eraYears: [1893, 1962], referencePhotoPath: null });
    write('reference/queens-tower.jpg', 'jpeg');
    expect(readLandmarkOverrides(dir).get('queens-tower')?.referencePhotoPath).toBe(path.join(root, 'data', 'reference', 'queens-tower.jpg'));
  });

  it('ignores blocked files, a missing photo status, an id that does not match the file name, and bad JSON', () => {
    write('landmarks/queens-tower.json', landmarkFile({ status: 'blocked' }));
    write('landmarks/v-and-a.json', landmarkFile({ id: 'other' }));
    write('landmarks/exhibition-road.json', '{ not json');
    write('landmarks/huxley-building.json', landmarkFile({ id: 'huxley-building', referencePhoto: { status: 'missing', file: null } }));
    const found = readLandmarkOverrides(dir);
    expect([...found.keys()]).toEqual(['huxley-building']);
    expect(found.get('huxley-building')?.referencePhotoPath).toBeNull();
  });
});

describe('applyLandmarkOverride', () => {
  const fixture = landmarks.find((l) => l.id === 'queens-tower')!;
  const override = { subject: { lat: 1, lng: 2 }, photoSpot: { lat: 3, lng: 4 }, captureRadiusM: 70, eraYears: [1893], referencePhotoPath: null };

  it('replaces geometry, radius, years and photo, and keeps name, blurb, rarity and art', () => {
    const out = applyLandmarkOverride(fixture, override, '/reference/queens-tower.jpg');
    expect(out).toMatchObject({ subject: override.subject, photoSpot: override.photoSpot, captureRadiusM: 70, eraYears: [1893], referencePhotoUrl: '/reference/queens-tower.jpg' });
    expect(out).toMatchObject({ name: fixture.name, blurb: fixture.blurb, rarity: fixture.rarity, spriteUrl: fixture.spriteUrl });
    expect(fixture.captureRadiusM).not.toBe(70);
  });

  it('keeps the fixture photo and years when the override has none', () => {
    const out = applyLandmarkOverride(fixture, { ...override, eraYears: [] }, null);
    expect(out.referencePhotoUrl).toBe(fixture.referencePhotoUrl);
    expect(out.eraYears).toEqual(fixture.eraYears);
  });
});

describe('readEraNotes and readEraDossier', () => {
  it('returns the notes trimmed, or null when missing or empty', () => {
    expect(readEraNotes('queens-tower_1893', dir)).toBeNull();
    write('eras/queens-tower_1893.notes.txt', '   \n');
    expect(readEraNotes('queens-tower_1893', dir)).toBeNull();
    write('eras/queens-tower_1893.notes.txt', '\nFACTS:\n- x [https://a.example/]\n');
    expect(readEraNotes('queens-tower_1893', dir)).toBe('FACTS:\n- x [https://a.example/]');
  });

  const dossier = (over: Record<string, unknown> = {}) => ({
    schemaVersion: 1,
    eraId: 'queens-tower_1893',
    status: 'validated',
    sources: [{ title: 'A', url: 'https://a.example/' }],
    referenceImages: [
      { url: 'https://upload.wikimedia.org/ctx.jpg', match: 'context' },
      { url: 'https://upload.wikimedia.org/near.jpg', match: 'nearby' },
      { url: 'https://upload.wikimedia.org/same.jpg', match: 'same_view' },
    ],
    ...over,
  });

  it('lists same-view images first, drops context images, and caps the count', () => {
    write('eras/queens-tower_1893.json', dossier());
    expect(readEraDossier('queens-tower_1893', dir)).toEqual({
      sources: [{ title: 'A', url: 'https://a.example/' }],
      referenceImageUrls: ['https://upload.wikimedia.org/same.jpg', 'https://upload.wikimedia.org/near.jpg'],
    });
    const many = Array.from({ length: 9 }, (_, i) => ({ url: `https://upload.wikimedia.org/${i}.jpg`, match: 'same_view' }));
    write('eras/queens-tower_1893.json', dossier({ referenceImages: many }));
    expect(readEraDossier('queens-tower_1893', dir)?.referenceImageUrls).toHaveLength(4);
  });

  it('yields nothing for a rejected era, a mismatched id, or a file that does not parse', () => {
    write('eras/queens-tower_1893.json', dossier({ status: 'rejected' }));
    expect(readEraDossier('queens-tower_1893', dir)).toBeNull();
    write('eras/queens-tower_1893.json', dossier({ eraId: 'queens-tower_1962' }));
    expect(readEraDossier('queens-tower_1893', dir)).toBeNull();
    write('eras/queens-tower_1893.json', 'oops');
    expect(readEraDossier('queens-tower_1893', dir)).toBeNull();
  });
});

describe('urlsInNotes', () => {
  it('finds bracketed citations and image lines, strips punctuation, and removes duplicates', () => {
    const text = 'FACTS:\n- Opened. [https://a.example/x] [https://b.example/y].\nIMAGES:\n- https://upload.wikimedia.org/i.jpg (page: https://commons.wikimedia.org/wiki/File:i.jpg), Public domain\n- again [https://a.example/x]';
    expect(urlsInNotes(text)).toEqual(['https://a.example/x', 'https://b.example/y', 'https://upload.wikimedia.org/i.jpg', 'https://commons.wikimedia.org/wiki/File:i.jpg']);
    expect(urlsInNotes('no links')).toEqual([]);
  });
});
