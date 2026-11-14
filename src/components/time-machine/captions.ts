/**
 * Caption timing for the guide's narration in the Time Machine.
 *
 * Captions are shown under the guide's narration or video while the 360 degree view plays.
 * Owner: Agent 4 (Time Machine). Implements task A4-04 (MASTER.md section 11, section 4.1 for
 * Guide.script). Unit tested in captions.test.ts.
 *
 * Why the timing is proportional: the narration audio has no word timestamps yet, so each
 * caption gets a share of the spoken duration in proportion to its character count. Longer
 * lines stay on screen for longer, which roughly matches how speech runs. When word timestamps
 * are available, replace buildCaptions' timing and keep the Caption shape.
 *
 * This module is pure: no DOM, no timers, no imports.
 */

/** One caption line and the time window it is shown for, in seconds from the start of the narration. */
export interface Caption {
  /** The text to show. Never empty, never has leading or trailing spaces. */
  text: string;
  /** When the line appears, in seconds from the start of the narration. */
  startS: number;
  /** When the line is replaced by the next one, in seconds. Equal to the next caption's startS. */
  endS: number;
}

/**
 * Longest caption line, in characters, counting spaces. Sized so a line fits under the guide
 * video at phone width without wrapping onto a third row.
 */
export const MAX_CAPTION_CHARS = 60;

/** Matches a fragment that ends in an abbreviation, so the full stop after it does not end a sentence. */
const ABBREVIATION_END = /(?:^|\s)(?:Mr|Mrs|Dr|St)\.$/;

/** Sentence boundary: whitespace that follows a full stop, exclamation mark or question mark. */
// Mark each sentence end, then split on the mark. A lookbehind regex would be simpler, but
// Safari before iOS 16.4 cannot parse one, and that would break the whole page on older iPhones.
const SENTENCE_END = /([.!?])\s+/g;
const SENTENCE_MARK = '\u0000';

/** Punctuation after which a long sentence may be broken into lines. */
const CLAUSE_BREAK_CHARS = ',;:';

/**
 * Split normalised text into sentences, keeping each sentence's own punctuation.
 *
 * Abbreviations such as "Mr." and "St." are glued back onto the following word so that
 * "Mr. Collcutt" stays in one sentence.
 *
 * @param text - Text with single spaces only, already trimmed.
 * @returns The sentences in order. Empty when text is empty.
 */
function splitSentences(text: string): string[] {
  const sentences: string[] = [];
  let pending = '';
  for (const piece of text.replace(SENTENCE_END, `$1${SENTENCE_MARK}`).split(SENTENCE_MARK)) {
    const joined = pending ? `${pending} ${piece}` : piece;
    if (ABBREVIATION_END.test(piece)) {
      // The full stop belongs to an abbreviation, so keep reading into the next piece.
      pending = joined;
    } else {
      sentences.push(joined);
      pending = '';
    }
  }
  if (pending) sentences.push(pending);
  return sentences;
}

/**
 * Find where to cut a piece of text that is longer than MAX_CAPTION_CHARS.
 *
 * Preference order: the last clause break (comma, semicolon or colon followed by a space) that
 * ends within the limit; otherwise the last space within the limit; otherwise the next space
 * after the limit, which makes a single over-long word its own chunk.
 *
 * @param text - Text longer than MAX_CAPTION_CHARS, with single spaces only.
 * @returns The index at which to cut: text.slice(0, cut) is the chunk to keep.
 */
function findCut(text: string): number {
  for (let i = MAX_CAPTION_CHARS - 1; i >= 0; i--) {
    // Keep the punctuation with the chunk it ends. The chunk then ends at i + 1, within the limit.
    if (CLAUSE_BREAK_CHARS.includes(text[i]) && text[i + 1] === ' ') return i + 1;
  }
  for (let j = MAX_CAPTION_CHARS; j > 0; j--) {
    if (text[j] === ' ') return j;
  }
  // No space within the limit: the first word is longer than the limit, so take all of it.
  const nextSpace = text.indexOf(' ');
  return nextSpace === -1 ? text.length : nextSpace;
}

/**
 * Break one sentence into chunks of at most MAX_CAPTION_CHARS where it is too long.
 *
 * Never breaks inside a word. A word longer than the limit is returned whole as its own chunk.
 *
 * @param sentence - One sentence with single spaces only.
 * @returns The chunks in order. Each is trimmed and non-empty.
 */
function chunkSentence(sentence: string): string[] {
  const chunks: string[] = [];
  let rest = sentence;
  while (rest.length > MAX_CAPTION_CHARS) {
    const cut = findCut(rest);
    chunks.push(rest.slice(0, cut).trim());
    rest = rest.slice(cut).trim();
  }
  if (rest) chunks.push(rest);
  return chunks;
}

/**
 * Turn the guide's script into short caption lines with back-to-back times.
 *
 * Steps: collapse whitespace; split into sentences at ".", "!" or "?" followed by a space (not
 * after Mr., Mrs., Dr. or St.); split any sentence longer than MAX_CAPTION_CHARS at a comma,
 * semicolon or colon, or else at a space; share durationS out in proportion to each line's
 * character count, including spaces.
 *
 * @param script - The guide's spoken script (Guide.script). Any whitespace, including line breaks.
 * @param durationS - Spoken length of the narration in seconds, for example 45.
 * @returns The caption lines in order. The first startS is 0, each startS equals the previous
 *   endS, and the last endS equals durationS exactly. Empty when the script has no text or
 *   durationS is not a positive finite number.
 * @example
 * buildCaptions('Hello there. I am Ann.', 10);
 * // [{ text: 'Hello there.', startS: 0, endS: 5.4545... },
 * //  { text: 'I am Ann.', startS: 5.4545..., endS: 10 }]
 */
export function buildCaptions(script: string, durationS: number): Caption[] {
  if (!Number.isFinite(durationS) || durationS <= 0) return [];
  const normalised = script.replace(/\s+/g, ' ').trim();
  if (!normalised) return [];

  const texts = splitSentences(normalised).flatMap(chunkSentence);
  const totalChars = texts.reduce((sum, text) => sum + text.length, 0);

  let charsSoFar = 0;
  let startS = 0;
  return texts.map((text, index) => {
    charsSoFar += text.length;
    // Set the last end directly, so floating-point rounding cannot leave it short of durationS.
    const endS = index === texts.length - 1 ? durationS : (charsSoFar / totalChars) * durationS;
    const caption: Caption = { text, startS, endS };
    startS = endS;
    return caption;
  });
}

/**
 * Find the caption to show at a given moment of the narration.
 *
 * A caption covers [startS, endS), so a time exactly on a boundary belongs to the next caption.
 * The one exception is the final endS, which still shows the last caption, so the last line
 * stays up until the narration ends. Uses a binary search, so long scripts stay cheap.
 *
 * @param captions - Caption lines in order, as returned by buildCaptions.
 * @param timeS - Seconds from the start of the narration.
 * @returns The caption shown at timeS, or null when there is none (before the first start, after
 *   the final end, with an empty list, or for a non-finite time).
 */
export function captionAt(captions: Caption[], timeS: number): Caption | null {
  if (captions.length === 0 || !Number.isFinite(timeS)) return null;
  const last = captions[captions.length - 1];
  if (timeS === last.endS) return last;

  let low = 0;
  let high = captions.length - 1;
  while (low <= high) {
    const mid = (low + high) >> 1;
    const caption = captions[mid];
    if (timeS < caption.startS) {
      high = mid - 1;
    } else if (timeS >= caption.endS) {
      low = mid + 1;
    } else {
      return caption;
    }
  }
  return null;
}
