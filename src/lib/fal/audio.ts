/**
 * Work out what kind of audio a recording is, and what file name to upload it under.
 *
 * Owner: Agent 2 (Studio). Implements MASTER.md section 4.3 (POST /api/voice/stt), task A2-11.
 *
 * Why this exists (found live, A2-11): fal's speech-to-text endpoint checks the audio URL's file
 * EXTENSION against a list (.mp3 .wav .m4a .ogg .flac .aac) and rejects anything else with a 422.
 * Chrome records WebM and iOS Safari records MP4, and the client names the file speech.webm or
 * speech.mp4, so both were refused. The decoder behind it reads the real bytes: an MP3 uploaded as
 * speech.ogg, speech.m4a or speech.aac transcribed correctly. So the server renames each recording
 * to a listed extension, chosen from the bytes (browsers also send wrong or empty MIME types).
 */

/** The kinds of audio container this module recognises. */
export type AudioKind = 'mp3' | 'wav' | 'ogg' | 'webm' | 'm4a' | 'flac' | 'aac' | 'unknown';

/** How many leading bytes sniffAudio needs. */
export const SNIFF_BYTES = 16;

/** True when the bytes at `offset` equal the ASCII text. */
function hasText(bytes: Uint8Array, offset: number, text: string): boolean {
  return [...text].every((char, i) => bytes[offset + i] === char.charCodeAt(0));
}

/**
 * Recognise an audio container from its first bytes.
 *
 * @param bytes - At least SNIFF_BYTES leading bytes of the file (fewer works, with less certainty).
 * @returns The container, or 'unknown'.
 */
export function sniffAudio(bytes: Uint8Array): AudioKind {
  if (hasText(bytes, 0, 'OggS')) return 'ogg';
  if (hasText(bytes, 0, 'fLaC')) return 'flac';
  if (hasText(bytes, 0, 'RIFF') && hasText(bytes, 8, 'WAVE')) return 'wav';
  // EBML header: the start of every Matroska or WebM file, which is what Chrome's MediaRecorder writes.
  if (bytes[0] === 0x1a && bytes[1] === 0x45 && bytes[2] === 0xdf && bytes[3] === 0xa3) return 'webm';
  // MP4 family (m4a, mp4): a box named "ftyp" at byte 4. This is what iOS Safari writes.
  if (hasText(bytes, 4, 'ftyp')) return 'm4a';
  if (hasText(bytes, 0, 'ID3')) return 'mp3';
  if (bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0) {
    // Both MP3 and raw AAC (ADTS) start with a frame sync. The two layer bits are 00 for AAC.
    return (bytes[1] & 0x06) === 0 ? 'aac' : 'mp3';
  }
  return 'unknown';
}

/**
 * Pick the file name to upload a recording under, so fal accepts it.
 *
 * WebM is uploaded as .ogg: both usually carry Opus and the decoder reads the content, but a real
 * Chrome WebM recording has NOT yet been verified through this path (see the route's header).
 *
 * @param bytes - The recording's leading bytes.
 * @param mimeType - The browser's claimed type, used only when the bytes are not recognised.
 * @returns A name like "speech.ogg" with an extension from fal's supported list.
 */
export function uploadNameFor(bytes: Uint8Array, mimeType: string): string {
  const kind = sniffAudio(bytes);
  const extension = (
    {
      mp3: 'mp3',
      wav: 'wav',
      ogg: 'ogg',
      webm: 'ogg',
      m4a: 'm4a',
      flac: 'flac',
      aac: 'aac',
    } as const
  )[kind as Exclude<AudioKind, 'unknown'>];
  if (extension) return `speech.${extension}`;
  const type = mimeType.toLowerCase();
  if (type.includes('mp4') || type.includes('m4a') || type.includes('aac')) return 'speech.m4a';
  if (type.includes('mpeg') || type.includes('mp3')) return 'speech.mp3';
  if (type.includes('wav')) return 'speech.wav';
  return 'speech.ogg';
}
