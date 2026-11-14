/**
 * POST /api/voice/stt: turn a recorded question into text.
 *
 * Owner: Agent 2 (Studio). MASTER.md section 4.3, task A2-11.
 * Request: multipart with field `file`, the recording (Chrome sends WebM/Opus, iOS Safari sends MP4/AAC,
 * the client names it speech.webm, speech.mp4 or speech.ogg). Response: SttResponse `{ text }`, which is
 * an empty string when nothing intelligible was said.
 * Errors: 400 no file or an empty one, 413 over MAX_UPLOAD_BYTES, 415 not audio, 429 rate limited,
 * 502 the voice service failed, 503 no fal key on this server.
 * Flow: upload the recording to fal storage, then Scribe v2 (about $0.008 a minute, about 2 s for a
 * short question). The recording stays on fal's CDN for at least 7 days at a public, unguessable URL.
 * The upload is renamed to an extension fal accepts (see lib/fal/audio.ts): fal refuses .webm and .mp4.
 * VERIFIED live: MP3 under .mp3, .ogg, .m4a and .aac names. NOT YET VERIFIED: a real Chrome WebM/Opus or
 * iOS MP4/AAC recording, which needs a browser (spikes/agent-2/voice-test.mjs).
 */
import type { NextRequest } from 'next/server';
import { MAX_UPLOAD_BYTES, type SttResponse } from '@/lib/contracts';
import { SNIFF_BYTES, transcribe, uploadNameFor, uploadToFal } from '@/lib/fal';
import { handle, json, jsonError } from '../../_lib/http';
import { callerKey, isAcceptableAudioType, sttLimiter, tooManyRequests, upstreamError, voiceUnavailable } from '../_lib/voice';

/**
 * Transcribe one recording.
 *
 * @param request - Multipart form with a `file` field.
 * @returns `{ text }`, or a JSON error.
 */
export async function POST(request: NextRequest): Promise<Response> {
  return handle('POST /api/voice/stt', async () => {
    const limited = tooManyRequests(sttLimiter.check(callerKey(request)));
    if (limited) return limited;

    let form: FormData;
    try {
      form = await request.formData();
    } catch {
      return jsonError(400, 'bad_request', 'The body must be multipart form data with a "file" field');
    }
    const file = form.get('file');
    if (!(file instanceof Blob)) return jsonError(400, 'bad_request', 'file: a recording is required');
    if (file.size === 0) return jsonError(400, 'bad_request', 'file: the recording is empty');
    if (file.size > MAX_UPLOAD_BYTES) return jsonError(413, 'too_large', `file: over ${MAX_UPLOAD_BYTES} bytes`);
    if (!isAcceptableAudioType(file.type)) return jsonError(415, 'unsupported_type', `file: ${file.type} is not audio`);

    const unavailable = voiceUnavailable();
    if (unavailable) return unavailable;
    try {
      // fal rejects the extensions Chrome (.webm) and iOS (.mp4) produce, so name the upload by its real bytes.
      const head = new Uint8Array(await file.slice(0, SNIFF_BYTES).arrayBuffer());
      const audioUrl = await uploadToFal(new File([file], uploadNameFor(head, file.type), { type: file.type }));
      const text = await transcribe(audioUrl);
      return json({ text } satisfies SttResponse);
    } catch (error) {
      const response = upstreamError(error, 'POST /api/voice/stt');
      if (response) return response;
      throw error;
    }
  });
}
