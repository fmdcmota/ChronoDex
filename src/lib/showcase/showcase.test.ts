/**
 * Unit tests for the showcase (no-credit) rules and the capture-photo folder. Owner: Agent 4 (R3-4e).
 */
import { mkdtemp, readdir, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { Era } from '@/lib/contracts';
import { isShowablePhotoUrl } from '@/components/explore/lib/dex-view';
import { heroBrief, landmarks, missingEra, populatedEra } from '@fixtures/index';
import { eraHasContent, showcaseChatNotice, showcaseEras, showcaseLandmarks } from './index';
import { labelCapturePhoto, photoIdFromUrl, photoStamp, saveCapturePhoto } from './photos';

const [first, second] = landmarks;
const ready = (year: number): Era => populatedEra(missingEra(first, year), heroBrief, false);

describe('eraHasContent', () => {
  it('accepts a generated era and refuses a missing one', () => {
    expect(eraHasContent(ready(1893))).toBe(true);
    expect(eraHasContent(missingEra(first, 1893))).toBe(false);
  });
  it('refuses a ready era with no picture', () => {
    expect(eraHasContent({ ...ready(1893), panorama: null, sceneImageUrl: null })).toBe(false);
  });
});

describe('showcaseEras and showcaseLandmarks', () => {
  it('keeps only generated eras, in order', () => {
    expect(showcaseEras([missingEra(first, 1800), ready(1893), missingEra(first, 1900)]).map((e) => e.year)).toEqual([1893]);
  });
  it('drops landmarks with nothing generated and trims eraYears to the generated years', async () => {
    const eras: Record<string, Era[]> = {
      [first.id]: [ready(1962), missingEra(first, 1700), ready(1893)],
      [second.id]: [missingEra(second, 1871)],
    };
    const out = await showcaseLandmarks([first, second], async (id) => eras[id] ?? []);
    expect(out.map((l) => l.id)).toEqual([first.id]);
    expect(out[0].eraYears).toEqual([1893, 1962]);
  });
});

describe('showcaseChatNotice', () => {
  it('names the guide by first name and the year', () => {
    const text = showcaseChatNotice('Thomas Meacham', 1893);
    expect(text).toMatch(/^Chat is switched off on this public demo to save AI tokens\./);
    expect(text).toContain('talk with Thomas:');
    expect(text).toContain('daily life in 1893');
  });
});

describe('capture photos in a folder', () => {
  let dir: string;
  beforeEach(async () => {
    dir = await mkdtemp(path.join(os.tmpdir(), 'chronodex-photos-'));
    process.env.CAPTURE_PHOTO_DIR = dir;
  });
  afterEach(async () => {
    delete process.env.CAPTURE_PHOTO_DIR;
    await rm(dir, { recursive: true, force: true });
  });

  it('writes the JPEG, returns a placeholder URL the Dex never shows, then labels it with the landmark', async () => {
    const when = new Date(2026, 10, 17, 14, 5, 9);
    const url = await saveCapturePhoto(new Blob([new Uint8Array([0xff, 0xd8, 0xff, 1, 2])]), when);
    const id = photoIdFromUrl(url);
    expect(id).toMatch(/^2026-11-17_14-05-09_[0-9a-f]{8}$/);
    expect(isShowablePhotoUrl(url)).toBe(false);
    expect([...(await readFile(path.join(dir, `${id}.jpg`)))]).toEqual([0xff, 0xd8, 0xff, 1, 2]);

    await labelCapturePhoto(url, 'queens-tower');
    expect(await readdir(dir)).toEqual([`${id}_queens-tower.jpg`]);
    await labelCapturePhoto(url, 'queens-tower'); // the same photo again: no error, nothing changes
    expect(await readdir(dir)).toEqual([`${id}_queens-tower.jpg`]);
  });

  it('never touches a path a URL could smuggle in', async () => {
    expect(photoIdFromUrl('https://showcase.invalid/../../secret.jpg')).toBeNull();
    expect(photoIdFromUrl('https://example.com/2026-11-17_14-05-09_abcdef01.jpg')).toBeNull();
    await labelCapturePhoto('https://showcase.invalid/2026-11-17_14-05-09_abcdef01.jpg', '../evil');
    expect(await readdir(dir)).toEqual([]);
  });

  it('stamps local time, zero-padded', () => {
    expect(photoStamp(new Date(2026, 0, 2, 3, 4, 5))).toBe('2026-01-02_03-04-05');
  });
});

describe('isShowablePhotoUrl', () => {
  it('still shows ordinary web photos', () => {
    expect(isShowablePhotoUrl('https://example.com/invalid.jpg')).toBe(true);
  });
});
