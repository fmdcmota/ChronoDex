/**
 * Tests for the fal sprite route's local parts: the prompt builder and the pixelate step
 * (task A3-01). Owner: Agent 3. No network, no fal call.
 */
import { describe, expect, it } from 'vitest';
import { buildSpritePrompt, SPRITE_SUBJECTS } from './prompts';
import { nearestPaletteColour, pixelate } from '../pixel/pixelate';
import { hex, PixelCanvas } from '../pixel/canvas';
import { SPRITE_PX } from '../pixel/sprites';
import { SPIKE_LANDMARKS } from '../../src/lib/landmarks';
import { PALETTE } from '../../src/lib/palette';

describe('buildSpritePrompt', () => {
  it('has a description for every landmark', () => {
    for (const l of SPIKE_LANDMARKS) expect(SPRITE_SUBJECTS[l.id], l.id).toBeTruthy();
  });

  it('asks for a plain background and no text or people', () => {
    const p = buildSpritePrompt({ id: 'queens-tower' });
    expect(p).toContain('green copper dome');
    expect(p).toContain('Plain flat light-grey background');
    expect(p).toContain('no text, no people');
  });

  it('never names a game or a company (assumption A1)', () => {
    for (const l of SPIKE_LANDMARKS) {
      expect(buildSpritePrompt(l)).not.toMatch(/pok[eé]mon|nintendo|game ?boy|zelda|final fantasy/i);
    }
  });

  it('throws for an unknown landmark', () => {
    expect(() => buildSpritePrompt({ id: 'nowhere' })).toThrow();
  });
});

describe('pixelate', () => {
  it('snaps colours to the palette', () => {
    expect(nearestPaletteColour({ r: 200, g: 86, b: 60, a: 255 })).toEqual(hex(PALETTE.brick));
  });

  it('shrinks a cut-out to a bottom-centred, outlined 32 px sprite', () => {
    // A 200 x 400 brick-red block in a 512 px transparent image.
    const src = new PixelCanvas(512, 512);
    src.rect(156, 56, 355, 455, hex('#c9563c'));
    const s = pixelate(src);
    expect([s.width, s.height]).toEqual([SPRITE_PX, SPRITE_PX]);
    // 2:1 tall block in a 30 px box: 15 wide, 30 high, bottom row 30, centred.
    expect(s.get(15, 20)).toEqual(hex(PALETTE.brick));
    expect(s.get(16, 30)).toEqual(hex(PALETTE.brick));
    expect(s.get(16, 31)).toEqual(hex(PALETTE.ink));
    expect(s.filled(2, 15)).toBe(false);
  });

  it('returns an empty sprite for an empty image', () => {
    const s = pixelate(new PixelCanvas(64, 64));
    expect(s.data.every((v) => v === 0)).toBe(true);
  });
});
