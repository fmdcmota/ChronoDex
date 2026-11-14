/**
 * Chronodex colour palette: one set of flat colours shared by the map style, the pixel art and
 * the UI (MASTER.md task A3-01, assumption A1).
 *
 * Owner: Agent 3 (Explorer). Ported unchanged from spikes/agent-3/src/lib/palette.ts.
 * The same values also live as CSS custom properties in src/app/globals.css; keep the two in step.
 *
 * Direction: "Albertopolis on a handheld". The colours of South Kensington itself (terracotta,
 * red brick, Portland stone, copper verdigris, slate roofs, park green) pushed to flat, saturated
 * game tones. Original palette, not taken from any existing game.
 */
import type { Rarity } from '@/lib/contracts';

/** Every colour the art and the map may use, as #rrggbb. */
export const PALETTE = {
  /** Outlines, text. A warm near-black, softer than pure black on a phone screen. */
  ink: '#1e1a2b',
  /** Secondary text, shadows of dark things. */
  inkSoft: '#4a4360',
  /** Cards, sheets, the page background. Old paper. */
  paper: '#f6efd9',
  /** Paper in shadow, card borders. */
  paperShade: '#dfd2ac',

  /** Map ground: the "grass" every game map sits on. */
  ground: '#b9dc8a',
  /** Parks and lawns, one step deeper than the ground. */
  park: '#8fc66b',
  /** Trees and woods, and the shadow side of greens in sprites. */
  wood: '#5f9e4e',
  /** Water fills. */
  water: '#6cb8e0',
  /** Water edges and the shaded side of water. */
  waterDeep: '#3d82b8',

  /** Road surface. Pale sand, so roads read as paths in a game, not as asphalt. */
  road: '#fbf1cf',
  /** Road edges. */
  roadEdge: '#c9a66b',
  /** Footpaths and pedestrian areas. */
  path: '#ead9a4',
  /** Railway lines. */
  rail: '#8c7b9c',

  /** Building tops on the map. Warm stone. */
  building: '#e9c79a',
  /** Building outlines and the drop shadow that gives the map a tiled, raised look. */
  buildingShade: '#b98a5e',

  /** Victorian red brick (Albert Hall, Huxley). */
  brick: '#c8553d',
  /** Brick in shadow. */
  brickDark: '#8e3a2d',
  /** Terracotta (Natural History Museum). */
  terracotta: '#e0a36b',
  /** Portland stone, pale facades. */
  stone: '#efe3c2',
  /** Stone in shadow. */
  stoneDark: '#bfae86',
  /** Copper roofs gone green (Queen's Tower dome). */
  verdigris: '#4fa58f',
  /** Verdigris in shadow. */
  verdigrisDark: '#2f6f62',
  /** Slate roofs, windows, doors. */
  slate: '#3c4a6b',
  /** Glass highlights, sky glints. */
  glass: '#a9d8ef',
  /** Gold accents: finials, the capture button, legendary rarity. */
  gold: '#f2b43c',
  /** Gold in shadow. */
  goldDark: '#b97b1e',

  /** The player marker. Bright, unlike anything on the map. */
  player: '#e8466e',
  /** Accuracy ring around the player. Used with transparency. */
  playerRing: '#e8466e',
} as const;

/** A key of PALETTE. */
export type PaletteKey = keyof typeof PALETTE;

/**
 * Rim colour per rarity, used by markers, badges and Dex cards.
 * Grey, blue, purple, gold: the usual loot ladder, so players read it without a legend.
 */
export const RARITY_COLOURS = {
  common: { rim: '#9aa3ad', rimDark: '#5f6873' },
  rare: { rim: '#3f8fd6', rimDark: '#245f99' },
  epic: { rim: '#9b59d0', rimDark: '#663690' },
  legendary: { rim: PALETTE.gold, rimDark: PALETTE.goldDark },
} as const satisfies Record<Rarity, { rim: string; rimDark: string }>;
