/**
 * A tiny RGBA pixel canvas for drawing original pixel art in code (MASTER.md task A3-01).
 * Owner: Agent 3.
 *
 * Why not an image editor or a model: the sprites have to exist before fal credits and the
 * shared key arrive, and art written as code can be reviewed in a diff, regenerated in one
 * command and recoloured from the palette. The fal route (scripts/fal-art.ts) can replace it
 * later without changing any file name.
 *
 * Coordinates are integer pixels, x to the right, y down, (0, 0) top left.
 * Everything is hard-edged: no anti-aliasing, so the art stays crisp at any integer scale.
 */
import { PNG } from 'pngjs';

/** One colour with alpha, each channel 0 to 255. */
export interface Rgba {
  r: number;
  g: number;
  b: number;
  a: number;
}

/**
 * Parse "#rrggbb" into an opaque colour.
 *
 * @param hex - Colour such as "#c8553d".
 * @param alpha - Alpha, 0 to 255. Defaults to opaque.
 * @returns The colour.
 * @throws Error when the string is not #rrggbb.
 */
export function hex(hex: string, alpha = 255): Rgba {
  const m = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);
  if (!m) throw new Error(`Not a #rrggbb colour: ${hex}`);
  return { r: parseInt(m[1]!, 16), g: parseInt(m[2]!, 16), b: parseInt(m[3]!, 16), a: alpha };
}

/** Fully transparent. */
export const CLEAR: Rgba = { r: 0, g: 0, b: 0, a: 0 };

/** A width-by-height grid of RGBA pixels with simple drawing operations. */
export class PixelCanvas {
  /** RGBA bytes, row by row, 4 per pixel. */
  readonly data: Uint8Array;

  /**
   * @param width - Width in pixels.
   * @param height - Height in pixels.
   */
  constructor(
    readonly width: number,
    readonly height: number,
  ) {
    this.data = new Uint8Array(width * height * 4);
  }

  /** True when (x, y) is inside the canvas. */
  inside(x: number, y: number): boolean {
    return x >= 0 && y >= 0 && x < this.width && y < this.height;
  }

  /**
   * Read one pixel.
   *
   * @returns The colour, or CLEAR outside the canvas.
   */
  get(x: number, y: number): Rgba {
    if (!this.inside(x, y)) return CLEAR;
    const i = (y * this.width + x) * 4;
    return { r: this.data[i]!, g: this.data[i + 1]!, b: this.data[i + 2]!, a: this.data[i + 3]! };
  }

  /** True when the pixel has any opacity. */
  filled(x: number, y: number): boolean {
    return this.get(x, y).a > 0;
  }

  /**
   * Write one pixel, replacing what was there (no blending). Writes outside the canvas are ignored.
   */
  set(x: number, y: number, c: Rgba): void {
    if (!this.inside(x, y)) return;
    const i = (y * this.width + x) * 4;
    this.data[i] = c.r;
    this.data[i + 1] = c.g;
    this.data[i + 2] = c.b;
    this.data[i + 3] = c.a;
  }

  /**
   * Fill the rectangle from (x0, y0) to (x1, y1), both corners included. Opaque colours
   * replace, translucent ones blend (see blend()).
   */
  rect(x0: number, y0: number, x1: number, y1: number, c: Rgba): void {
    for (let y = Math.min(y0, y1); y <= Math.max(y0, y1); y++) {
      for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++) this.blend(x, y, c);
    }
  }

  /** Draw a horizontal run of pixels from x0 to x1 inclusive on row y. */
  hline(x0: number, x1: number, y: number, c: Rgba): void {
    this.rect(x0, y, x1, y, c);
  }

  /** Draw a vertical run of pixels from y0 to y1 inclusive on column x. */
  vline(x: number, y0: number, y1: number, c: Rgba): void {
    this.rect(x, y0, x, y1, c);
  }

  /**
   * Fill an axis-aligned ellipse (translucent colours blend). Centre and radii may be half-integers, so even-width shapes
   * centre exactly on a pixel grid (for example cx 15.5 spans columns 0 to 31 symmetrically).
   *
   * @param keep - Optional filter: only pixels where it returns true are painted. Used to draw
   *   half-domes and shaded halves.
   */
  ellipse(cx: number, cy: number, rx: number, ry: number, c: Rgba, keep?: (x: number, y: number) => boolean): void {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
        // Pixel x is tested at x itself, so a half-integer centre gives an even-width shape
        // and a whole-number centre an odd-width one, both symmetric.
        const dx = (x - cx) / rx;
        const dy = (y - cy) / ry;
        if (dx * dx + dy * dy <= 1 && (!keep || keep(x, y))) this.blend(x, y, c);
      }
    }
  }

  /**
   * Fill a triangle-shaped roof. Row `topY` spans columns apexX0 to apexX1; each row below
   * widens by one pixel on each side every `stepRows` rows, down to `bottomY`.
   */
  roof(apexX0: number, apexX1: number, topY: number, bottomY: number, c: Rgba, stepRows = 1): void {
    for (let y = topY; y <= bottomY; y++) {
      const grow = Math.floor((y - topY) / stepRows);
      this.hline(apexX0 - grow, apexX1 + grow, y, c);
    }
  }

  /**
   * Repaint every pixel matching a predicate. Used for shading: for example, darken the right
   * third of a wall.
   */
  recolour(pred: (x: number, y: number, c: Rgba) => boolean, to: Rgba): void {
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const c = this.get(x, y);
        if (c.a > 0 && pred(x, y, c)) this.set(x, y, to);
      }
    }
  }

  /**
   * Add a one-pixel outline: every transparent pixel that touches a filled pixel on one of its
   * four sides gets `c`. The classic sprite outline that keeps art readable on any background.
   */
  outline(c: Rgba): void {
    const edge: Array<[number, number]> = [];
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        if (this.filled(x, y)) continue;
        if (this.filled(x - 1, y) || this.filled(x + 1, y) || this.filled(x, y - 1) || this.filled(x, y + 1)) {
          edge.push([x, y]);
        }
      }
    }
    for (const [x, y] of edge) this.set(x, y, c);
  }

  /**
   * Paint a colour over a pixel with standard "source over" alpha compositing, so a
   * half-transparent shadow darkens what is under it instead of punching a hole.
   */
  blend(x: number, y: number, c: Rgba): void {
    if (c.a === 255 || !this.inside(x, y)) return this.set(x, y, c);
    const under = this.get(x, y);
    const sa = c.a / 255;
    const da = under.a / 255;
    const outA = sa + da * (1 - sa);
    if (outA === 0) return this.set(x, y, CLEAR);
    const mix = (s: number, d: number): number => Math.round((s * sa + d * da * (1 - sa)) / outA);
    this.set(x, y, { r: mix(c.r, under.r), g: mix(c.g, under.g), b: mix(c.b, under.b), a: Math.round(outA * 255) });
  }

  /**
   * Draw another canvas onto this one at (dx, dy), alpha-blended. Fully transparent source
   * pixels are skipped.
   *
   * @param mapColour - Optional recolouring of each source pixel, for example to make a
   *   silhouette. Return CLEAR to drop a pixel.
   */
  stamp(src: PixelCanvas, dx: number, dy: number, mapColour?: (c: Rgba) => Rgba): void {
    for (let y = 0; y < src.height; y++) {
      for (let x = 0; x < src.width; x++) {
        const raw = src.get(x, y);
        if (raw.a === 0) continue;
        const c = mapColour ? mapColour(raw) : raw;
        if (c.a > 0) this.blend(dx + x, dy + y, c);
      }
    }
  }

  /**
   * Make a nearest-neighbour enlargement. Each pixel becomes a factor-by-factor block, which is
   * how pixel art is scaled without blurring.
   *
   * @param factor - Whole-number scale, 1 or more.
   * @returns A new canvas.
   */
  scaled(factor: number): PixelCanvas {
    if (!Number.isInteger(factor) || factor < 1) throw new Error(`Scale must be a whole number >= 1, got ${factor}`);
    const out = new PixelCanvas(this.width * factor, this.height * factor);
    for (let y = 0; y < out.height; y++) {
      for (let x = 0; x < out.width; x++) out.set(x, y, this.get(Math.floor(x / factor), Math.floor(y / factor)));
    }
    return out;
  }

  /**
   * Encode as PNG.
   *
   * @returns PNG file bytes with an alpha channel.
   */
  toPng(): Buffer {
    const png = new PNG({ width: this.width, height: this.height });
    png.data = Buffer.from(this.data);
    return PNG.sync.write(png);
  }
}
