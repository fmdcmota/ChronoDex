/**
 * POST /api/voice/tts: the guide says a chat reply aloud.
 *
 * Owner: Agent 2 (Studio). MASTER.md section 4.3, task A2-11.
 * Request: TtsRequest `{ eraId, text }`. The server picks the voice from the era's guide, so a client
 * cannot choose an arbitrary one. Response: TtsResponse `{ audioUrl }`, an MP3 on fal's CDN.
 * Errors: 400 bad input, 404 unknown era, 409 `era_not_ready` (no guide yet), 429 rate limited,
 * 502 the voice service failed, 503 no fal key on this server.
 * Cost: the chat model (eleven-v4-turbo) is about $0.04 per 1,000 characters and about 3 s for a short
 * reply (A2-07). The same voice and text is answered from a cache at no cost.
 */
import type { NextRequest } from 'next/server';
import { TtsRequestSchema, type TtsResponse } from '@/lib/contracts';
import { getEra } from '@/lib/db';
import { synthesizeSpeech } from '@/lib/fal';
import { handle, json, jsonError, readJson } from '../../_lib/http';
import { callerKey, speechCache, tooManyRequests, ttsLimiter, upstreamError, voiceUnavailable } from '../_lib/voice';

/**
 * Speak a reply in the guide's voice.
 *
 * @param request - JSON body TtsRequest.
 * @returns `{ audioUrl }`, or a JSON error.
 */
export async function POST(request: NextRequest): Promise<Response> {
  return handle('POST /api/voice/tts', async () => {
    const limited = tooManyRequests(ttsLimiter.check(callerKey(request)));
    if (limited) return limited;
    const body = await readJson(request, TtsRequestSchema);
    if (!body.ok) return body.response;
    const { eraId } = body.data;
    const text = body.data.text.trim();
    if (!text) return jsonError(400, 'bad_request', 'text: must not be empty');

    const era = await getEra(eraId);
    if (!era) return jsonError(404, 'not_found', `No era "${eraId}"`);
    if (!era.guide) return jsonError(409, 'era_not_ready', 'This era has no guide yet. Generate it first.');
    const { voiceKey } = era.guide;

    const cached = speechCache.get(voiceKey, text);
    if (cached) return json({ audioUrl: cached } satisfies TtsResponse);
    const unavailable = voiceUnavailable();
    if (unavailable) return unavailable;
    try {
      const audioUrl = await synthesizeSpeech(text, voiceKey, { fast: true });
      speechCache.set(voiceKey, text, audioUrl);
      return json({ audioUrl } satisfies TtsResponse);
    } catch (error) {
      const response = upstreamError(error, 'POST /api/voice/tts');
      if (response) return response;
      throw error;
    }
  });
}
