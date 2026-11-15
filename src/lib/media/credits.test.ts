/**
 * Tests for picture credits (credits.ts) against small data folders and the real data/ delivery.
 *
 * Owner: Agent 4 (Time Machine). Task A4-b.
 */
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { eraPictureCredits, licenceUrlFor } from './credits';

describe('licenceUrlFor', () => {
  it('maps Creative Commons names to deeds and leaves the rest null', () => {
    expect(licenceUrlFor('CC BY-SA 4.0')).toBe('https://creativecommons.org/licenses/by-sa/4.0/');
    expect(licenceUrlFor('CC BY 2.0')).toBe('https://creativecommons.org/licenses/by/2.0/');
    expect(licenceUrlFor('CC0')).toBe('https://creativecommons.org/publicdomain/zero/1.0/');
    expect(licenceUrlFor('Public domain')).toBeNull();
  });
});

describe('eraPictureCredits', () => {
  it('reads the real Queen\'s Tower 1893 delivery: the CC BY-SA photo first, then the period images', async () => {
    const credits = await eraPictureCredits('queens-tower', 'queens-tower_1893', path.join(process.cwd(), 'data'));
    expect(credits[0]).toMatchObject({ role: 'reference', author: 'Shadowssettle', licence: 'CC BY-SA 4.0' });
    expect(credits.filter((c) => c.role === 'period').length).toBeGreaterThanOrEqual(1);
  });

  it('gives nothing for missing or malformed files, and skips H1 photos', async () => {
    const dir = await mkdtemp(path.join(tmpdir(), 'credits-'));
    await mkdir(path.join(dir, 'landmarks'));
    await mkdir(path.join(dir, 'eras'));
    await writeFile(path.join(dir, 'landmarks', 'a.json'), JSON.stringify({ referencePhoto: { status: 'h1_validated', licence: 'CC BY 4.0' } }));
    await writeFile(path.join(dir, 'eras', 'a_1900.json'), '{broken');
    expect(await eraPictureCredits('a', 'a_1900', dir)).toEqual([]);
    expect(await eraPictureCredits('nope', 'nope_1', dir)).toEqual([]);
    await rm(dir, { recursive: true, force: true });
  });
});
