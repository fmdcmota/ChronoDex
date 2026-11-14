/** Unit tests for panoData.ts (A4-01 spike, Agent 4). */
import { describe, expect, it } from 'vitest';
import { hFovDegOf, maxOffsetRad, panoDataFor } from './panoData';

describe('panoDataFor', () => {
  it('treats a 2:1 image at vFov 180 as the full sphere', () => {
    expect(panoDataFor({ widthPx: 4096, heightPx: 2048, vFovDeg: 180 })).toEqual({
      fullWidth: 4096, fullHeight: 2048, croppedWidth: 4096, croppedHeight: 2048, croppedX: 0, croppedY: 0,
    });
  });
  it('centres a 21:9 full-turn band vertically', () => {
    const d = panoDataFor({ widthPx: 3360, heightPx: 1440, vFovDeg: 154 });
    expect(d.fullWidth).toBe(3360);
    expect(d.croppedX).toBe(0);
    expect(d.fullHeight).toBe(1680);
    expect(d.croppedY).toBe(120);
  });
  it('centres a half-turn band horizontally', () => {
    const d = panoDataFor({ widthPx: 2100, heightPx: 900, vFovDeg: 90 });
    expect(d).toEqual({ fullWidth: 3600, fullHeight: 1800, croppedWidth: 2100, croppedHeight: 900, croppedX: 750, croppedY: 450 });
  });
  it('clamps an over-wide band to a full turn', () => {
    const d = panoDataFor({ widthPx: 4000, heightPx: 1000, vFovDeg: 180 });
    expect(d.fullWidth).toBe(4000);
    expect(d.croppedX).toBe(0);
  });
  it('rejects bad input', () => {
    expect(() => panoDataFor({ widthPx: 0, heightPx: 10, vFovDeg: 90 })).toThrow(RangeError);
    expect(() => panoDataFor({ widthPx: 10, heightPx: 10, vFovDeg: 181 })).toThrow(RangeError);
  });
});

describe('hFovDegOf', () => {
  it('is 360 for a near-full-turn band', () => {
    expect(hFovDegOf({ widthPx: 3360, heightPx: 1440, vFovDeg: 154 })).toBe(360);
  });
  it('is 210 for a 2100x900 band at vFov 90', () => {
    expect(hFovDegOf({ widthPx: 2100, heightPx: 900, vFovDeg: 90 })).toBeCloseTo(210);
  });
});

describe('maxOffsetRad', () => {
  it('allows half the spare field of view each way', () => {
    expect(maxOffsetRad(180, 60)).toBeCloseTo(Math.PI / 3);
  });
  it('is zero when the image is narrower than the screen', () => {
    expect(maxOffsetRad(40, 60)).toBe(0);
  });
});
