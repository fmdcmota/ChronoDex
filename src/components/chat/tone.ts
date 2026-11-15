/**
 * Build short WAV sounds in memory: the mic and voice earcons, and silence.
 *
 * Owner: Agent 4. Pure functions, unit tested. Part of A4-08.
 * The chat plays one of these inside every tap that may later lead to sound, which unlocks its reply
 * element on iOS so a reply that arrives seconds later can still play (spikes/agent-4 media test 2C).
 */

/** Sample rate of the generated WAV. */
const SAMPLE_RATE_HZ = 22050;
/** Bytes in a canonical 16-bit mono WAV header. */
const WAV_HEADER_BYTES = 44;

/**
 * Encode a mono 16-bit sine tone as a WAV file.
 *
 * @param toneHz - Pitch.
 * @param durationMs - Length.
 * @returns WAV bytes. Wrap in a Blob with type "audio/wav" to play.
 */
export function sineWav(toneHz: number, durationMs: number): Uint8Array<ArrayBuffer> {
  const samples = Math.round((SAMPLE_RATE_HZ * durationMs) / 1000);
  const buf = new ArrayBuffer(WAV_HEADER_BYTES + samples * 2);
  const v = new DataView(buf);
  const ascii = (off: number, s: string): void => { for (let i = 0; i < s.length; i++) v.setUint8(off + i, s.charCodeAt(i)); };
  ascii(0, 'RIFF');
  v.setUint32(4, 36 + samples * 2, true);
  ascii(8, 'WAVE');
  ascii(12, 'fmt ');
  v.setUint32(16, 16, true); // fmt chunk size
  v.setUint16(20, 1, true); // PCM
  v.setUint16(22, 1, true); // mono
  v.setUint32(24, SAMPLE_RATE_HZ, true);
  v.setUint32(28, SAMPLE_RATE_HZ * 2, true); // byte rate
  v.setUint16(32, 2, true); // block align
  v.setUint16(34, 16, true); // bits per sample
  ascii(36, 'data');
  v.setUint32(40, samples * 2, true);
  for (let i = 0; i < samples; i++) {
    const s = Math.sin((2 * Math.PI * toneHz * i) / SAMPLE_RATE_HZ) * 0.3;
    v.setInt16(WAV_HEADER_BYTES + i * 2, Math.round(s * 0x7fff), true);
  }
  return new Uint8Array(buf);
}

/** Soft peak level for earcons, 0 to 1. Quiet enough not to startle, loud enough over a street. */
const EARCON_PEAK = 0.22;
/** Length of each earcon note. */
const EARCON_NOTE_MS = 80;
/** Silence between the two notes. */
const EARCON_GAP_MS = 20;
/** Fade in and out on each note, so the waveform starts and ends at zero and never clicks. */
const EARCON_FADE_MS = 15;
/** The two pitches: E5 and A5, a rising fourth. Bright but not shrill on a phone speaker. */
const EARCON_LOW_HZ = 659.25;
const EARCON_HIGH_HZ = 880;

/** Which way an earcon goes. */
export type EarconKind = 'on' | 'off';

/**
 * Encode notes played one after another as a mono 16-bit WAV, each note faded in and out with a
 * raised-cosine envelope.
 *
 * @param notesHz - Pitch of each note, in order. 0 means a silent note.
 * @param noteMs - Length of each note.
 * @param gapMs - Silence between notes.
 * @param peak - Peak amplitude, 0 to 1.
 * @param fadeMs - Fade in and out on each note.
 * @returns WAV bytes.
 */
export function notesWav(notesHz: number[], noteMs: number, gapMs: number, peak: number, fadeMs: number): Uint8Array<ArrayBuffer> {
  const noteSamples = Math.round((SAMPLE_RATE_HZ * noteMs) / 1000);
  const gapSamples = Math.round((SAMPLE_RATE_HZ * gapMs) / 1000);
  const fadeSamples = Math.max(1, Math.min(Math.round((SAMPLE_RATE_HZ * fadeMs) / 1000), Math.floor(noteSamples / 2)));
  const samples = notesHz.length * noteSamples + Math.max(0, notesHz.length - 1) * gapSamples;
  const wav = sineWav(0, (samples * 1000) / SAMPLE_RATE_HZ);
  const v = new DataView(wav.buffer);
  let at = 0;
  notesHz.forEach((hz, n) => {
    for (let i = 0; i < noteSamples; i++) {
      const edge = Math.min(i, noteSamples - 1 - i);
      const env = edge >= fadeSamples ? 1 : 0.5 - 0.5 * Math.cos((Math.PI * edge) / fadeSamples);
      const s = hz > 0 ? Math.sin((2 * Math.PI * hz * i) / SAMPLE_RATE_HZ) * peak * env : 0;
      const off = WAV_HEADER_BYTES + (at + i) * 2;
      if (off + 1 < wav.length) v.setInt16(off, Math.round(s * 0x7fff), true);
    }
    at += noteSamples + (n < notesHz.length - 1 ? gapSamples : 0);
  });
  return wav;
}

/**
 * The mic and voice earcon: two short soft notes, rising for "on" and falling for "off".
 * Replaces the harsh unlock tone the phone test flagged (round 1, chat item 7).
 *
 * @param kind - "on" rises, "off" falls.
 * @returns WAV bytes, about 180 ms long.
 */
export function earconWav(kind: EarconKind): Uint8Array<ArrayBuffer> {
  const notes = kind === 'on' ? [EARCON_LOW_HZ, EARCON_HIGH_HZ] : [EARCON_HIGH_HZ, EARCON_LOW_HZ];
  return notesWav(notes, EARCON_NOTE_MS, EARCON_GAP_MS, EARCON_PEAK, EARCON_FADE_MS);
}

/**
 * True silence as a WAV. Played inside a tap that should make no sound (Send), to unlock the reply
 * element on iOS.
 *
 * @param durationMs - Length.
 * @returns WAV bytes of zeros after the header.
 */
export function silenceWav(durationMs: number): Uint8Array<ArrayBuffer> {
  return sineWav(0, durationMs);
}
