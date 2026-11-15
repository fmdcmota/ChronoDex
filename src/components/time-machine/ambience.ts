/**
 * Period ambience: which loop fits a year, how loud it plays, and a placeholder loop.
 *
 * Owner: Agent 4. Pure functions, unit tested. Phone test round 1, chat item 4 ("make it play music;
 * give it more ambience for the time"). Agent 2 makes the loops with fal into
 * `public/audio/ambience/<bucket>.mp3`; until a file exists the player uses `placeholderLoop`.
 */

/** The four ambience loops, by period. Names match Agent 2's file names. */
export const AMBIENCE_BUCKETS = ['1850-1899', '1900-1945', '1946-1979', '1980-now'] as const;

/** One of AMBIENCE_BUCKETS. */
export type AmbienceBucket = (typeof AMBIENCE_BUCKETS)[number];

/** Normal ambience level, 0 to 1. Quiet: it sits under the chat, not over it. */
export const AMBIENCE_GAIN = 0.15;
/** Level while the guide speaks (TTS reply, narration or the talk clip). */
export const AMBIENCE_DUCKED_GAIN = 0.05;

/**
 * The loop for a year. Years before 1850 use the earliest loop.
 *
 * @param year - The era's year.
 * @returns The bucket name.
 */
export function ambienceBucket(year: number): AmbienceBucket {
  if (year < 1900) return '1850-1899';
  if (year < 1946) return '1900-1945';
  if (year < 1980) return '1946-1979';
  return '1980-now';
}

/**
 * Public path of a bucket's loop.
 *
 * @param bucket - The bucket.
 * @returns For example "/audio/ambience/1850-1899.mp3".
 */
export function ambienceUrl(bucket: AmbienceBucket): string {
  return `/audio/ambience/${bucket}.mp3`;
}

/**
 * The gain to play at.
 *
 * @param muted - The player's saved mute setting.
 * @param ducked - True while the guide speaks.
 * @returns 0, AMBIENCE_DUCKED_GAIN or AMBIENCE_GAIN.
 */
export function ambienceGain(muted: boolean, ducked: boolean): number {
  if (muted) return 0;
  return ducked ? AMBIENCE_DUCKED_GAIN : AMBIENCE_GAIN;
}

/** Length of the crossfade that hides the placeholder's loop point. */
const LOOP_CROSSFADE_S = 0.5;
/** How much each brown-noise step leaks back to zero, so it never drifts off. */
const BROWN_LEAK = 0.02;

/**
 * A soft brown-noise loop (distant wind and traffic), used until the real ambience file exists.
 * The end is crossfaded into the start so the loop has no click.
 *
 * @param sampleRateHz - The AudioContext's rate.
 * @param durationS - Loop length.
 * @param random - Source of randomness, for tests.
 * @returns Mono samples in -1 to 1, ready for AudioBuffer.copyToChannel.
 */
export function placeholderLoop(sampleRateHz: number, durationS: number, random: () => number = Math.random): Float32Array<ArrayBuffer> {
  const fade = Math.round(sampleRateHz * LOOP_CROSSFADE_S);
  const total = Math.round(sampleRateHz * durationS) + fade;
  const raw = new Float32Array(total);
  let last = 0;
  let peak = 0;
  for (let i = 0; i < total; i++) {
    last = (last + (random() * 2 - 1) * 0.1) * (1 - BROWN_LEAK);
    raw[i] = last;
    peak = Math.max(peak, Math.abs(last));
  }
  const out = new Float32Array(total - fade);
  for (let i = 0; i < out.length; i++) out[i] = raw[i];
  // The loop jumps from out[end] back to out[0]. Blend the extra tail into the head so they meet.
  for (let i = 0; i < fade; i++) {
    const t = i / fade;
    out[i] = raw[i] * t + raw[out.length + i] * (1 - t);
  }
  const scale = peak > 0 ? 0.9 / peak : 0;
  for (let i = 0; i < out.length; i++) out[i] *= scale;
  return out;
}
