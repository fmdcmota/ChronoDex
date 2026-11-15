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


/** Merlion Park: the Merlion, a lion's head on a fish's body, on a rock, spouting water. */
function merlionPark(): PixelCanvas {
  const c = new PixelCanvas(SPRITE_PX, SPRITE_PX);
  // Sea, drawn first so the rock stands in it.
  c.ellipse(15.5, 27, 13.5, 3, P.water);
  c.hline(5, 11, 27, P.waterDeep);
  c.hline(20, 26, 28, P.waterDeep);
  // Rock plinth.
  c.rect(10, 23, 21, 27, P.stoneDark);
  c.rect(12, 22, 19, 23, P.stoneDark);
  c.rect(10, 23, 12, 27, P.stone);
  // Fish body with a curled tail.
  c.ellipse(15.5, 17.5, 5.5, 6, P.stone);
  c.ellipse(15.5, 17.5, 5.5, 6, P.stoneDark, (x) => x >= 19);
  for (const [x, y] of [[13, 16], [16, 16], [14, 19], [17, 19], [12, 21], [15, 22], [18, 22]] as const) c.set(x, y, P.stoneDark);
  c.rect(21, 20, 23, 21, P.stone);
  c.rect(23, 18, 25, 19, P.stone);
  c.rect(24, 16, 26, 17, P.stoneDark);
  // Lion head: a dark mane round a pale face.
  c.ellipse(15.5, 9, 6.5, 5.5, P.stoneDark);
  c.ellipse(15.5, 9.5, 4.5, 4.5, P.stone);
  c.set(13, 8, P.slate);
  c.set(18, 8, P.slate);
  c.rect(15, 10, 16, 10, P.brickDark);
  c.hline(14, 17, 12, P.slate);
  c.set(15, 13, P.glass);
  // Crown of the mane.
  c.rect(14, 3, 17, 4, P.stoneDark);
  // Water spout from the mouth.
  for (const [x, y] of [[18, 13], [19, 14], [20, 15], [21, 17], [22, 20], [23, 23]] as const) c.set(x, y, P.glass);
  for (const [x, y] of [[19, 13], [21, 16], [22, 19]] as const) c.set(x, y, P.water);
  return finish(c, 14);
}

/** Raffles' Landing Site: a white statue of Stamford Raffles on a plinth by the river. */
function rafflesLandingSite(): PixelCanvas {
  const c = new PixelCanvas(SPRITE_PX, SPRITE_PX);
  // River edge on the left.
  c.rect(1, 27, 9, 28, P.water);
  c.hline(2, 6, 28, P.waterDeep);
  // Stepped plinth.
  c.rect(8, 26, 23, 28, P.stoneDark);
  c.rect(8, 26, 20, 28, P.stone);
  c.rect(11, 19, 20, 25, P.stone);
  c.rect(18, 19, 20, 25, P.stoneDark);
  c.hline(10, 21, 19, P.stoneDark);
  c.set(15, 22, P.slate);
  c.set(16, 22, P.slate);
  // Figure: legs, long coat, folded arms, head.
  c.rect(13, 14, 18, 18, P.paper);
  c.rect(17, 14, 18, 18, P.stone);
  c.rect(12, 8, 19, 14, P.paper);
  c.rect(17, 8, 19, 14, P.stone);
  c.hline(13, 18, 11, P.stoneDark);
  c.rect(14, 4, 17, 7, P.terracotta);
  c.rect(14, 3, 17, 3, P.paper);
  c.set(15, 5, P.ink);
  c.set(17, 5, P.ink);
  // Gold band on the plinth: the "landing" plaque.
  c.rect(13, 23, 18, 24, P.gold);
  c.hline(13, 18, 24, P.goldDark);
  return finish(c, 13);
}

/** Raffles Hotel: a white colonial front with a red tile roof, green shutters and a palm. */
function rafflesHotel(): PixelCanvas {
  const c = new PixelCanvas(SPRITE_PX, SPRITE_PX);
  // Palm tree on the left.
  c.vline(4, 9, 16, P.brickDark);
  c.vline(5, 11, 16, P.brickDark);
  c.hline(1, 8, 7, P.wood);
  c.hline(2, 7, 8, P.wood);
  for (const [x, y] of [[1, 8], [8, 8], [2, 9], [7, 9], [4, 6], [5, 6]] as const) c.set(x, y, P.park);
  // Wings.
  c.rect(7, 16, 29, 28, P.stone);
  c.rect(26, 16, 29, 28, P.stoneDark);
  c.rect(7, 13, 30, 15, P.brick);
  c.hline(7, 30, 13, P.brickDark);
  c.rect(27, 14, 30, 15, P.brickDark);
  // Central block and red gable.
  c.rect(12, 9, 23, 16, P.stone);
  c.rect(21, 9, 23, 16, P.stoneDark);
  c.roof(17, 18, 4, 8, P.brick);
  c.vline(17, 1, 3, P.ink);
  c.rect(18, 1, 20, 2, P.gold);
  // Shutters.
  for (const x of [14, 19]) c.rect(x, 10, x + 1, 12, P.verdigrisDark);
  for (const x of [9, 12, 22, 25]) c.rect(x, 17, x + 1, 19, P.verdigrisDark);
  // Ground-floor arcade and entrance.
  for (const x of [9, 12, 21, 24]) {
    c.rect(x, 23, x + 1, 28, P.slate);
    c.set(x, 22, P.slate);
  }
  c.rect(16, 22, 19, 28, P.slate);
  c.hline(16, 19, 21, P.verdigrisDark);
  return finish(c, 15);
}

/** Viking Ship Museum: the Oseberg longship, a carved prow, a striped sail and a row of shields. */
function vikingShipMuseum(): PixelCanvas {
  const c = new PixelCanvas(SPRITE_PX, SPRITE_PX);
  // Sea.
  c.ellipse(15.5, 27.5, 14, 2.5, P.water);
  c.hline(4, 10, 28, P.waterDeep);
  c.hline(22, 28, 28, P.waterDeep);
  // Hull: a crescent, built row by row, narrowing to the keel.
  c.hline(8, 23, 26, P.brickDark);
  c.hline(5, 26, 25, P.brick);
  c.hline(3, 28, 24, P.brick);
  c.hline(2, 29, 23, P.brick);
  c.hline(2, 29, 22, P.brick);
  c.hline(3, 28, 21, P.brick);
  c.hline(3, 28, 24, P.brickDark);
  c.recolour((x, y, col) => x >= 24 && y >= 22 && col.r === P.brick.r && col.g === P.brick.g, P.brickDark);
  // Prow and stern rise to the curl; the prow ends in a gold dragon head.
  c.rect(3, 17, 4, 20, P.brick);
  c.rect(2, 14, 4, 16, P.brick);
  c.rect(1, 12, 5, 13, P.gold);
  c.set(5, 12, P.goldDark);
  c.set(2, 12, P.ink);
  c.rect(27, 17, 28, 20, P.brickDark);
  c.rect(27, 15, 29, 16, P.brickDark);
  // Round shields along the side.
  [P.gold, P.slate, P.brick, P.gold, P.slate, P.brick].forEach((col, i) => c.rect(6 + i * 4, 22, 7 + i * 4, 23, col));
  // Mast and a square sail with red and cream stripes.
  c.rect(15, 4, 16, 21, P.brickDark);
  c.rect(8, 6, 23, 14, P.paper);
  for (let x = 8; x <= 23; x += 4) c.rect(x, 6, x + 1, 14, P.brick);
  c.rect(20, 6, 23, 14, P.paperShade);
  for (let x = 8; x <= 20; x += 4) if (x >= 20) c.rect(x, 6, x + 1, 14, P.brickDark);
  c.hline(7, 24, 5, P.brickDark);
  c.hline(7, 24, 15, P.brickDark);
  return finish(c, 14);
}

/** Akershus Fortress: a stone castle with a round tower, a gatehouse and a flag. */
function akershusFortress(): PixelCanvas {
  const c = new PixelCanvas(SPRITE_PX, SPRITE_PX);
  // Curtain wall with crenellations.
  c.rect(2, 17, 29, 28, P.stone);
  c.rect(26, 17, 29, 28, P.stoneDark);
  for (let x = 2; x <= 29; x += 2) c.set(x, 16, x >= 26 ? P.stoneDark : P.stone);
  for (const x of [5, 22, 25]) c.rect(x, 20, x, 22, P.slate);
  // Round tower on the left with a green conical roof.
  c.rect(3, 9, 10, 28, P.stone);
  c.rect(9, 9, 10, 28, P.stoneDark);
  c.roof(6, 7, 2, 8, P.verdigris, 2);
  c.recolour((x, y, col) => x >= 7 && y <= 8 && col.r === P.verdigris.r && col.g === P.verdigris.g, P.verdigrisDark);
  c.rect(6, 13, 7, 15, P.slate);
  c.rect(6, 20, 7, 22, P.slate);
  // Gatehouse with an arched gate and a flag.
  c.rect(13, 11, 20, 28, P.stone);
  c.rect(19, 11, 20, 28, P.stoneDark);
  for (const x of [13, 15, 17, 19]) c.set(x, 10, P.stone);
  c.rect(15, 22, 18, 28, P.slate);
  c.hline(16, 17, 21, P.slate);
  c.rect(15, 14, 17, 16, P.slate);
  c.vline(16, 2, 9, P.ink);
  c.rect(17, 2, 21, 5, P.brick);
  c.rect(17, 3, 21, 3, P.paper);
  c.vline(18, 2, 5, P.paper);
  // Smaller tower on the right.
  c.rect(23, 12, 28, 28, P.stone);
  c.rect(26, 12, 28, 28, P.stoneDark);
  for (const x of [23, 25, 27]) c.set(x, 11, x >= 26 ? P.stoneDark : P.stone);
  return finish(c, 15);
}

/**
 * Emmanuel College, Cambridge: "Emma"'s famous pond ducks. A mallard in a tiny mortarboard (the
 * college's graduate) with a duckling, on the garden pond. The duck is the landmark.
 */
function emmanuelCollege(): PixelCanvas {
  const c = new PixelCanvas(SPRITE_PX, SPRITE_PX);
  // Pond.
  c.ellipse(15.5, 26, 14, 3.5, P.water);
  c.hline(3, 9, 27, P.waterDeep);
  c.hline(20, 27, 28, P.waterDeep);
  // Tail, lifted at the back.
  for (const [x, y] of [[4, 15], [5, 15], [3, 16], [4, 16], [5, 16], [5, 17]] as const) c.set(x, y, P.inkSoft);
  // Body: cream, shaded underneath and on the right.
  c.ellipse(14, 20, 9.5, 5.5, P.stone);
  c.ellipse(14, 20, 9.5, 5.5, P.stoneDark, (_x, y) => y >= 23);
  // Folded wing.
  c.ellipse(12, 19.5, 5.5, 3, P.stoneDark);
  c.hline(9, 15, 19, P.stone);
  c.hline(10, 16, 21, P.inkSoft);
  // Brown chest, white collar, green neck and head.
  c.ellipse(21, 19.5, 3.2, 4, P.brickDark);
  c.rect(21, 12, 24, 16, P.verdigris);
  c.hline(20, 25, 16, P.paper);
  c.ellipse(23.5, 10, 4.2, 3.8, P.verdigris);
  c.rect(21, 12, 22, 14, P.verdigrisDark);
  // Eye and a gold bill.
  c.set(25, 9, P.ink);
  c.rect(27, 10, 29, 11, P.gold);
  c.set(29, 11, P.goldDark);
  c.set(28, 12, P.goldDark);
  // Mortarboard: a flat slate board over a cap, with a gold tassel.
  c.rect(19, 4, 28, 5, P.slate);
  c.rect(21, 6, 26, 7, P.slate);
  c.hline(19, 28, 4, P.inkSoft);
  c.rect(28, 5, 28, 8, P.gold);
  c.set(28, 8, P.goldDark);
  // Duckling following behind.
  c.ellipse(27, 24, 2.6, 1.8, P.gold);
  c.ellipse(29, 22.5, 1.6, 1.5, P.gold);
  c.set(30, 22, P.ink);
  c.set(30, 23, P.brick);
  return finish(c, 14);
}

/** Great Wall at Badaling: a brick wall with battlements climbing a green ridge, two watchtowers. */
function greatWallBadaling(): PixelCanvas {
  const c = new PixelCanvas(SPRITE_PX, SPRITE_PX);
  /** Top of the wall at column x: it climbs from the lower left to the upper right. */
  const top = (x: number) => 23 - Math.floor(x * 0.4);
  const inside = (x: number, y: number) => x >= 2 && x <= 29 && y <= 28; // keeps the outline clear of the edge
  // The ridge the wall runs along: two overlapping hills behind and under it.
  c.ellipse(22, 31, 15, 10, P.wood, inside);
  c.ellipse(8, 32, 11, 7, P.park, inside);
  // Wall: grey-brown brick body five rows thick, a pale top course, merlons every other column.
  for (let x = 1; x <= 30; x++) {
    c.vline(x, top(x), top(x) + 4, P.stoneDark);
    c.set(x, top(x), P.stone);
    c.set(x, top(x) + 1, P.stone);
    if (x % 2 === 0) c.set(x, top(x) - 1, P.stone);
    c.set(x, top(x) + 4, P.inkSoft);
  }
  // Brick joints, in two staggered courses.
  for (let x = 2; x <= 29; x += 3) c.set(x, top(x) + 3, P.inkSoft);
  for (let x = 3; x <= 29; x += 3) c.set(x, top(x) + 2, P.stoneDark);
  // Hillside under the wall, so it stands on the ridge and not in the air.
  for (let x = 2; x <= 29; x++) for (let y = top(x) + 5; y <= 28; y++) if (!c.filled(x, y)) c.set(x, y, y > top(x) + 7 ? P.wood : P.park);
  // Two watchtowers with arched windows, a little taller than the wall.
  for (const [x0, x1] of [[8, 12], [23, 27]] as const) {
    const base = top(Math.floor((x0 + x1) / 2)) + 4;
    c.rect(x0, base - 8, x1, base, P.stone);
    c.rect(x1 - 1, base - 8, x1, base, P.stoneDark);
    for (let x = x0; x <= x1; x += 2) c.set(x, base - 9, x >= x1 - 1 ? P.stoneDark : P.stone);
    c.rect(x0 + 1, base - 5, x0 + 2, base - 3, P.slate);
    c.set(x0 + 1, base - 5, P.stone);
  }
  return finish(c, 14);
}

/** Width of one frame of a voyage duck, in art pixels. */
export const VOYAGE_FRAME_W = 40;
/** Height of one frame of a voyage duck, in art pixels. */
export const VOYAGE_FRAME_H = 32;

/** Which costumed duck to draw (see src/components/explore/duck-voyages.ts). */
export type VoyageDuck = 'british' | 'saharan' | 'chinese';

/** Union-flag blue, not in the map palette. */
const UNION_BLUE = hex('#2f56a8');
/** Tuareg indigo, for the Saharan duck's robe. */
const INDIGO = hex('#34428f');

/**
 * One frame of a costumed voyage duck, facing right (the game mirrors it for the other direction):
 * - `british`: a top hat and a red, white and blue scarf, sitting in a little sailing boat.
 * - `saharan`: a white ghutra head cloth with a black agal band and an indigo robe, on two legs.
 * - `chinese`: a conical straw hat and a red jacket with gold trim, on two legs.
 * Two frames (`step` 0 and 1) swap the legs (or rock the boat) and bob the body one pixel.
 * The same duck as the Emmanuel College landmark art, in different clothes.
 *
 * @param kind - Which duck.
 * @param step - 0 or 1, which animation frame.
 * @returns A VOYAGE_FRAME_W by VOYAGE_FRAME_H canvas with an outline and, for walkers, a shadow.
 */
export function voyageDuckFrame(kind: VoyageDuck, step: 0 | 1): PixelCanvas {
  const c = new PixelCanvas(VOYAGE_FRAME_W, VOYAGE_FRAME_H);
  // Drawing is in "duck coordinates" (the 24 px duck, head near x 17, y 7); OX and OY place that
  // inside the larger frame so hats and sails have room.
  const OX = 8;
  const OY = 6;
  const R = (x0: number, y0: number, x1: number, y1: number, col: Rgba) => c.rect(x0 + OX, y0 + OY, x1 + OX, y1 + OY, col);
  const H = (x0: number, x1: number, y: number, col: Rgba) => c.hline(x0 + OX, x1 + OX, y + OY, col);
  const V = (x: number, y0: number, y1: number, col: Rgba) => c.vline(x + OX, y0 + OY, y1 + OY, col);
  const S = (x: number, y: number, col: Rgba) => c.set(x + OX, y + OY, col);
  const E = (cx: number, cy: number, rx: number, ry: number, col: Rgba, keep?: (x: number, y: number) => boolean) =>
    c.ellipse(cx + OX, cy + OY, rx, ry, col, keep && ((x, y) => keep(x - OX, y - OY)));
  const bob = step;
  const hx = 17;
  const hy = 7 - bob;

  if (kind === 'british') {
    // Sail, mast and pennant first, so the duck sits in front of them.
    V(9, -4 - bob, 14, P.brickDark);
    for (let y = -3; y <= 8; y++) H(9 - Math.round((y + 3) * 0.8), 8, y - bob, P.paper);
    H(1, 8, 3 - bob, P.brick);
    H(2, 8, 4 - bob, P.brick);
    R(10, -4 - bob, 13, -3 - bob, P.brick);
    R(10, -2 - bob, 13, -2 - bob, UNION_BLUE);
    // Hull: dark planks with a gold rail, a lifted prow, and water rocking with the frame.
    H(-3, 27, 19, P.goldDark);
    H(-3, 27, 20, P.brickDark);
    H(-2, 26, 21, P.brick);
    H(-1, 25, 22, P.brickDark);
    S(28, 18, P.goldDark);
    S(27, 18, P.goldDark);
    H(-4 + step * 2, 28 + step * 2 - 2, 23, P.water);
    H(-1 - step * 2, 25 - step * 2, 24, P.waterDeep);
  } else {
    // Legs and webbed feet first, so the body overlaps their tops.
    const front = step === 0 ? 13 : 10;
    const back = step === 0 ? 8 : 12;
    for (const x of [front, back]) {
      R(x, 18, x, 20, P.goldDark);
      R(x, 21, x + 2, 21, P.gold);
    }
  }

  // Tail, body, wing (the robe or jacket colour depends on the costume).
  for (const [x, y] of [[2, 11 - bob], [3, 11 - bob], [3, 12 - bob], [2, 12 - bob]] as const) S(x, y, P.inkSoft);
  E(10.5, 14 - bob, 7.5, 4.6, P.stone);
  E(10.5, 14 - bob, 7.5, 4.6, P.stoneDark, (_x, y) => y >= 17 - bob);
  const wing = kind === 'saharan' ? INDIGO : kind === 'chinese' ? P.brick : P.stoneDark;
  E(9, 13.5 - bob, kind === 'british' ? 4.2 : 5.2, kind === 'british' ? 2.4 : 3.2, wing);
  if (kind === 'british') H(6, 11, 13 - bob, P.stone);
  if (kind === 'chinese') H(5, 13, 12 - bob, P.gold); // gold trim on the jacket
  if (kind === 'saharan') H(5, 13, 12 - bob, P.paper); // a pale sash on the robe
  // Chest, collar, neck and head.
  E(16, 13.5 - bob, 2.4, 3.2, P.brickDark);
  R(15, 7 - bob, 17, 11 - bob, P.verdigris);
  H(14, 18, 11 - bob, P.paper);
  E(hx, hy, 3.4, 2.9, P.verdigris);

  // Costume on the head (and neck).
  if (kind === 'british') {
    R(14, 11 - bob, 17, 12 - bob, P.brick); // scarf: red, white and blue bands, with a hanging end
    S(15, 11 - bob, P.paper);
    S(16, 12 - bob, UNION_BLUE);
    S(14, 13 - bob, P.brick);
    S(14, 14 - bob, P.paper);
    H(13, 21, 4 - bob, P.slate); // top hat: brim, crown, red band
    R(14, -1 - bob, 20, 3 - bob, P.slate);
    H(14, 20, 2 - bob, P.brick);
  } else if (kind === 'saharan') {
    E(16, 5.5 - bob, 4.3, 3.4, P.paper); // ghutra over the head
    R(11, 6 - bob, 13, 12 - bob, P.paper); // draped behind the neck
    R(12, 7 - bob, 13, 12 - bob, P.stone);
    for (const [x, y] of [[13, 3 - bob], [15, 2 - bob], [17, 3 - bob], [12, 8 - bob], [12, 10 - bob]] as const) S(x, y, P.brick);
    H(13, 19, 4 - bob, P.inkSoft); // agal, the black cord that holds it on
  } else {
    c.roof(17 + OX, 17 + OX, -3 - bob + OY, 4 - bob + OY, P.terracotta); // conical straw hat
    c.recolour((x, y, col) => x >= 18 + OX && y <= 4 - bob + OY && col.r === P.terracotta.r && col.g === P.terracotta.g, P.goldDark);
    H(14, 20, 1 - bob, P.goldDark);
    H(15, 19, -1 - bob, P.goldDark);
  }
  // Eye and a gold bill, drawn last so a head cloth never hides them.
  S(18, 6 - bob, P.ink);
  R(20, 7 - bob, 22, 8 - bob, P.gold);
  S(22, 8 - bob, P.goldDark);

  c.outline(P.ink);
  if (kind !== 'british') {
    const shadow = new PixelCanvas(VOYAGE_FRAME_W, VOYAGE_FRAME_H);
    shadow.ellipse(11.5 + OX, 22.5 + OY, 8, 1.4, SHADOW);
    for (let y = 0; y < VOYAGE_FRAME_H; y++) {
      for (let x = 0; x < VOYAGE_FRAME_W; x++) if (!c.filled(x, y) && shadow.filled(x, y)) c.set(x, y, SHADOW);
    }
  }
  return c;
}

/** Every sprite, keyed by landmark id: the six London ids (MASTER.md section 12) and the other cities'. */
export const SPRITES: Record<LandmarkId, () => PixelCanvas> = {
  'huxley-building': huxleyBuilding,
  'queens-tower': queensTower,
  'royal-albert-hall': royalAlbertHall,
  'exhibition-road': exhibitionRoad,
  'v-and-a': vAndA,
  'natural-history-museum': naturalHistoryMuseum,
  'raffles-landing-site': rafflesLandingSite,
  'raffles-hotel': rafflesHotel,
  'merlion-park': merlionPark,
  'viking-ship-museum': vikingShipMuseum,
  'akershus-fortress': akershusFortress,
  'emmanuel-college': emmanuelCollege,
  'great-wall-badaling': greatWallBadaling,
};
