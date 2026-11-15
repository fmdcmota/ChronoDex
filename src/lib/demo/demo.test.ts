/**
 * Tests for the bundled demo set (src/lib/demo). Agent 6.
 */
import { existsSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { EraSchema, LandmarkSchema } from '@/lib/contracts';
import { eras, landmarks } from '@fixtures/index';
import { DEMO_ERAS, DEMO_LANDMARKS, withDemoEras, withDemoLandmarks } from './index';

/** Every /demo/... URL an era points at. */
function demoUrls(era: (typeof DEMO_ERAS)[number]): string[] {
  return [era.sceneImageUrl, era.panorama?.url, era.guide?.headshotUrl, era.narrationAudioUrl, ...(era.guideVideo?.segments.map((s) => s.url) ?? [])].filter(
    (u): u is string => Boolean(u),
  );
}

describe('demo set', () => {
  it('has 8 valid ready eras whose files are all in public/', () => {
    expect(DEMO_ERAS).toHaveLength(8);
    for (const era of DEMO_ERAS) {
      expect(EraSchema.parse(era)).toEqual(era);
      expect(era.state).toBe('ready');
      for (const url of demoUrls(era)) expect(existsSync(path.join(process.cwd(), 'public', url)), url).toBe(true);
    }
  });
  it('has valid landmarks with a committed reference photo', () => {
    for (const landmark of DEMO_LANDMARKS) {
      expect(LandmarkSchema.parse(landmark)).toEqual(landmark);
      expect(existsSync(path.join(process.cwd(), 'public', landmark.referencePhotoUrl))).toBe(true);
    }
  });
  it('lays itself over the fixtures when enabled, and not when disabled', () => {
    const on = withDemoEras(eras, true);
    expect(on.find((e) => e.id === 'royal-albert-hall_1871')?.videoState).toBe('ready');
    expect(on).toHaveLength(eras.length);
    expect(withDemoEras(eras, false)).toEqual(eras);
    expect(withDemoLandmarks(landmarks, true).find((l) => l.id === 'zocalo-cathedral')?.referencePhotoUrl).toBe('/demo/reference/zocalo-cathedral.jpg');
  });
});
