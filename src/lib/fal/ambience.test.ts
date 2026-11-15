/**
 * Tests for the period ambience: the year-to-bucket mapping, the prompts' safety rails and the generated files'
 * manifest. Owner: Agent 2 (Studio). Nothing here calls fal.
 */
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { AMBIENCE_BUCKETS, MUSIC_LOOP_SECONDS, STREET_LOOP_SECONDS, ambienceBucketFor, buildMusicPrompt, buildStreetPrompt } from './ambience';
import { MODELS } from './models';

describe('ambienceBucketFor', () => {
  it('puts the boundaries at 1900, 1946 and 1980', () => {
    expect(ambienceBucketFor(1893)).toBe('1850-1899');
    expect(ambienceBucketFor(1899)).toBe('1850-1899');
    expect(ambienceBucketFor(1900)).toBe('1900-1945');
    expect(ambienceBucketFor(1941)).toBe('1900-1945');
    expect(ambienceBucketFor(1945)).toBe('1900-1945');
    expect(ambienceBucketFor(1946)).toBe('1946-1979');
    expect(ambienceBucketFor(1962)).toBe('1946-1979');
    expect(ambienceBucketFor(1979)).toBe('1946-1979');
    expect(ambienceBucketFor(1980)).toBe('1980-now');
    expect(ambienceBucketFor(2011)).toBe('1980-now');
  });

  it('uses the earliest bucket for years before 1850, and every demo era lands in a real bucket', () => {
    expect(ambienceBucketFor(1700)).toBe('1850-1899');
    for (const year of [1862, 1871, 1881, 1885, 1893, 1941, 1961, 1962, 2011]) expect(AMBIENCE_BUCKETS).toContain(ambienceBucketFor(year));
  });
});

describe('ambience prompts', () => {
  // Real artists and groups a model might be steered towards. The human's rule: original, nothing imitating a real song.
  const REAL_NAMES = /beatles|rolling stones|elvis|sinatra|abba|queen\b|bowie|madonna|mozart|beethoven|gilbert|sullivan|glenn miller|vera lynn|kinks|who\b/i;

  it('every music prompt asks for instrumental, original, quiet and loopable, and names no real artist or song', () => {
    for (const bucket of AMBIENCE_BUCKETS) {
      const prompt = buildMusicPrompt(bucket);
      expect(prompt, bucket).toContain('Instrumental only, no vocals and no lyrics');
      expect(prompt, bucket).toContain('An original composition, not based on any existing song');
      expect(prompt, bucket).toMatch(/quiet/i);
      expect(prompt, bucket).toMatch(/loop/i);
      expect(prompt, bucket).not.toMatch(REAL_NAMES);
    }
  });

  it('every street prompt is free of music and clear speech, so it layers under the music', () => {
    for (const bucket of AMBIENCE_BUCKETS) {
      const prompt = buildStreetPrompt(bucket);
      expect(prompt, bucket).toContain('No music. No clear speech.');
      expect(prompt, bucket).toMatch(/loops/);
      expect(prompt, bucket).not.toMatch(REAL_NAMES);
    }
  });

  it('describes the right period for each bucket', () => {
    expect(buildMusicPrompt('1850-1899')).toMatch(/Victorian.*piano/);
    expect(buildStreetPrompt('1850-1899')).toMatch(/horse hooves/);
    expect(buildMusicPrompt('1900-1945')).toMatch(/1940s dance band.*wireless/);
    expect(buildMusicPrompt('1946-1979')).toMatch(/1960s.*transistor radio/);
    expect(buildMusicPrompt('1980-now')).toMatch(/present-day/);
  });

  it('keeps the loop lengths inside the models\' limits', () => {
    expect(MUSIC_LOOP_SECONDS).toBeGreaterThanOrEqual(30);
    expect(MUSIC_LOOP_SECONDS).toBeLessThanOrEqual(60);
    expect(STREET_LOOP_SECONDS).toBeGreaterThanOrEqual(0.5);
    expect(STREET_LOOP_SECONDS).toBeLessThanOrEqual(30);
    expect(MODELS.ambience_music.fallback).toBeTruthy();
    expect(MODELS.ambience_street.fallback).toBeTruthy();
  });
});

describe('the generated files', () => {
  const dir = path.resolve(__dirname, '..', '..', '..', 'public', 'audio', 'ambience');
  const manifestPath = path.join(dir, 'manifest.json');

  it.skipIf(!existsSync(manifestPath))('the manifest lists exactly one music and one street file per bucket, and each exists', () => {
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as { files: { bucket: string; layer: string; file: string; seconds: number }[] };
    for (const bucket of AMBIENCE_BUCKETS) {
      for (const layer of ['music', 'street']) {
        const entries = manifest.files.filter((f) => f.bucket === bucket && f.layer === layer);
        expect(entries, `${bucket} ${layer}`).toHaveLength(1);
        expect(existsSync(path.join(dir, entries[0].file)), entries[0].file).toBe(true);
        expect(entries[0].seconds).toBe(layer === 'music' ? MUSIC_LOOP_SECONDS : STREET_LOOP_SECONDS);
      }
    }
  });
});
