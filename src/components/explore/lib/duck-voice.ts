/**
 * The tutorial duck's voice: tiny chirpy blips, one per letter, like the babble of little game characters.
 * Made live with the Web Audio API (a square wave through a low-pass filter, with a fast pitch glide), so there
 * is no audio file to load and nothing is sent anywhere.
 *
 * Owner: Agent 3 (Explorer). Added at the human's request, 18 Nov 2026, for DuckTutorial.tsx.
 *
 * Browsers start audio muted until the page has been tapped. `unlockDuckVoice()` must be called inside a tap
 * (WelcomeIntro's button does it); the tutorial also calls it on its own taps. Before that, blips are silent.
 */

/** Base pitch of the duck's voice, in Hz. Higher sounds smaller and sillier. */
const BASE_PITCH_HZ = 620;
/** How far each blip may wander from the base pitch, as a fraction of it. */
const PITCH_SPREAD = 0.35;
/** Length of one blip, in seconds. */
const BLIP_S = 0.055;
/** Peak loudness of one blip, 0 to 1. Kept low: it plays many times a second. */
const BLIP_GAIN = 0.07;

let ctx: AudioContext | null = null;

/**
 * Create (or resume) the shared AudioContext. Call it inside a tap so the browser lets it play. Never throws.
 */
export function unlockDuckVoice(): void {
  try {
    if (!ctx) {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return;
      ctx = new Ctor();
    }
    if (ctx.state === 'suspended') void ctx.resume();
  } catch {
    // No audio on this device: the duck talks in silence.
  }
}

/**
 * Pitch of the blip for one character. Vowels sit a little higher and wobble less, so the babble has a rhythm
 * that follows the words; a deterministic spread per letter keeps the same word sounding the same.
 *
 * @param char - The character being "spoken".
 * @returns Frequency in Hz.
 */
export function blipPitchHz(char: string): number {
  const c = char.toLowerCase();
  const code = c.charCodeAt(0) || 0;
  const vowel = 'aeiou'.includes(c);
  // Map the letter to -1..1 with a cheap hash, so each letter has its own note.
  const spread = (((code * 37) % 17) / 16) * 2 - 1;
  const factor = 1 + spread * PITCH_SPREAD * (vowel ? 0.5 : 1) + (vowel ? 0.12 : 0);
  return BASE_PITCH_HZ * factor;
}

/**
 * Whether a character gets a blip. Spaces and punctuation are the pauses between words.
 *
 * @param char - One character of the line.
 * @returns True for letters and digits.
 */
export function isVoiced(char: string): boolean {
  return /[\p{L}\p{N}]/u.test(char);
}

/**
 * Play one blip for a character, if audio is unlocked. Never throws.
 *
 * @param char - The character being typed out.
 */
export function playBlip(char: string): void {
  if (!ctx || ctx.state !== 'running' || !isVoiced(char)) return;
  try {
    const now = ctx.currentTime;
    const pitch = blipPitchHz(char) * (0.97 + Math.random() * 0.06);
    const osc = ctx.createOscillator();
    osc.type = 'square';
    // A quick upward chirp, then a settle: reads as a syllable rather than a beep.
    osc.frequency.setValueAtTime(pitch * 0.8, now);
    osc.frequency.exponentialRampToValueAtTime(pitch * 1.15, now + BLIP_S * 0.4);
    osc.frequency.exponentialRampToValueAtTime(pitch, now + BLIP_S);

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 2400;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(BLIP_GAIN, now + 0.006);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + BLIP_S);

    osc.connect(filter).connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + BLIP_S + 0.01);
  } catch {
    // Ignore: a lost blip is harmless.
  }
}
