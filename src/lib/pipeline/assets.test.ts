/**
 * Tests for the overnight scripts' helpers: the asset list and the cost estimate. Owner: Agent 2 (Studio). Task A2-13.
 */
import { describe, expect, it } from 'vitest';
import { landmarks, missingEra } from '@fixtures/index';
import type { Era } from '@/lib/contracts';
import { estimateEraCostUsd, eraAssets, landmarkAssets } from './assets';

/** An era with real-looking URLs on every field. */
function fullEra(): Era {
  const base = missingEra(landmarks[0], landmarks[0].eraYears[0]);
  return {
    ...base,
    state: 'ready',
    videoState: 'ready',
    sceneImageUrl: 'https://cdn/scene.jpg',
    panorama: { url: 'https://cdn/pano.jpg', widthPx: 4032, heightPx: 2016, vFovDeg: 180, centreBearingDeg: 10 },
    narrationAudioUrl: 'https://cdn/voice.mp3',
    guide: { name: 'A', role: 'B', bio: 'C', appearance: 'D', voiceKey: 'eleven-george', script: 's', greeting: 'g', headshotUrl: 'https://cdn/head.jpg' },
    guideVideo: {
      segments: [
        { kind: 'walk_on', url: 'https://cdn/on.mp4', durationS: 5 },
        { kind: 'talk', url: 'https://cdn/talk.mp4', durationS: 44 },
        { kind: 'walk_off', url: 'https://cdn/off.mp4', durationS: 5 },
      ],
      stitchedUrl: 'https://cdn/all.mp4',
    },
  };
}

describe('eraAssets', () => {
  it('lists every media file of a finished era with a name that says what it is', () => {
    expect(eraAssets(fullEra())).toEqual([
      { name: 'scene', url: 'https://cdn/scene.jpg' },
      { name: 'panorama', url: 'https://cdn/pano.jpg' },
      { name: 'narration', url: 'https://cdn/voice.mp3' },
      { name: 'headshot', url: 'https://cdn/head.jpg' },
      { name: 'walk_on', url: 'https://cdn/on.mp4' },
      { name: 'talk', url: 'https://cdn/talk.mp4' },
      { name: 'walk_off', url: 'https://cdn/off.mp4' },
      { name: 'stitched', url: 'https://cdn/all.mp4' },
    ]);
  });

  it('lists nothing for an era that has not been generated, and skips fixtures\' relative paths', () => {
    expect(eraAssets(missingEra(landmarks[0], landmarks[0].eraYears[0]))).toEqual([]);
    const fixtureEra: Era = {
      ...missingEra(landmarks[0], landmarks[0].eraYears[0]),
      sceneImageUrl: '/mock/scene.svg',
      panorama: { url: '/mock/pano.svg', widthPx: 2880, heightPx: 1440, vFovDeg: 180, centreBearingDeg: 0 },
    };
    expect(eraAssets(fixtureEra)).toEqual([]);
  });

  it('skips the pieces that do not exist yet (a core-only era has no video)', () => {
    const era = { ...fullEra(), guideVideo: null };
    expect(eraAssets(era).map((a) => a.name)).toEqual(['scene', 'panorama', 'narration', 'headshot']);
  });
});

describe('landmarkAssets', () => {
  it('returns the reference photo only when it is a real URL', () => {
    expect(landmarkAssets({ ...landmarks[0], referencePhotoUrl: 'https://cdn/ref.jpg' })).toEqual([{ name: 'reference', url: 'https://cdn/ref.jpg' }]);
    expect(landmarkAssets({ ...landmarks[0], referencePhotoUrl: '/mock/reference.svg' })).toEqual([]);
  });
});

describe('estimateEraCostUsd', () => {
  it('costs well under a dollar for the core tier and several dollars more for video', () => {
    const core = estimateEraCostUsd(false);
    expect(core.videoUsd).toBe(0);
    expect(core.coreUsd).toBeGreaterThan(0.4);
    expect(core.coreUsd).toBeLessThan(1.5);
    const full = estimateEraCostUsd(true);
    expect(full.coreUsd).toBe(core.coreUsd);
    expect(full.videoUsd).toBeGreaterThan(3);
    expect(full.totalUsd).toBeCloseTo(full.coreUsd + full.videoUsd, 1);
  });

  it('grows with the retry allowance', () => {
    expect(estimateEraCostUsd(false, { retryAllowance: 1 }).coreUsd).toBeGreaterThan(estimateEraCostUsd(false, { retryAllowance: 0 }).coreUsd);
  });
});

describe('eraAssets with our own stored files (A2-h)', () => {
  it('lists /api/media URLs, which is what the Era holds after the pipeline keeps its outputs', () => {
    const era: Era = { ...fullEra(), sceneImageUrl: '/api/media/abc123', guideVideo: null };
    expect(eraAssets(era)[0]).toEqual({ name: 'scene', url: '/api/media/abc123' });
  });
});
