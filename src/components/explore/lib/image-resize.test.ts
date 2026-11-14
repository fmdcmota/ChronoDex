/**
 * Tests for the photo size maths (task A3-06). Owner: Agent 3. The canvas encoding needs a browser
 * and is checked by hand on a phone.
 */
import { describe, expect, it } from 'vitest';
import { fitWithin, MAX_PHOTO_EDGE_PX, qualityLadder } from './image-resize';

describe('fitWithin', () => {
  it('scales a landscape phone photo so the long edge is 1600', () => {
    expect(fitWithin(4032, 3024)).toEqual({ widthPx: 1600, heightPx: 1200 });
  });

  it('scales a portrait photo the same way', () => {
    expect(fitWithin(3024, 4032)).toEqual({ widthPx: 1200, heightPx: 1600 });
  });

  it('never enlarges a small photo', () => {
    expect(fitWithin(800, 600)).toEqual({ widthPx: 800, heightPx: 600 });
    expect(fitWithin(MAX_PHOTO_EDGE_PX, 900)).toEqual({ widthPx: 1600, heightPx: 900 });
  });

  it('keeps 16:9 exactly at 16:9', () => {
    expect(fitWithin(1920, 1080)).toEqual({ widthPx: 1600, heightPx: 900 });
  });

  it('never produces a zero side for an extreme panorama', () => {
    expect(fitWithin(40_000, 10)).toEqual({ widthPx: 1600, heightPx: 1 });
  });

  it('honours a custom maximum', () => {
    expect(fitWithin(2000, 1000, 500)).toEqual({ widthPx: 500, heightPx: 250 });
  });

  it('rejects impossible sizes', () => {
    for (const [w, h] of [[0, 10], [10, 0], [-1, 10], [Number.NaN, 10], [10, Number.POSITIVE_INFINITY]] as const) {
      expect(() => fitWithin(w, h), `${w}x${h}`).toThrow();
    }
  });
});

describe('qualityLadder', () => {
  it('starts high, only goes down, and ends at the floor', () => {
    const ladder = qualityLadder();
    expect(ladder[0]).toBe(0.85);
    expect(ladder[ladder.length - 1]).toBe(0.5);
    for (let i = 1; i < ladder.length; i++) expect(ladder[i]!).toBeLessThan(ladder[i - 1]!);
  });
});
