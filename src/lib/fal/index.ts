/**
 * Everything that calls fal: uploads, speech, transcription. Server and worker only.
 *
 * Owner: Agent 2 (Studio). Created by Agent 1 as an M0 stub with the signatures in MASTER.md
 * section 4.4. TODO(agent-2): A2-07 replaces every body with real calls through runFal and adds
 * models.ts. Nobody else changes these signatures. FAL_KEY must never reach the browser.
 */
import { MOCK_AUDIO_URL, MOCK_REFERENCE_URL } from '@fixtures/index';

export { VOICE_CATALOG, type VoiceEntry } from './voices';

/**
 * Upload a file to fal's storage so models can read it by URL.
 *
 * @param file - The file, for example a player's JPEG capture.
 * @returns Public URL on fal's CDN. The stub returns a placeholder image.
 */
export async function uploadToFal(file: Blob): Promise<string> {
  void file;
  return MOCK_REFERENCE_URL;
}

/**
 * Speak text in one of the catalogue's voices.
 *
 * @param text - What to say.
 * @param voiceKey - Key into VOICE_CATALOG.
 * @param opts - Options.
 * @param opts.fast - True picks the cheaper, lower-latency model used for chat replies.
 * @returns URL of the audio. The stub returns a sample clip.
 */
export async function synthesizeSpeech(text: string, voiceKey: string, opts?: { fast?: boolean }): Promise<string> {
  void text;
  void voiceKey;
  void opts;
  return MOCK_AUDIO_URL;
}

/**
 * Transcribe recorded speech.
 *
 * @param audioUrl - URL of the recording, already uploaded with uploadToFal.
 * @returns The text. The stub returns a fixed question.
 */
export async function transcribe(audioUrl: string): Promise<string> {
  void audioUrl;
  return 'What was daily life like here?';
}
