/**
 * The game-look map style: OpenFreeMap vector tiles drawn as a flat, retro handheld-RPG
 * overworld (MASTER.md task A3-02, assumption A1).
 *
 * Owner: Agent 3 (Explorer). Ported unchanged from spikes/agent-3/src/lib/game-map-style.ts.
 *
 * Why a style built from scratch rather than a recoloured "liberty": liberty has about 110
 * layers, most of them labels, shields and tunnel variants a game map does not want. Writing
 * the 19 layers we need is shorter than switching off the other 90, and nothing from
 * liberty's look survives by accident.
 *
 * Choices:
 * - No symbol layers, so no labels, no glyphs and no sprite sheet to load (the brief says
 *   labels off). Landmark markers are HTML elements added by the screen, not part of the style.
 * - Buildings get a drop shadow (the same polygons shifted down-right in a darker tone), which
 *   gives the raised-tile look of a top-down game.
 * - Roads are pale sand with a dark edge, like paths on a game map.
 *
 * Data: the `openmaptiles` vector source from OpenFreeMap (no key, free). Attribution to
 * OpenFreeMap, OpenMapTiles and OpenStreetMap is required and set on the source below.
 * Layer and field names follow the OpenMapTiles schema, checked against the live TileJSON at
 * https://tiles.openfreemap.org/planet on 14 Nov 2026.
 */
import type { MapOptions } from 'maplibre-gl';
import { PALETTE } from './palette';

/**
 * MapLibre's style document type. Taken from MapOptions so this file depends only on
 * `maplibre-gl` itself, not on its internal style-spec package.
 */
export type GameMapStyle = Exclude<MapOptions['style'], string | undefined>;

/** OpenFreeMap's TileJSON for the whole planet. No key needed. */
export const OPENFREEMAP_TILEJSON_URL = 'https://tiles.openfreemap.org/planet';

/** Attribution the tile licence requires (OpenFreeMap, OpenMapTiles, OpenStreetMap contributors). */
export const MAP_ATTRIBUTION =
  '<a href="https://openfreemap.org" target="_blank" rel="noopener">OpenFreeMap</a> ' +
  '<a href="https://www.openmaptiles.org/" target="_blank" rel="noopener">&copy; OpenMapTiles</a> ' +
  'Data from <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>';

/** Name of the vector source inside the style. */
const SRC = 'openmaptiles';

/** Pixels the building shadow is shifted right and down. Bigger reads as taller. */
const BUILDING_SHADOW_PX = 3;

/** Road classes in OpenMapTiles' `transportation` layer, grouped by how wide we draw them. */
const MAJOR_ROADS = ['motorway', 'trunk', 'primary'];
const MID_ROADS = ['secondary', 'tertiary'];
const MINOR_ROADS = ['minor', 'service', 'track', 'raceway', 'busway'];

/**
 * A zoom-dependent line width that roughly doubles per zoom level, so roads keep their
 * real-world width as the player zooms.
 *
 * @param widthAtZ15Px - Width in screen pixels at zoom 15.
 * @returns A MapLibre interpolate expression.
 */
function roadWidth(widthAtZ15Px: number): unknown[] {
  return ['interpolate', ['exponential', 1.6], ['zoom'], 13, widthAtZ15Px * 0.35, 15, widthAtZ15Px, 19, widthAtZ15Px * 9];
}

/**
 * An opacity that rises smoothly from 0 to 1 over a zoom range, so a kind of detail (small roads,
 * paths, buildings) fades in as the player zooms in instead of popping into view, the way Google
 * Maps does it. Below `fromZoom` it is invisible, at `toZoom` and above it is solid.
 *
 * The ramp is eased (ease-in-out cubic bezier), not linear: a linear ramp has a visible "corner"
 * where it starts and stops, which reads as a flicker; an S-curve starts and ends gently.
 *
 * Why not minzoom: a layer's `minzoom` switches it on in one frame, which looks like popping.
 *
 * @param fromZoom - Zoom where the detail starts to appear.
 * @param toZoom - Zoom where it is fully opaque.
 * @returns A MapLibre interpolate expression for `fill-opacity` or `line-opacity`.
 */
export function fadeIn(fromZoom: number, toZoom: number): unknown[] {
  return ['interpolate', ['cubic-bezier', 0.42, 0, 0.58, 1], ['zoom'], fromZoom, 0, toZoom, 1];
}

/**
 * Zoom ranges over which each kind of detail fades in. Solid from the end of the range up.
 *
 * Every range STARTS at a whole zoom level on purpose. The vector tiles bring in new features
 * when the map crosses a whole zoom level (measured on 15 Nov 2026 with a zoom sweep over South
 * Kensington: minor and mid roads arrive at zoom 12, footpaths and plazas at 13, most buildings
 * at 14). A fade that starts in the middle of a level lets that new data appear already half
 * visible, which is the "suddenly appearing" look. Starting at the level means the new data
 * arrives at opacity 0 and then dissolves in.
 */
export const DETAIL_FADE = {
  /** Secondary and tertiary roads. Below zoom 12 only the major roads show. */
  midRoads: [12, 14.5],
  /** Minor streets and service roads. */
  minorRoads: [12, 15.5],
  /** Footpaths and pedestrian squares. */
  paths: [13, 16],
  /** Rail lines. */
  rail: [10, 12.5],
  /** Buildings and their shadows: the big ones arrive at 13, nearly all of them at 14. */
  buildings: [14, 15.8],
} as const;

/** Filter for line features of the given road classes that are not tunnels. */
function roadFilter(classes: string[]): unknown[] {
  return [
    'all',
    ['==', ['geometry-type'], 'LineString'],
    ['in', ['get', 'class'], ['literal', classes]],
    ['!=', ['get', 'brunnel'], 'tunnel'],
  ];
}

/**
 * Build the game-look style document.
 *
 * Example: `new maplibregl.Map({ container, style: buildGameMapStyle(), ... })`.
 *
 * @returns A complete MapLibre style (version 8) with one vector source and no symbol layers.
 *   A new object on every call, so the caller may change it.
 */
export function buildGameMapStyle(): GameMapStyle {
  const style = {
    version: 8,
    name: 'Chronodex overworld',
    sources: {
      [SRC]: { type: 'vector', url: OPENFREEMAP_TILEJSON_URL, attribution: MAP_ATTRIBUTION },
    },
    layers: [
      { id: 'ground', type: 'background', paint: { 'background-color': PALETTE.ground } },

      // Green areas first, so water, roads and buildings sit on top of them.
      {
        id: 'park',
        type: 'fill',
        source: SRC,
        'source-layer': 'park',
        paint: { 'fill-color': PALETTE.park },
      },
      {
        id: 'landcover-green',
        type: 'fill',
        source: SRC,
        'source-layer': 'landcover',
        filter: ['in', ['get', 'class'], ['literal', ['grass', 'farmland']]],
        paint: { 'fill-color': PALETTE.park },
      },
      {
        id: 'landuse-green',
        type: 'fill',
        source: SRC,
        'source-layer': 'landuse',
        filter: ['in', ['get', 'class'], ['literal', ['pitch', 'cemetery', 'playground', 'garden']]],
        paint: { 'fill-color': PALETTE.park },
      },
      {
        id: 'landcover-wood',
        type: 'fill',
        source: SRC,
        'source-layer': 'landcover',
        filter: ['==', ['get', 'class'], 'wood'],
        paint: { 'fill-color': PALETTE.wood },
      },

      // Water: a deep edge drawn as a wider outline under a lighter fill.
      {
        id: 'water-edge',
        type: 'line',
        source: SRC,
        'source-layer': 'water',
        filter: ['!=', ['get', 'brunnel'], 'tunnel'],
        paint: { 'line-color': PALETTE.waterDeep, 'line-width': 3 },
      },
      {
        id: 'water',
        type: 'fill',
        source: SRC,
        'source-layer': 'water',
        filter: ['!=', ['get', 'brunnel'], 'tunnel'],
        paint: { 'fill-color': PALETTE.water },
      },
      {
        id: 'waterway',
        type: 'line',
        source: SRC,
        'source-layer': 'waterway',
        filter: ['!=', ['get', 'brunnel'], 'tunnel'],
        paint: { 'line-color': PALETTE.water, 'line-width': roadWidth(2) },
      },

      // Pedestrian squares and plazas, for example Exhibition Road's shared surface.
      {
        id: 'pedestrian-area',
        type: 'fill',
        source: SRC,
        'source-layer': 'transportation',
        filter: ['==', ['geometry-type'], 'Polygon'],
        paint: { 'fill-opacity': fadeIn(...DETAIL_FADE.paths), 'fill-color': PALETTE.path },
      },

      // Roads: every edge first, then every surface, so junctions join cleanly.
      {
        id: 'road-minor-edge',
        type: 'line',
        source: SRC,
        'source-layer': 'transportation',
        filter: roadFilter(MINOR_ROADS),
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: { 'line-opacity': fadeIn(...DETAIL_FADE.minorRoads), 'line-color': PALETTE.roadEdge, 'line-width': roadWidth(5) },
      },
      {
        id: 'road-mid-edge',
        type: 'line',
        source: SRC,
        'source-layer': 'transportation',
        filter: roadFilter(MID_ROADS),
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: { 'line-opacity': fadeIn(...DETAIL_FADE.midRoads), 'line-color': PALETTE.roadEdge, 'line-width': roadWidth(8) },
      },
      {
        id: 'road-major-edge',
        type: 'line',
        source: SRC,
        'source-layer': 'transportation',
        filter: roadFilter(MAJOR_ROADS),
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: { 'line-color': PALETTE.roadEdge, 'line-width': roadWidth(11) },
      },
      {
        id: 'path',
        type: 'line',
        source: SRC,
        'source-layer': 'transportation',
        filter: roadFilter(['path']),
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: { 'line-opacity': fadeIn(...DETAIL_FADE.paths), 'line-color': PALETTE.path, 'line-width': roadWidth(2.5) },
      },
      {
        id: 'road-minor',
        type: 'line',
        source: SRC,
        'source-layer': 'transportation',
        filter: roadFilter(MINOR_ROADS),
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: { 'line-opacity': fadeIn(...DETAIL_FADE.minorRoads), 'line-color': PALETTE.road, 'line-width': roadWidth(3.5) },
      },
      {
        id: 'road-mid',
        type: 'line',
        source: SRC,
        'source-layer': 'transportation',
        filter: roadFilter(MID_ROADS),
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: { 'line-opacity': fadeIn(...DETAIL_FADE.midRoads), 'line-color': PALETTE.road, 'line-width': roadWidth(6) },
      },
      {
        id: 'road-major',
        type: 'line',
        source: SRC,
        'source-layer': 'transportation',
        filter: roadFilter(MAJOR_ROADS),
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: { 'line-color': PALETTE.road, 'line-width': roadWidth(9) },
      },
      {
        id: 'rail',
        type: 'line',
        source: SRC,
        'source-layer': 'transportation',
        filter: roadFilter(['rail', 'transit']),
        paint: { 'line-opacity': fadeIn(...DETAIL_FADE.rail), 'line-color': PALETTE.rail, 'line-width': 2, 'line-dasharray': [2, 2] },
      },

      // Buildings: shadow, then the roof on top.
      {
        id: 'building-shadow',
        type: 'fill',
        source: SRC,
        'source-layer': 'building',
        paint: { 'fill-opacity': fadeIn(...DETAIL_FADE.buildings),
          'fill-color': PALETTE.buildingShade,
          'fill-translate': [BUILDING_SHADOW_PX, BUILDING_SHADOW_PX],
          'fill-translate-anchor': 'viewport',
        },
      },
      {
        id: 'building',
        type: 'fill',
        source: SRC,
        'source-layer': 'building',
        paint: { 'fill-opacity': fadeIn(...DETAIL_FADE.buildings), 'fill-color': PALETTE.building, 'fill-outline-color': PALETTE.buildingShade },
      },
    ],
  };
  // The literal above was validated with MapLibre's own style validator in the spike
  // (spikes/agent-3/src/lib/game-map-style.test.ts). The cast is needed only because TypeScript
  // widens string literals such as 'fill'.
  return style as unknown as GameMapStyle;
}
