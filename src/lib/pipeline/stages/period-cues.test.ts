/**
 * Tests for PromptStyle.periodCues: place-specific period detail replaces the London default. Agent 6.
 */
import { describe, expect, it } from 'vitest';
import { buildPanoramaPrompt, buildScenePrompt, periodCues } from './prompts';

const brief = { description: 'A bridge.', changes: { persists: [], altered: [], notYetBuilt: [], gone: [] } };

describe('periodCues override', () => {
  it('uses the London cues by default', () => {
    expect(buildScenePrompt(brief, 1886)).toContain(periodCues(1886));
  });
  it('replaces them in the scene and panorama prompts when given', () => {
    const cues = 'ox carts with port wine barrels';
    expect(buildScenePrompt(brief, 1886, { periodCues: cues })).toContain(cues);
    expect(buildScenePrompt(brief, 1886, { periodCues: cues })).not.toContain('hansom');
    expect(buildPanoramaPrompt('the river', [], 1886, { periodCues: cues })).toContain(cues);
  });
});
