/**
 * Tests for guideVideoKey (Agent 4, R3-4b): the swap from the preview to the real clips without a reload.
 */
import { describe, expect, it } from 'vitest';
import { guideVideoKey } from './GuidePlayer';

const clips = {
  segments: [
    { kind: 'walk_on' as const, url: 'a.mp4', durationS: 5 },
    { kind: 'talk' as const, url: 'b.mp4', durationS: 45 },
    { kind: 'walk_off' as const, url: 'c.mp4', durationS: 5 },
  ],
  stitchedUrl: null,
};

describe('guideVideoKey', () => {
  it('is empty with no video or no clips', () => {
    expect(guideVideoKey(null)).toBe('');
    expect(guideVideoKey({ segments: [], stitchedUrl: null })).toBe('');
  });
  it('is equal for a fresh object with the same clips (a poll does not rebuild the player)', () => {
    expect(guideVideoKey(structuredClone(clips))).toBe(guideVideoKey(clips));
  });
  it('changes when the clips land or the stitched file appears', () => {
    expect(guideVideoKey(clips)).not.toBe('');
    expect(guideVideoKey({ ...clips, stitchedUrl: 's.mp4' })).not.toBe(guideVideoKey(clips));
    expect(JSON.parse(guideVideoKey({ ...clips, stitchedUrl: 's.mp4' }))).toEqual([{ url: 's.mp4', kind: 'stitched' }]);
  });
});
