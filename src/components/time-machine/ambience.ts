/**
 * Period ambience: which loops fit a year, how loud they play where, and seamless looping. Pure, unit tested.
 *
 * Owner: Agent 4. Phone test round 1, chat item 4 ("make it play music; give it more ambience for the time"), and
 * round 2 (15 Nov): too loud in the chat and audible in voice recordings.
 *
 * Agent 2 made two loops per period with fal into `public/audio/ambience/` (manifest.json there): a 45 s
 * instrumental `<bucket>.m4a` and a 30 s street sound `<bucket>-street.mp3`. They play as two layers. Sonilo has no
 * loop option, so the music's end is crossfaded into its start before looping (`crossfadeLoop`). A layer whose
 * file is missing or will not decode is replaced by `placeholderLoop` (street) or left silent (music).
 */

/** The four ambience periods. Names match Agent 2's file names. */
export const AMBIENCE_BUCKETS = ['1850-1899', '1900-1945', '1946-1979', '1980-now'] as const;

/** One of AMBIENCE_BUCKETS. */
export type AmbienceBucket = (typeof AMBIENCE_BUCKETS)[number];

/** The two layers of a period's ambience. */
export type AmbienceLayer = 'music' | 'street';

/** Which screen is playing it. The chat sits much lower: people read and talk there. */
export type AmbienceScene = 'time-machine' | 'chat';

/**
 * What the screen is doing.
 * - `normal`: nothing to compete with.
 * - `ducked`: the guide speaks (narration, the talk clip, a spoken reply).
 * - `silent`: the microphone is recording. Nothing may leak into the recording.
 */
export type AmbienceMode = 'normal' | 'ducked' | 'silent';

/** Master level by scene and mode, 0 to 1. Round 1 used 0.15 everywhere, which the human found too loud in the chat. */
export const AMBIENCE_LEVELS: Record<AmbienceScene, Record<AmbienceMode, number>> = {
  'time-machine': { normal: 0.12, ducked: 0.03, silent: 0 },
  // In the chat a spoken reply silences it: the guide's voice is the point there.
  chat: { normal: 0.05, ducked: 0, silent: 0 },
};

/**
 * Relative level of each layer under the master. Measured on Agent 2's 1850-1899 files: music RMS 0.127, street
 * RMS 0.011 (peak 0.07). The street loop is mastered very quietly, so it is lifted to sit just under the music.
 */
export const LAYER_MIX: Record<AmbienceLayer, number> = { music: 0.6, street: 2.5 };

/** Crossfade that hides each loop's join, seconds. */
export const LOOP_CROSSFADE_S = 1.5;

/**
 * The loops for a year. Years before 1850 use the earliest.
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
 * Public path of one layer's file.
 *
 * @param bucket - The period.
 * @param layer - music or street.
 * @returns For example "/audio/ambience/1850-1899.m4a" or "/audio/ambience/1850-1899-street.mp3".
 */
export function ambienceUrl(bucket: AmbienceBucket, layer: AmbienceLayer): string {
  return layer === 'music' ? `/audio/ambience/${bucket}.m4a` : `/audio/ambience/${bucket}-street.mp3`;
}

/**
 * The master level to play at.
 *
 * @param muted - The player's saved mute setting.
 * @param mode - normal, ducked or silent.
 * @param scene - Which screen.
 * @returns 0 to 1.
 */
export function ambienceGain(muted: boolean, mode: AmbienceMode, scene: AmbienceScene): number {
  return muted ? 0 : AMBIENCE_LEVELS[scene][mode];
}

/**
 * Pick the mode from what the screen is doing. Recording wins over speaking.
 *
 * @param speaking - The guide is speaking.
 * @param recording - The microphone is recording.
 * @returns The mode.
 */
export function ambienceMode(speaking: boolean, recording = false): AmbienceMode {
  if (recording) return 'silent';
  return speaking ? 'ducked' : 'normal';
}

/**
 * Make a sample buffer loop without a click: blend its last `fadeSamples` into its first and drop them.
 *
 * Playing the result with `loop = true` goes from the (unchanged) end straight into a start that already contains
 * the old end fading out, so the join is continuous.
 *
 * @param samples - One channel.
 * @param fadeSamples - Crossfade length. Clamped to half the buffer.
 * @returns A new, shorter buffer. Unchanged copy when too short to fade.
 */
export function crossfadeLoop(samples: Float32Array, fadeSamples: number): Float32Array<ArrayBuffer> {
  const fade = Math.min(Math.max(0, Math.floor(fadeSamples)), Math.floor(samples.length / 2));
  const out = new Float32Array(samples.length - fade);
  out.set(samples.subarray(0, out.length));
  for (let i = 0; i < fade; i++) {
    const t = i / fade;
    out[i] = samples[i] * t + samples[out.length + i] * (1 - t);
  }
  return out;
}

/** How much each brown-noise step leaks back to zero, so it never drifts off. */
const BROWN_LEAK = 0.02;
/** Crossfade for the short placeholder loop, seconds. */
const PLACEHOLDER_CROSSFADE_S = 0.5;

/**
 * A soft brown-noise loop (distant wind and traffic), used when the street file is missing.
 *
 * @param sampleRateHz - The AudioContext's rate.
 * @param durationS - Loop length.
 * @param random - Source of randomness, for tests.
 * @returns Mono samples in -1 to 1, ready for AudioBuffer.copyToChannel.
 */
export function placeholderLoop(sampleRateHz: number, durationS: number, random: () => number = Math.random): Float32Array<ArrayBuffer> {
  const fade = Math.round(sampleRateHz * PLACEHOLDER_CROSSFADE_S);
  const raw = new Float32Array(Math.round(sampleRateHz * durationS) + fade);
  let last = 0;
  let peak = 0;
  for (let i = 0; i < raw.length; i++) {
    last = (last + (random() * 2 - 1) * 0.1) * (1 - BROWN_LEAK);
    raw[i] = last;
    peak = Math.max(peak, Math.abs(last));
  }
  const out = crossfadeLoop(raw, fade);
  const scale = peak > 0 ? 0.9 / peak : 0;
  for (let i = 0; i < out.length; i++) out[i] *= scale;
  return out;
}
