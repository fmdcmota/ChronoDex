/**
 * Tests for the pixel canvas, sprites and badges (task A3-01). Owner: Agent 3.
 */
import { describe, expect, it } from 'vitest';
import { PNG } from 'pngjs';
import { CLEAR, hex, PixelCanvas } from './canvas';
import { BADGE_PX, makeBadge } from './badges';
import { SPRITE_PX, SPRITES } from './sprites';
import { ART_LANDMARKS } from '../../src/lib/landmarks';

describe('PixelCanvas', () => {
  it('parses hex colours and rejects bad ones', () => {
    expect(hex('#c8553d')).toEqual({ r: 200, g: 85, b: 61, a: 255 });
    expect(() => hex('c8553d')).toThrow();
  });

  it('blends a translucent colour over an opaque one', () => {
    const c = new PixelCanvas(1, 1);
    c.set(0, 0, hex('#ffffff'));
    c.blend(0, 0, hex('#000000', 128));
    const p = c.get(0, 0);
    expect(p.a).toBe(255);
    expect(p.r).toBeGreaterThan(120);
    expect(p.r).toBeLessThan(135);
  });

  it('outlines a single pixel on four sides only', () => {
    const c = new PixelCanvas(3, 3);
    c.set(1, 1, hex('#ff0000'));
    c.outline(hex('#000000'));
    expect([c.filled(1, 0), c.filled(0, 1), c.filled(2, 1), c.filled(1, 2)]).toEqual([true, true, true, true]);
    expect([c.filled(0, 0), c.filled(2, 2)]).toEqual([false, false]);
  });

  it('scales by whole numbers only, nearest-neighbour', () => {
    const c = new PixelCanvas(2, 1);
    c.set(1, 0, hex('#00ff00'));
    const s = c.scaled(3);
    expect([s.width, s.height]).toEqual([6, 3]);
    expect(s.get(2, 2)).toEqual(CLEAR);
    expect(s.get(3, 0)).toEqual(hex('#00ff00'));
    expect(() => c.scaled(1.5)).toThrow();
  });

  it('round-trips through PNG', () => {
    const c = new PixelCanvas(2, 2);
    c.set(0, 1, hex('#123456', 200));
    const png = PNG.sync.read(c.toPng());
    expect([png.width, png.height]).toEqual([2, 2]);
    expect(Array.from(png.data.subarray(8, 12))).toEqual([0x12, 0x34, 0x56, 200]);
  });
});

describe('sprites', () => {
  it('has a sprite for every landmark', () => {
    for (const l of ART_LANDMARKS) expect(SPRITES[l.id], l.id).toBeTypeOf('function');
  });

  it.each(Object.entries(SPRITES))('%s fits inside the canvas with its outline intact', (_id, draw) => {
    const s = draw();
    expect([s.width, s.height]).toEqual([SPRITE_PX, SPRITE_PX]);
    // No opaque pixel on the border: if there were, the outline there would have been cut off.
    for (let i = 0; i < SPRITE_PX; i++) {
      for (const [x, y] of [[i, 0], [i, SPRITE_PX - 1], [0, i], [SPRITE_PX - 1, i]] as const) {
        const p = s.get(x, y);
        expect(p.a === 255 && !(p.r === 0x1e && p.g === 0x1a && p.b === 0x2b), `${x},${y}`).toBe(false);
      }
    }
  });
});

describe('badges', () => {
  it('makes a round badge with transparent corners', () => {
    const sprite = SPRITES['queens-tower']!();
    for (const locked of [false, true]) {
      const b = makeBadge(sprite, 'rare', locked);
      expect([b.width, b.height]).toEqual([BADGE_PX, BADGE_PX]);
      expect(b.filled(0, 0)).toBe(false);
      expect(b.filled(BADGE_PX - 1, BADGE_PX - 1)).toBe(false);
      expect(b.get(24, 24).a).toBe(255);
    }
  });

  it('uses no sprite colours in the locked version', () => {
    const sprite = SPRITES['royal-albert-hall']!();
    const b = makeBadge(sprite, 'epic', true);
    const brick = hex('#c8553d');
    for (let y = 0; y < BADGE_PX; y++) {
      for (let x = 0; x < BADGE_PX; x++) {
        const p = b.get(x, y);
        expect(p.r === brick.r && p.g === brick.g && p.b === brick.b).toBe(false);
      }
    }
  });
});
