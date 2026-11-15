/**
 * Tests for the accent tag put in front of TTS text (VoiceEntry.accentTag). Agent 6, demo cities.
 */
import { describe, expect, it } from 'vitest';
import { VOICE_CATALOG, withAccentTag } from './index';

describe('withAccentTag', () => {
  it('prefixes the tag in square brackets', () => {
    expect(withAccentTag('Hello there.', 'Portuguese accent')).toBe('[Portuguese accent] Hello there.');
  });
  it('leaves text alone for voices with no tag', () => {
    expect(withAccentTag('Hello there.', undefined)).toBe('Hello there.');
  });
  it('gives every non-British demo voice a tag', () => {
    for (const key of ['eleven-mx-woman', 'eleven-mx-man', 'eleven-pt-man', 'eleven-pt-woman', 'eleven-sg-man', 'eleven-sg-woman']) {
      expect(VOICE_CATALOG[key]?.accentTag, key).toBeTruthy();
    }
  });
});
