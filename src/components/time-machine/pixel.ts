/**
 * Shared class strings that put Agent 4's screens in the game look from Agent 3's globals.css:
 * flat ink, paper and gold, the Jersey 10 pixel font, and stepped "pixel" frames drawn with
 * box-shadow instead of rounded corners (assumption A1).
 *
 * Owner: Agent 4. Used by src/components/time-machine and src/components/chat.
 *
 * Why constants and not new global classes: globals.css belongs to Agent 3. Everything here is a
 * Tailwind utility over Agent 3's CSS variables (`--ink`, `--gold`, `--pixel-frame`, ...), so a
 * palette change there flows through. Agent 3's `.btn` class is reused as is for primary buttons.
 *
 * Trap: the pixel frame is a box-shadow drawn 3 px outside the element. Leave room (a margin or
 * padding on the parent) or it is clipped by `overflow: hidden` ancestors.
 */

/** The pixel font at a size that reads on a phone. Add a text size where it differs. */
export const PIXEL_FONT = 'font-(family-name:--font-pixel) font-normal leading-none tracking-wide';

/** Stepped ink outline. */
export const PIXEL_FRAME = 'shadow-(--pixel-frame)';

/** Primary call to action: Agent 3's gold `.btn`. */
export const BTN_PRIMARY = 'btn';

/** Small secondary button for dark screens: paper face, ink outline, pixel font. */
export const BTN_SECONDARY = `${PIXEL_FONT} m-[3px] bg-(--paper) px-2.5 py-1.5 text-lg text-(--ink) ${PIXEL_FRAME} active:translate-y-px`;

/** BTN_SECONDARY at header size, where width is scarce. */
export const BTN_SECONDARY_SMALL = `${PIXEL_FONT} m-[3px] bg-(--paper) px-1.5 py-1 text-base text-(--ink) ${PIXEL_FRAME} active:translate-y-px`;

/** Small label floating over imagery, for example "AI reconstruction". */
export const TAG_DARK = `${PIXEL_FONT} bg-(--ink)/80 px-1.5 py-1 text-base text-(--paper)`;

/** Panel over imagery on dark screens: ink with a gold pixel outline. */
export const PANEL_DARK =
  'bg-(--ink)/95 text-(--paper) shadow-[0_-3px_0_0_var(--gold),0_3px_0_0_var(--gold),-3px_0_0_0_var(--gold),3px_0_0_0_var(--gold)]';

/** Section label inside a panel, for example "Fun facts". */
export const SECTION_LABEL = `${PIXEL_FONT} text-xl text-(--gold)`;
