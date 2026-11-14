/**
 * Tests for the game-look map style (task A3-02). Owner: Agent 3.
 * Validates with MapLibre's own style validator, so a bad paint property fails here, not on a phone.
 */
import { describe, expect, it } from 'vitest';
import { validateStyleMin, type StyleSpecification } from '@maplibre/maplibre-gl-style-spec';
import { buildGameMapStyle, MAP_ATTRIBUTION } from './game-map-style';

/** Source layers in OpenFreeMap's TileJSON, read from https://tiles.openfreemap.org/planet on 14 Nov 2026. */
const KNOWN_SOURCE_LAYERS = new Set([
  'aerodrome_label', 'aeroway', 'boundary', 'building', 'housenumber', 'landcover', 'landuse',
  'mountain_peak', 'park', 'place', 'poi', 'transportation', 'transportation_name', 'water',
  'water_name', 'waterway',
]);

describe('buildGameMapStyle', () => {
  const style = buildGameMapStyle() as StyleSpecification;

  it('passes the MapLibre style validator', () => {
    expect(validateStyleMin(style)).toEqual([]);
  });

  it('has no labels (no symbol layers)', () => {
    expect(style.layers.filter((l) => l.type === 'symbol')).toEqual([]);
  });

  it('only reads source layers the tiles have', () => {
    for (const l of style.layers) {
      if ('source-layer' in l && l['source-layer']) {
        expect(KNOWN_SOURCE_LAYERS.has(l['source-layer']), l.id).toBe(true);
      }
    }
  });

  it('credits OpenFreeMap, OpenMapTiles and OpenStreetMap', () => {
    for (const name of ['OpenFreeMap', 'OpenMapTiles', 'OpenStreetMap']) expect(MAP_ATTRIBUTION).toContain(name);
  });

  it('returns a fresh object each call', () => {
    expect(buildGameMapStyle()).not.toBe(buildGameMapStyle());
  });
});
