/**
 * Turn a large cut-out image (for example a fal result after background removal) into a
 * 32-by-32 sprite in the Chronodex palette (MASTER.md task A3-01). Owner: Agent 3.
 *
 * Why: model output is never true pixel art: its "pixels" are uneven and its colours drift.
 * Shrinking by block averaging and snapping every pixel to the palette makes fal art match
 * the hand-drawn sprites, so the two sets can be mixed on one map.
 */
import { PALETTE } from '../../src/lib/palette';
import { hex, PixelCanvas, type Rgba } from './canvas';
import { SPRITE_PX } from './sprites';

/** A block counts as solid when at least this share of its pixels is opaque. */
const SOLID_SHARE = 0.5;
/** Room left round the sprite for the outline. */
const MARGIN_PX = 1;

const PALETTE_RGBA: Rgba[] = Object.values(PALETTE).map((v) => hex(v));

/**
 * The palette colour nearest to a colour, by plain RGB distance.
 *
 * @param c - Any colour. Alpha is ignored.
 * @returns A colour from PALETTE, opaque.
 */
export function nearestPaletteColour(c: Rgba): Rgba {
  let best = PALETTE_RGBA[0]!;
  let bestD = Infinity;
  for (const p of PALETTE_RGBA) {
    const d = (p.r - c.r) ** 2 + (p.g - c.g) ** 2 + (p.b - c.b) ** 2;
    if (d < bestD) {
      bestD = d;
      best = p;
    }
  }
  return best;
}

/**
 * Shrink a cut-out to a palette sprite, bottom-centred, with an ink outline.
 *
 * @param src - The source image with a transparent background.
 * @returns A new SPRITE_PX-square canvas, or an empty one when the source has no opaque pixel.
 */
export function pixelate(src: PixelCanvas): PixelCanvas {
  // Bounding box of the opaque pixels.
  let x0 = src.width, y0 = src.height, x1 = -1, y1 = -1;
  for (let y = 0; y < src.height; y++) {
    for (let x = 0; x < src.width; x++) {
      if (src.get(x, y).a >= 128) {
        x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y);
      }
    }
  }
  const out = new PixelCanvas(SPRITE_PX, SPRITE_PX);
  if (x1 < 0) return out;

  const box = SPRITE_PX - 2 * MARGIN_PX;
  const w = x1 - x0 + 1;
  const h = y1 - y0 + 1;
  // One output pixel covers `block` source pixels on each side; keep the aspect ratio.
  const block = Math.max(w, h) / box;
  const outW = Math.max(1, Math.round(w / block));
  const outH = Math.max(1, Math.round(h / block));
  const offX = Math.floor((SPRITE_PX - outW) / 2);
  const offY = SPRITE_PX - MARGIN_PX - outH;

  for (let oy = 0; oy < outH; oy++) {
    for (let ox = 0; ox < outW; ox++) {
      let r = 0, g = 0, b = 0, solid = 0, total = 0;
      const sy0 = Math.floor(y0 + oy * block), sy1 = Math.min(y1 + 1, Math.floor(y0 + (oy + 1) * block));
      const sx0 = Math.floor(x0 + ox * block), sx1 = Math.min(x1 + 1, Math.floor(x0 + (ox + 1) * block));
      for (let sy = sy0; sy < Math.max(sy1, sy0 + 1); sy++) {
        for (let sx = sx0; sx < Math.max(sx1, sx0 + 1); sx++) {
          const p = src.get(sx, sy);
          total++;
          if (p.a >= 128) { solid++; r += p.r; g += p.g; b += p.b; }
        }
      }
      if (solid / total < SOLID_SHARE) continue;
      out.set(offX + ox, offY + oy, nearestPaletteColour({ r: r / solid, g: g / solid, b: b / solid, a: 255 }));
    }
  }
  out.outline(hex(PALETTE.ink));
  return out;
}
