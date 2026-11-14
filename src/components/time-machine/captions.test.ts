/**
 * Unit tests for caption timing (captions.ts). Owner: Agent 4. Implements task A4-04.
 */
import { describe, expect, it } from 'vitest';
import { MAX_CAPTION_CHARS, buildCaptions, captionAt, type Caption } from './captions';

/** A 110-word guide script, the length MASTER.md section 4.1 asks for, spoken in about 45 s. */
const REALISTIC_SCRIPT =
  "Good afternoon, and welcome to the Imperial Institute in the year 1893. My name is Edith Walsh, and I am a porter here at the front gate. Visitors arrive by hansom cab or on foot, and many wear their finest bonnets and frock coats. The Institute opened for the Imperial Institute movement, a grand gift of the empire to its people. On Saturdays the band plays in the gardens, and children sell pressed flowers at the gate. If you wish to see the tower, ask at the lodge; the view across Kensington is well worth the climb. Do not forget the exhibition halls, where the latest inventions from the colonies are on show.";

describe('buildCaptions', () => {
  it('gives one caption per short sentence', () => {
    const captions = buildCaptions('Good day, friends. I am Mary Ann Smith, your porter. Mind the step!', 9);
    expect(captions.map((c) => c.text)).toEqual([
      'Good day, friends.',
      'I am Mary Ann Smith, your porter.',
      'Mind the step!',
    ]);
  });

  it('runs back to back from 0 and ends exactly at durationS', () => {
    const captions = buildCaptions('One. Two two. Three three three. Four!', 45);
    expect(captions[0].startS).toBe(0);
    for (let i = 1; i < captions.length; i++) {
      expect(captions[i].startS).toBe(captions[i - 1].endS);
    }
    expect(captions[captions.length - 1].endS).toBe(45);
  });

  it('shares time in proportion to character count', () => {
    const captions = buildCaptions('One. Two two two two two.', 10);
    const [short, long] = captions;
    const shortS = short.endS - short.startS;
    const longS = long.endS - long.startS;
    expect(shortS / longS).toBeCloseTo(short.text.length / long.text.length, 9);
  });

  it('splits a long sentence at a comma', () => {
    const sentence =
      'The Institute was busy with visitors all morning, and the band of the Royal Engineers played in the gardens while the children ran about in their best clothes.';
    const captions = buildCaptions(sentence, 20);
    expect(captions[0].text).toBe('The Institute was busy with visitors all morning,');
    expect(captions.every((c) => c.text.length <= MAX_CAPTION_CHARS)).toBe(true);
  });

  it('splits a long sentence with no comma at a space, never over the limit', () => {
    const sentence =
      'The guide was pleased to tell everyone about the grand new railway station that had opened near the old market gardens.';
    const captions = buildCaptions(sentence, 12);
    expect(captions.length).toBeGreaterThan(1);
    expect(captions.every((c) => c.text.length <= MAX_CAPTION_CHARS)).toBe(true);
    expect(captions.map((c) => c.text).join(' ')).toBe(sentence);
  });

  it('keeps a single word longer than the limit as its own caption', () => {
    const longWord = 'a'.repeat(MAX_CAPTION_CHARS + 10);
    const captions = buildCaptions(`Start ${longWord} end.`, 6);
    expect(captions.map((c) => c.text)).toEqual(['Start', longWord, 'end.']);
  });

  it('does not split after Mr. or Mrs.', () => {
    const captions = buildCaptions('Mr. Collcutt built the tower in 1893. Mrs. Lee sold tea.', 8);
    expect(captions.map((c) => c.text)).toEqual([
      'Mr. Collcutt built the tower in 1893.',
      'Mrs. Lee sold tea.',
    ]);
  });

  it('collapses whitespace, including line breaks, and trims', () => {
    const captions = buildCaptions('  Hello   there.\n\n  I   am Ann.  ', 4);
    expect(captions.map((c) => c.text)).toEqual(['Hello there.', 'I am Ann.']);
  });

  it('returns nothing for an empty or whitespace-only script', () => {
    expect(buildCaptions('', 45)).toEqual([]);
    expect(buildCaptions('  \n\t ', 45)).toEqual([]);
  });

  it('returns nothing for a zero, negative or non-finite duration', () => {
    expect(buildCaptions('Hello there.', 0)).toEqual([]);
    expect(buildCaptions('Hello there.', -3)).toEqual([]);
    expect(buildCaptions('Hello there.', Number.NaN)).toEqual([]);
    expect(buildCaptions('Hello there.', Number.POSITIVE_INFINITY)).toEqual([]);
  });

  it('keeps every line under the limit for a realistic 45 second script', () => {
    const captions = buildCaptions(REALISTIC_SCRIPT, 45);
    expect(captions.length).toBeGreaterThan(5);
    expect(captions.every((c) => c.text.length <= MAX_CAPTION_CHARS)).toBe(true);
    expect(captions[captions.length - 1].endS).toBe(45);
  });
});

describe('captionAt', () => {
  const captions: Caption[] = [
    { text: 'first', startS: 0, endS: 2 },
    { text: 'second', startS: 2, endS: 5 },
    { text: 'third', startS: 5, endS: 9 },
  ];

  it('returns the first caption at time 0', () => {
    expect(captionAt(captions, 0)?.text).toBe('first');
  });

  it('returns the caption that covers a mid-way time', () => {
    expect(captionAt(captions, 3.5)?.text).toBe('second');
  });

  it('gives a boundary time to the next caption', () => {
    expect(captionAt(captions, 2)?.text).toBe('second');
    expect(captionAt(captions, 5)?.text).toBe('third');
  });

  it('returns the last caption at the very end', () => {
    expect(captionAt(captions, 9)?.text).toBe('third');
  });

  it('returns null past the end, before the start, or with no captions', () => {
    expect(captionAt(captions, 9.001)).toBeNull();
    expect(captionAt(captions, -0.5)).toBeNull();
    expect(captionAt(captions, Number.NaN)).toBeNull();
    expect(captionAt([], 1)).toBeNull();
  });

  it('finds the right caption in a long built list', () => {
    const built = buildCaptions(REALISTIC_SCRIPT, 45);
    for (const caption of built) {
      const midS = (caption.startS + caption.endS) / 2;
      expect(captionAt(built, midS)).toBe(caption);
    }
  });
});
