/**
 * Dex badges: each landmark sprite set in a round medal whose rim shows its rarity
 * (MASTER.md task A3-01, used by A3-07). Owner: Agent 3.
 *
 * Two versions per landmark:
 * - collected: rarity-coloured rim, paper field, the sprite in full colour;
 * - locked: grey rim, shaded field, the sprite as a flat silhouette, so the Dex can show what
 *   is still to find without giving the art away.
 */
import { PALETTE, RARITY_COLOURS } from '../../src/lib/palette';
import type { Rarity } from '../../src/lib/contracts-copy';
import { CLEAR, hex, PixelCanvas } from './canvas';
import { SPRITE_PX } from './sprites';

/** Width and height of every badge, in art pixels. */
export const BADGE_PX = 48;

/** Centre of the badge. Half-integer, so the 48-pixel disc is symmetric. */
const MID = (BADGE_PX - 1) / 2;
/** Radius of the rim disc. Leaves one pixel all round for the outline. */
const RIM_R = 22;
/** Radius of the paper field inside the rim. */
const FIELD_R = 17.5;

/**
 * Draw one badge.
 *
 * @param sprite - The landmark sprite, SPRITE_PX square.
 * @param rarity - Sets the rim colour.
 * @param locked - True for the not-yet-collected silhouette version.
 * @returns A new BADGE_PX-square canvas.
 */
export function makeBadge(sprite: PixelCanvas, rarity: Rarity, locked: boolean): PixelCanvas {
  const c = new PixelCanvas(BADGE_PX, BADGE_PX);
  const rim = hex(locked ? RARITY_COLOURS.common.rim : RARITY_COLOURS[rarity].rim);
  const rimDark = hex(locked ? RARITY_COLOURS.common.rimDark : RARITY_COLOURS[rarity].rimDark);
  const ink = hex(PALETTE.ink);

  // Rim, darker on the lower right, as if lit from the upper left.
  c.ellipse(MID, MID, RIM_R, RIM_R, rim);
  c.ellipse(MID, MID, RIM_R, RIM_R, rimDark, (x, y) => x + y > 2 * MID + 6);
  // A highlight arc on the upper left of the rim.
  c.ellipse(MID, MID, RIM_R - 1, RIM_R - 1, hex('#ffffff', 90), (x, y) => x + y < 2 * MID - 26);
  // Inner ink ring and the paper field.
  c.ellipse(MID, MID, FIELD_R + 1, FIELD_R + 1, ink);
  c.ellipse(MID, MID, FIELD_R, FIELD_R, hex(locked ? PALETTE.paperShade : PALETTE.paper));
  // A ground band at the bottom of the field, so the building stands on something.
  c.ellipse(MID, MID, FIELD_R, FIELD_R, hex(locked ? PALETTE.stoneDark : PALETTE.ground), (_x, y) => y >= 35);
  // Four rivets on the rim.
  for (const [x, y] of [[MID, 2.5], [MID, BADGE_PX - 3.5], [2.5, MID], [BADGE_PX - 3.5, MID]] as const) {
    c.rect(Math.floor(x), Math.floor(y), Math.ceil(x), Math.ceil(y), hex(locked ? PALETTE.stoneDark : PALETTE.gold));
  }

  // The sprite, clipped to the paper field so wide buildings do not spill over the ring.
  const offset = (BADGE_PX - SPRITE_PX) / 2;
  const top = offset - 1;
  const clipped = new PixelCanvas(SPRITE_PX, SPRITE_PX);
  clipped.stamp(sprite, 0, 0, (p) => (locked ? (p.a < 255 ? CLEAR : hex(PALETTE.inkSoft)) : p));
  for (let y = 0; y < SPRITE_PX; y++) {
    for (let x = 0; x < SPRITE_PX; x++) {
      const dx = offset + x - MID;
      const dy = top + y - MID;
      if (dx * dx + dy * dy > FIELD_R * FIELD_R) clipped.set(x, y, CLEAR);
    }
  }
  c.stamp(clipped, offset, top);

  c.outline(ink);
  return c;
}
