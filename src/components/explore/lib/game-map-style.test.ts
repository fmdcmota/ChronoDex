/**
 * Tests for the zoom fade of map detail (Agent 3). The rest of the style was validated in the spike.
 */
import { describe, expect, it } from 'vitest';
import { buildGameMapStyle, DETAIL_FADE, fadeIn } from './game-map-style';

describe('fadeIn', () => {
  it('builds an eased 0 to 1 ramp over the zoom range', () => {
    expect(fadeIn(13, 15)).toEqual(['interpolate', ['cubic-bezier', 0.42, 0, 0.58, 1], ['zoom'], 13, 0, 15, 1]);
  });
});

describe('DETAIL_FADE', () => {
  it('has ascending ranges, fully solid by zoom 16 where the player stands', () => {
    for (const [from, to] of Object.values(DETAIL_FADE)) {
      expect(from).toBeLessThan(to);
      expect(to).toBeLessThanOrEqual(16);
    }
  });

  it('is at least a zoom level and a half wide, so the dissolve is slow', () => {
    for (const [from, to] of Object.values(DETAIL_FADE)) expect(to - from).toBeGreaterThanOrEqual(1.5);
  });

  it('starts every fade on a whole zoom level, where the tiles bring in new data', () => {
    for (const [from] of Object.values(DETAIL_FADE)) expect(Number.isInteger(from)).toBe(true);
  });

  it('shows the bigger roads no later than the smaller ones, and paths after both', () => {
    expect(DETAIL_FADE.midRoads[0]).toBeLessThanOrEqual(DETAIL_FADE.minorRoads[0]);
    expect(DETAIL_FADE.minorRoads[0]).toBeLessThan(DETAIL_FADE.paths[0]);
  });
});

describe('buildGameMapStyle', () => {
  it('fades each detail layer in rather than switching it on with minzoom', () => {
    const layers = buildGameMapStyle().layers as Array<{ id: string; minzoom?: number; paint?: Record<string, unknown> }>;
    const faded = ['pedestrian-area', 'road-minor-edge', 'road-mid-edge', 'path', 'road-minor', 'road-mid', 'rail', 'building-shadow', 'building'];
    for (const id of faded) {
      const layer = layers.find((l) => l.id === id);
      expect(layer, id).toBeDefined();
      expect(layer!.minzoom, id).toBeUndefined();
      expect(Object.keys(layer!.paint ?? {}).some((k) => k.endsWith('-opacity')), id).toBe(true);
    }
  });

  it('leaves the base map (ground, water, parks, major roads) always solid', () => {
    const layers = buildGameMapStyle().layers as Array<{ id: string; paint?: Record<string, unknown> }>;
    for (const id of ['ground', 'water', 'park', 'road-major', 'road-major-edge']) {
      const layer = layers.find((l) => l.id === id);
      expect(Object.keys(layer!.paint ?? {}).some((k) => k.endsWith('-opacity')), id).toBe(false);
    }
  });
});
