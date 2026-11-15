/**
 * Tests for eraMedia.ts: which Era URLs need persisting and the patch that swaps them.
 *
 * Owner: Agent 4 (Time Machine). Task A4-13.
 */
import { describe, expect, it } from 'vitest';
import type { Era } from '@/lib/contracts';
import { HERO_ERA_ID, eras } from '@fixtures/index';
import { eraMediaPatch, needsPersisting, unpersistedMedia } from './eraMedia';

const OURS = `/api/media/${'a'.repeat(32)}`;

/** The hero era with fal-looking URLs everywhere. */
function falEra(): Era {
  const hero = structuredClone(eras.find((e) => e.id === HERO_ERA_ID)!);
  return {
    ...hero,
    sceneImageUrl: 'https://v3.fal.media/scene.jpg',
    panorama: { ...hero.panorama!, url: 'https://v3.fal.media/pano.jpg' },
    narrationAudioUrl: OURS,
    guide: { ...hero.guide!, headshotUrl: '/mock/headshot.svg' },
    guideVideo: {
      segments: [
        { kind: 'walk_on', url: 'https://v3.fal.media/on.mp4', durationS: 5 },
        { kind: 'talk', url: 'https://v3.fal.media/talk.mp4', durationS: 40 },
      ],
      stitchedUrl: null,
    },
  };
}

describe('needsPersisting', () => {
  it('wants http URLs that are not ours', () => {
    expect(needsPersisting('https://v3.fal.media/x.jpg')).toBe(true);
    expect(needsPersisting(OURS)).toBe(false);
    expect(needsPersisting(`https://x.trycloudflare.com${OURS}`)).toBe(false);
    expect(needsPersisting('/mock/scene.svg')).toBe(false);
    expect(needsPersisting(null)).toBe(false);
  });
});

describe('unpersistedMedia', () => {
  it('lists fal URLs in a stable order and can leave video out', () => {
    expect(unpersistedMedia(falEra()).map((r) => r.name)).toEqual(['scene', 'panorama', 'walk_on', 'talk']);
    expect(unpersistedMedia(falEra(), { includeVideo: false }).map((r) => r.name)).toEqual(['scene', 'panorama']);
  });
});

describe('eraMediaPatch', () => {
  it('swaps only replaced URLs and keeps the rest of each object', () => {
    const era = falEra();
    const patch = eraMediaPatch(
      era,
      new Map([
        ['https://v3.fal.media/pano.jpg', '/api/media/p'],
        ['https://v3.fal.media/talk.mp4', '/api/media/t'],
      ]),
    );
    expect(Object.keys(patch).sort()).toEqual(['guideVideo', 'panorama']);
    expect(patch.panorama).toEqual({ ...era.panorama, url: '/api/media/p' });
    expect(patch.guideVideo?.segments.map((s) => s.url)).toEqual(['https://v3.fal.media/on.mp4', '/api/media/t']);
    expect(patch.guideVideo?.segments[1].durationS).toBe(40);
  });

  it('returns an empty patch when nothing was replaced', () => {
    expect(eraMediaPatch(falEra(), new Map())).toEqual({});
  });
});
