/**
 * Build a short WAV tone in memory. The chat plays a near-silent one inside a tap to unlock its
 * audio element on iOS, so a reply that arrives seconds later can still play (A4-08).
 *
 * Owner: Agent 4. Pure function, unit tested.
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
