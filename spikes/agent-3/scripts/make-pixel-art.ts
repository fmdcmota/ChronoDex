/**
 * Writes every landmark sprite and Dex badge as a PNG (MASTER.md task A3-01).
 * Owner: Agent 3. Run with `npm run art`. Free: no network, no fal, no key.
 * `npm run art -- --publish` also copies the sprites and badges into the app's
 * public/sprites/ (Agent 3's path), so the app serves exactly what the spike shows.
 *
 * Output, all transparent PNGs scaled 4x with nearest-neighbour (1 art pixel = 4 image pixels,
 * which is pixel-exact at 2x CSS size on a 2x-density phone screen):
 * - art/sprites/<landmarkId>.png                  128 x 128, the map marker
 * - art/sprites/badges/<landmarkId>.png           192 x 192, the collected Dex badge
 * - art/sprites/badges/<landmarkId>-locked.png    192 x 192, the not-yet-collected silhouette
 * - art/preview/contact-sheet.png                 every sprite and badge on the map ground, for review
 *
 * art/sprites/ mirrors the app's public/sprites/, so the URLs (/sprites/<id>.png,
 * /sprites/badges/<id>.png) are the same in the spike and in the app.
 */
import { cpSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SPIKE_LANDMARKS } from '../src/lib/landmarks';
import { PALETTE } from '../src/lib/palette';
import { hex, PixelCanvas } from './pixel/canvas';
import { BADGE_PX, makeBadge } from './pixel/badges';
import { SPRITE_PX, SPRITES } from './pixel/sprites';

/** Export scale. 4 keeps pixels square and crisp up to 2x CSS size on 2x screens. */
const SCALE = 4;
/** Gap between cells on the contact sheet, in art pixels. */
const GAP_PX = 4;

const SPIKE_DIR = join(dirname(fileURLToPath(import.meta.url)), '..');
const ART_DIR = join(SPIKE_DIR, 'art');
/** The app's public/sprites/, two levels up from this spike. */
const APP_SPRITES_DIR = join(SPIKE_DIR, '..', '..', 'public', 'sprites');

/** Write a canvas to art/<relPath>, creating folders as needed. */
function save(relPath: string, canvas: PixelCanvas): void {
  const path = join(ART_DIR, relPath);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, canvas.toPng());
  console.log(`wrote art/${relPath} (${canvas.width} x ${canvas.height})`);
}

const cell = BADGE_PX + GAP_PX;
const sheet = new PixelCanvas(GAP_PX + SPIKE_LANDMARKS.length * cell, GAP_PX + 3 * cell);
sheet.rect(0, 0, sheet.width - 1, sheet.height - 1, hex(PALETTE.ground));

SPIKE_LANDMARKS.forEach((landmark, i) => {
  const draw = SPRITES[landmark.id];
  if (!draw) throw new Error(`No sprite drawn for landmark "${landmark.id}"`);
  const sprite = draw();
  const badge = makeBadge(sprite, landmark.rarity, false);
  const locked = makeBadge(sprite, landmark.rarity, true);

  save(`sprites/${landmark.id}.png`, sprite.scaled(SCALE));
  save(`sprites/badges/${landmark.id}.png`, badge.scaled(SCALE));
  save(`sprites/badges/${landmark.id}-locked.png`, locked.scaled(SCALE));

  const x = GAP_PX + i * cell;
  sheet.stamp(sprite, x + (BADGE_PX - SPRITE_PX) / 2, GAP_PX + (BADGE_PX - SPRITE_PX) / 2);
  sheet.stamp(badge, x, GAP_PX + cell);
  sheet.stamp(locked, x, GAP_PX + 2 * cell);
});

save('preview/contact-sheet.png', sheet.scaled(SCALE));

if (process.argv.includes('--publish')) {
  cpSync(join(ART_DIR, 'sprites'), APP_SPRITES_DIR, { recursive: true });
  console.log(`copied art/sprites/ to ${APP_SPRITES_DIR}`);
}
