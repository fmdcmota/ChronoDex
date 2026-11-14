/**
 * The six landmark sprites, drawn as 32-by-32 pixel art (MASTER.md task A3-01).
 * Owner: Agent 3.
 *
 * Each landmark is a simplified, front-on portrait of the real building, in the palette from
 * src/lib/palette.ts. All original art (assumption A1): nothing traced or taken from a game.
 *
 * How a sprite is built: draw the body in flat colours, shade the right-hand side (light comes
 * from the upper left, as in most top-down games), add a one-pixel ink outline, then a soft
 * ground shadow under the base so the sprite sits on the map.
 */
import { PALETTE, type PaletteKey } from '../../src/lib/palette';
import type { LandmarkId } from '../../src/lib/contracts-copy';
import { hex, PixelCanvas, type Rgba } from './canvas';

/** Width and height of every sprite, in art pixels. */
export const SPRITE_PX = 32;

/** Palette colour by name, as Rgba. */
const P = Object.fromEntries(Object.entries(PALETTE).map(([k, v]) => [k, hex(v)])) as Record<PaletteKey, Rgba>;

/** Ground shadow: ink at about 30 % opacity. */
const SHADOW = hex(PALETTE.ink, 76);

/**
 * Finish a sprite: outline, then the ground shadow in the empty pixels under the base.
 *
 * @param c - The canvas with the body drawn.
 * @param shadowHalfWidthPx - Half the width of the shadow ellipse.
 */
function finish(c: PixelCanvas, shadowHalfWidthPx: number): PixelCanvas {
  c.outline(P.ink);
  const shadow = new PixelCanvas(SPRITE_PX, SPRITE_PX);
  shadow.ellipse(15.5, 29.5, shadowHalfWidthPx, 2, SHADOW);
  // Shadow only where the sprite is empty, so it sits behind the building.
  for (let y = 0; y < SPRITE_PX; y++) {
    for (let x = 0; x < SPRITE_PX; x++) if (!c.filled(x, y) && shadow.filled(x, y)) c.set(x, y, SHADOW);
  }
  return c;
}

/** Queen's Tower: a tall brick campanile with stone bands and a green copper dome. */
function queensTower(): PixelCanvas {
  const c = new PixelCanvas(SPRITE_PX, SPRITE_PX);
  // Shaft.
  c.rect(12, 11, 19, 27, P.brick);
  for (const y of [14, 20, 26]) c.hline(12, 19, y, P.stone);
  c.rect(18, 11, 19, 27, P.brickDark);
  for (const y of [14, 20, 26]) c.hline(18, 19, y, P.stoneDark);
  // Tall arched windows.
  for (const y0 of [16, 22]) {
    c.rect(14, y0, 15, y0 + 2, P.slate);
    c.set(16, y0, P.slate);
    c.rect(16, y0 + 1, 16, y0 + 2, P.slate);
  }
  // Base plinth.
  c.rect(10, 27, 21, 28, P.stone);
  c.rect(19, 27, 21, 28, P.stoneDark);
  // Belfry stage, slightly wider, with open arches.
  c.rect(11, 6, 20, 10, P.stone);
  c.rect(19, 6, 20, 10, P.stoneDark);
  c.rect(13, 7, 14, 9, P.slate);
  c.rect(16, 7, 17, 9, P.slate);
  c.hline(11, 20, 10, P.stoneDark);
  // Dome: upper half of an ellipse, shaded on the right.
  c.ellipse(15.5, 6, 4.6, 3.6, P.verdigris, (_x, y) => y <= 5);
  c.ellipse(15.5, 6, 4.6, 3.6, P.verdigrisDark, (x, y) => y <= 5 && x >= 18);
  c.set(13, 3, P.glass);
  // Gold finial.
  c.rect(15, 1, 16, 1, P.gold);
  c.set(16, 1, P.goldDark);
  return finish(c, 7);
}

/** Royal Albert Hall: an oval brick drum, a mosaic frieze and a shallow glass-and-iron dome. */
function royalAlbertHall(): PixelCanvas {
  const c = new PixelCanvas(SPRITE_PX, SPRITE_PX);
  // Dome, drawn first so the drum overlaps its lower edge.
  c.ellipse(15.5, 15, 12, 7.5, P.slate, (_x, y) => y <= 14);
  c.ellipse(15.5, 15, 12, 7.5, P.inkSoft, (x, y) => y <= 14 && x >= 22);
  // Glass ribs catching the light on the left.
  for (const [x, y] of [[8, 11], [9, 10], [11, 9], [12, 8], [14, 8]] as const) c.set(x, y, P.glass);
  c.hline(9, 22, 13, P.inkSoft);
  // Lantern on top.
  c.rect(14, 5, 17, 7, P.stone);
  c.set(17, 5, P.stoneDark);
  c.rect(15, 4, 16, 4, P.gold);
  // Drum: a rounded rectangle, so it reads as an oval seen from the side.
  c.rect(3, 15, 28, 27, P.brick);
  c.rect(2, 17, 29, 26, P.brick);
  c.recolour((x, y, col) => (x >= 24 || (x >= 22 && y >= 24)) && col.r === P.brick.r && col.g === P.brick.g, P.brickDark);
  // Terracotta frieze band with gold mosaic dots.
  c.rect(3, 15, 28, 16, P.terracotta);
  for (let x = 4; x <= 27; x += 3) c.set(x, 15, P.gold);
  // Row of arched windows.
  for (let x = 4; x <= 26; x += 3) {
    c.rect(x, 19, x + 1, 21, P.slate);
    c.set(x, 19, P.brick);
  }
  // Stone ground storey with doors.
  c.rect(2, 24, 29, 27, P.stone);
  c.rect(25, 24, 29, 27, P.stoneDark);
  for (const x of [6, 12, 18, 24]) c.rect(x, 25, x + 1, 27, P.slate);
  c.rect(14, 24, 17, 27, P.slate);
  c.hline(14, 17, 24, P.stone);
  return finish(c, 14);
}

/** Natural History Museum: a terracotta Romanesque front with twin spired towers. */
function naturalHistoryMuseum(): PixelCanvas {
  const c = new PixelCanvas(SPRITE_PX, SPRITE_PX);
  // Long front range.
  c.rect(1, 17, 30, 28, P.terracotta);
  // End pavilions, a little taller, with hipped roofs.
  c.rect(1, 14, 5, 28, P.terracotta);
  c.rect(26, 14, 30, 28, P.terracotta);
  c.roof(2, 4, 12, 13, P.slate);
  c.roof(27, 29, 12, 13, P.slate);
  // Twin towers.
  c.rect(9, 7, 13, 28, P.terracotta);
  c.rect(18, 7, 22, 28, P.terracotta);
  c.roof(11, 11, 2, 6, P.slate, 2);
  c.roof(20, 20, 2, 6, P.slate, 2);
  c.set(11, 1, P.gold);
  c.set(20, 1, P.gold);
  // Central gable over the entrance.
  c.rect(14, 15, 17, 28, P.terracotta);
  c.roof(15, 16, 12, 14, P.slate);
  // The blue-grey bands of the real facade.
  for (const y of [19, 22, 25]) c.recolour((_x, yy, col) => yy === y && col.r === P.terracotta.r, P.slate);
  // Shade the right of each mass.
  c.recolour((x, _y, col) => [5, 13, 22, 30, 17].includes(x) && col.r === P.terracotta.r, hex('#b97d4d'));
  // Windows: pairs on the range, slits on the towers.
  for (const x of [3, 7, 24, 28]) for (const y of [20, 23]) c.set(x, y, P.ink);
  for (const x of [11, 20]) for (const y of [9, 12, 15]) c.vline(x, y, y + 1, P.ink);
  // Grand round-arched entrance.
  c.rect(14, 23, 17, 28, P.slate);
  c.hline(15, 16, 22, P.slate);
  c.set(15, 24, P.glass);
  return finish(c, 15);
}

/** V&A: a brick and stone front, a central tower with an open crown-like lantern, Blitz scars. */
function vAndA(): PixelCanvas {
  const c = new PixelCanvas(SPRITE_PX, SPRITE_PX);
  // Wings: brick with stone piers.
  c.rect(2, 18, 29, 28, P.brick);
  for (let x = 3; x <= 28; x += 4) c.vline(x, 18, 28, P.stone);
  c.hline(2, 29, 18, P.stone);
  c.rect(26, 19, 29, 28, P.brickDark);
  for (let x = 3; x <= 28; x += 4) if (x >= 26) c.vline(x, 19, 28, P.stoneDark);
  for (const x of [5, 9, 22, 26]) c.rect(x, 21, x + 1, 23, P.slate);
  // Central stone tower with a tall arched entrance.
  c.rect(11, 10, 20, 28, P.stone);
  c.rect(19, 10, 20, 28, P.stoneDark);
  c.rect(14, 21, 17, 28, P.slate);
  c.hline(15, 16, 20, P.slate);
  c.rect(14, 13, 17, 16, P.slate);
  // Lantern: a stepped open crown with a gold figure on top.
  c.rect(12, 7, 19, 9, P.stone);
  c.set(13, 8, P.slate);
  c.set(15, 8, P.slate);
  c.set(16, 8, P.slate);
  c.set(18, 8, P.slate);
  c.rect(13, 4, 18, 6, P.stone);
  c.rect(14, 5, 14, 5, P.slate);
  c.rect(17, 5, 17, 5, P.slate);
  c.rect(15, 1, 16, 3, P.gold);
  c.set(16, 3, P.goldDark);
  // Blitz shrapnel scars, the memorial this landmark is about.
  for (const [x, y] of [[4, 25], [6, 26], [8, 24], [10, 27], [12, 25]] as const) c.set(x, y, P.inkSoft);
  return finish(c, 15);
}

/** Huxley Building: the venue. A modern slab block with a window grid and a gold flag. */
function huxleyBuilding(): PixelCanvas {
  const c = new PixelCanvas(SPRITE_PX, SPRITE_PX);
  // Concrete slab.
  c.rect(4, 10, 27, 28, P.stone);
  c.rect(23, 10, 27, 28, P.stoneDark);
  c.hline(4, 27, 10, P.stoneDark);
  // Window grid, glass with a dark lower pane.
  for (let y = 12; y <= 24; y += 3) {
    for (let x = 6; x <= 25; x += 3) {
      c.set(x, y, P.glass);
      c.set(x + 1, y, P.glass);
      c.hline(x, x + 1, y + 1, P.slate);
    }
  }
  // Rooftop plant box.
  c.rect(8, 7, 13, 9, P.stoneDark);
  // Entrance.
  c.rect(14, 25, 17, 28, P.slate);
  c.hline(13, 18, 25, P.ink);
  // Venue flag: you start here.
  c.vline(22, 1, 9, P.ink);
  c.rect(23, 1, 27, 4, P.gold);
  c.rect(23, 4, 27, 4, P.goldDark);
  return finish(c, 13);
}

/** Exhibition Road: a Victorian lamp post on the 2011 diagonal-chequer granite paving, and a tree. */
function exhibitionRoad(): PixelCanvas {
  const c = new PixelCanvas(SPRITE_PX, SPRITE_PX);
  // Paving: a flat oval of diagonal chequer, the street's signature pattern.
  c.ellipse(15.5, 25, 14, 4.5, P.stone);
  c.recolour((x, y) => Math.floor((x + y) / 3) % 2 === 0 && (x - y + 64) % 6 < 3, P.stoneDark);
  // Tree on the left.
  c.vline(6, 15, 24, P.brickDark);
  c.vline(7, 17, 24, P.brickDark);
  c.ellipse(6.5, 12, 5, 5, P.park);
  c.ellipse(6.5, 12, 5, 5, P.wood, (x, y) => x >= 8 || y >= 15);
  c.set(4, 9, hex('#b9dc8a'));
  c.set(5, 9, hex('#b9dc8a'));
  // Lamp post: base, column, crossbar, lantern.
  c.rect(17, 24, 20, 25, P.slate);
  c.rect(18, 8, 19, 23, P.slate);
  c.hline(16, 21, 9, P.slate);
  c.rect(17, 3, 20, 7, P.gold);
  c.rect(18, 4, 19, 6, hex('#fff6c8'));
  c.hline(16, 21, 2, P.slate);
  c.hline(17, 20, 1, P.slate);
  c.hline(17, 20, 8, P.slate);
  // A bollard, so the street reads as shared space.
  c.rect(26, 21, 27, 24, P.slate);
  c.hline(26, 27, 21, P.gold);
  return finish(c, 15);
}

/** Every sprite, keyed by landmark id. Must cover the six ids in MASTER.md section 12. */
export const SPRITES: Record<LandmarkId, () => PixelCanvas> = {
  'huxley-building': huxleyBuilding,
  'queens-tower': queensTower,
  'royal-albert-hall': royalAlbertHall,
  'exhibition-road': exhibitionRoad,
  'v-and-a': vAndA,
  'natural-history-museum': naturalHistoryMuseum,
};
