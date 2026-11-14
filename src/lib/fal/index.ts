/**
 * Everything that calls fal: uploads, speech, transcription. Server and worker only.
 *
 * Owner: Agent 2 (Studio). Implements MASTER.md section 4.4 (src/lib/fal), task A2-07. The
 * signatures were fixed by Agent 1's M0 stub and have not changed. FAL_KEY must never reach the
 * browser. Every call goes through runFal (./run.ts); every endpoint id comes from MODELS
 * (./models.ts).
 *
 * With NEXT_PUBLIC_USE_MOCKS=1 the three functions return the fixture placeholders and call
 * nothing, so the app can be exercised without a key or any spend.
 */
import { MOCK_AUDIO_URL, MOCK_REFERENCE_URL } from '@fixtures/index';
import { fal } from '@fal-ai/client';
import { MODELS } from './models';
import { runFal, FalStageError, type FalRunContext } from './run';
import { getVoice } from './voices';

export { VOICE_CATALOG, getVoice, type VoiceEntry } from './voices';
export {
  MODELS,
  IMAGE_ASPECT_RATIO,
  IMAGE_RESOLUTION,
  PANORAMA_RESOLUTION,
  WALK_DURATION_S,
  WALK_RESOLUTION,
  type FalStageKey,
  type ModelChoice,
} from './models';
export { runFal, FalStageError, type FalRunContext, type FalRunResult, type FalQueueLike } from './run';

/** Longest text one ElevenLabs request accepts, in characters (the schema page says 5,000). */
export const MAX_TTS_CHARACTERS = 5000;

/** Whether the app is running on fixtures. The same flag Agent 1's client uses. */
function mocksOn(): boolean {
  return process.env.NEXT_PUBLIC_USE_MOCKS === '1';
}

/**
 * Upload a file to fal's storage so models can read it by URL.
 *
 * Cost: free. Time: about 2 s for a 700 KB JPEG (A2-01). The URL is public and lasts at least
 * 7 days (MASTER.md 5.3 rule 8).
 *
 * @param file - The file, for example a player's JPEG capture or a recorded voice clip.
 * @returns Public URL on fal's CDN. Mock mode returns a placeholder image.
 * @throws FalStageError when FAL_KEY is missing or the upload is refused.
 */
export async function uploadToFal(file: Blob): Promise<string> {
  if (mocksOn()) return MOCK_REFERENCE_URL;
  if (!process.env.FAL_KEY) throw new FalStageError('FAL_KEY is not set. Put it in .env.local (server only).', { endpoint: 'storage' });
  try {
    return await fal.storage.upload(file);
  } catch (error) {
    throw new FalStageError(`fal upload failed: ${(error as Error).message}`, { endpoint: 'storage' });
  }
}

/**
 * Speak text in one of the catalogue's voices.
 *
 * Endpoint: MODELS.narration (about $0.08 per 1,000 characters, about 12 s for a 600-character
 * script) or, with `fast`, MODELS.chat_speech (about half the price, built for chat replies).
 * Both accept the same voice names, so the guide sounds the same in the video and the chat.
 *
 * @param text - What to say, at most MAX_TTS_CHARACTERS characters.
 * @param voiceKey - Key into VOICE_CATALOG.
 * @param opts - Options.
 * @param opts.fast - True picks the cheaper, lower-latency model used for chat replies.
 * @param ctx - Optional runFal context, so the pipeline can save the request id and heartbeat.
 * @returns URL of an MP3 on fal's CDN. Mock mode returns a sample clip.
 * @throws Error on an unknown voice key or text that is empty or too long. FalStageError when fal fails.
 */
export async function synthesizeSpeech(
  text: string,
  voiceKey: string,
  opts?: { fast?: boolean },
  ctx?: FalRunContext,
): Promise<string> {
  const voice = getVoice(voiceKey);
  const trimmed = text.trim();
  if (!trimmed) throw new Error('synthesizeSpeech: text is empty');
  if (trimmed.length > MAX_TTS_CHARACTERS) {
    throw new Error(`synthesizeSpeech: ${trimmed.length} characters is over the ${MAX_TTS_CHARACTERS} limit`);
  }
  if (mocksOn()) return MOCK_AUDIO_URL;
  const endpoint = opts?.fast ? MODELS.chat_speech.endpoint : MODELS.narration.endpoint;
  const { data } = await runFal<{ audio?: { url?: string } }>(
    endpoint,
    { text: trimmed, voice: voice.voiceName, stability: voice.stability, language_code: 'en' },
    ctx,
  );
  const url = data.audio?.url;
  if (!url) throw new FalStageError(`${endpoint} returned no audio`, { endpoint });
  return url;
}

/**
 * Transcribe recorded speech.
 *
 * Endpoint: MODELS.speech_to_text (Scribe v2, $0.008 per minute, a few seconds for a short
 * question). Speaker labels and sound-event tags are switched off: they add noise to a one-person
 * question. Accepted formats: MP3 and WAV are proven (A2-04); phone recordings (webm from Chrome,
 * m4a from iOS) are not tested yet.
 *
 * @param audioUrl - URL of the recording, already uploaded with uploadToFal.
 * @param ctx - Optional runFal context.
 * @returns The text, trimmed. Mock mode returns a fixed question.
 * @throws FalStageError when fal fails or returns no text.
 */
export async function transcribe(audioUrl: string, ctx?: FalRunContext): Promise<string> {
  if (mocksOn()) return 'What was daily life like here?';
  const endpoint = MODELS.speech_to_text.endpoint;
  const { data } = await runFal<{ text?: string }>(
    endpoint,
    { audio_url: audioUrl, language_code: 'eng', diarize: false, tag_audio_events: false },
    ctx,
  );
  if (typeof data.text !== 'string') throw new FalStageError(`${endpoint} returned no text`, { endpoint });
  return data.text.trim();
}
