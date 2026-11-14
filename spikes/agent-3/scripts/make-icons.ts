/**
 * Writes the web app icons into the app's public/icons/ (MASTER.md task A3-08).
 * Owner: Agent 3. Run with `npm run icons`. Free: no network, no fal, no key.
 *
 * The icon is the Queen's Tower sprite (the hero landmark) on the map-green ground, framed in ink.
 * Every size draws the 32 px sprite at a whole-number scale, so the pixels stay square and crisp:
 * - icon-192.png and icon-512.png: the normal icons ("any" purpose in the manifest);
 * - icon-maskable-512.png: full-bleed ground colour with the sprite inside the central 80 % "safe
 *   zone", because Android crops maskable icons to a circle or squircle;
 * - apple-touch-icon.png (180 px): iOS home-screen icon. iOS fills transparent pixels with black, so
 *   this one has no transparency.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PALETTE } from '../src/lib/palette';
import { hex, PixelCanvas } from './pixel/canvas';
import { SPRITE_PX, SPRITES } from './pixel/sprites';

const HERE = dirname(fileURLToPath(import.meta.url));
/** The app's public/icons/, two levels up from this spike. */
const OUT_DIR = join(HERE, '..', '..', '..', 'public', 'icons');

/** One icon to draw. */
interface IconSpec {
  file: string;
  sizePx: number;
  /** Whole-number scale of the 32 px sprite. */
  scale: number;
  /** True for a plain full-bleed background with no frame, as maskable and iOS icons need. */
  fullBleed: boolean;
}

const ICONS: IconSpec[] = [
  { file: 'icon-192.png', sizePx: 192, scale: 4, fullBleed: false },
  { file: 'icon-512.png', sizePx: 512, scale: 10, fullBleed: false },
  // 256 px of sprite in 512 is 50 %, comfortably inside the 80 % safe zone.
  { file: 'icon-maskable-512.png', sizePx: 512, scale: 8, fullBleed: true },
  { file: 'apple-touch-icon.png', sizePx: 180, scale: 4, fullBleed: true },
];

/**
 * Draw one icon.
 *
 * @param spec - Which icon.
 * @returns The finished canvas.
 */
function draw(spec: IconSpec): PixelCanvas {
  const c = new PixelCanvas(spec.sizePx, spec.sizePx);
  const ground = hex(PALETTE.ground);
  if (spec.fullBleed) {
    c.rect(0, 0, spec.sizePx - 1, spec.sizePx - 1, ground);
  } else {
    // Ink frame, then ground inside it, with stepped corners (one block cut from each corner).
    const frame = Math.round(spec.sizePx / 24);
    c.rect(0, 0, spec.sizePx - 1, spec.sizePx - 1, hex(PALETTE.ink));
    c.rect(frame, frame, spec.sizePx - 1 - frame, spec.sizePx - 1 - frame, ground);
  }
  const sprite = SPRITES['queens-tower']!().scaled(spec.scale);
  const offset = (spec.sizePx - SPRITE_PX * spec.scale) / 2;
  c.stamp(sprite, offset, offset);
  return c;
}

mkdirSync(OUT_DIR, { recursive: true });
for (const spec of ICONS) {
  writeFileSync(join(OUT_DIR, spec.file), draw(spec).toPng());
  console.log(`wrote public/icons/${spec.file} (${spec.sizePx} x ${spec.sizePx})`);
}
