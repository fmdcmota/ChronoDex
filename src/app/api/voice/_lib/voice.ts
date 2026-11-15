/**
 * Helpers the two voice routes share: caller identity, the spend limits and the error mapping.
 *
 * Owner: Agent 2 (Studio). Implements MASTER.md section 4.3 (voice routes) and 5.3 rule 1, task A2-11.
 * The `_lib` folder name keeps Next.js from treating this as a route.
 */
import { FalStageError, createRateLimiter, createSpeechCache } from '@/lib/fal';
import { jsonError } from '../../_lib/http';

/** Speech requests allowed per caller per minute. A chat reply is one request, so 30 is a fast reader. */
export const TTS_PER_MINUTE = 30;
/** Transcriptions allowed per caller per minute. One per spoken question. */
export const STT_PER_MINUTE = 20;
/**
 * Smallest recording worth sending to fal, in bytes. A real second of speech is several kilobytes; the
 * iPhone sometimes produced a 5-byte file on a second recording (phone test round 1).
 */
export const MIN_RECORDING_BYTES = 1024;
/** One minute, in milliseconds. */
const MINUTE_MS = 60_000;

/** Limiter for POST /api/voice/tts. */
export const ttsLimiter = createRateLimiter(TTS_PER_MINUTE, MINUTE_MS);
/** Limiter for POST /api/voice/stt. */
export const sttLimiter = createRateLimiter(STT_PER_MINUTE, MINUTE_MS);
/** Spoken replies already paid for. */
export const speechCache = createSpeechCache();

/**
 * Identify the caller for rate limiting: the first address in X-Forwarded-For (what Vercel sets), else a
 * shared bucket for local development.
 *
 * @param request - The incoming request.
 * @returns A string key.
 */
export function callerKey(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  return forwarded?.split(',')[0]?.trim() || 'local';
}

/**
 * Refuse with 429 when the caller is over the limit.
 *
 * @param decision - Result of limiter.check.
 * @param decision.ok - Whether the call may proceed.
 * @param decision.retryAfterS - Seconds until the window resets.
 * @returns A 429 response with Retry-After, or null when the call may go ahead.
 */
export function tooManyRequests(decision: { ok: boolean; retryAfterS: number }): Response | null {
  if (decision.ok) return null;
  const response = jsonError(429, 'rate_limited', `Too many voice requests. Try again in ${decision.retryAfterS} s.`);
  response.headers.set('Retry-After', String(decision.retryAfterS));
  return response;
}

/**
 * Refuse with 503 when the server has no fal key and is not in mock mode. Saves a doomed request.
 *
 * @returns A 503 response, or null when voice can run.
 */
export function voiceUnavailable(): Response | null {
  if (process.env.NEXT_PUBLIC_USE_MOCKS === '1' || process.env.FAL_KEY) return null;
  return jsonError(503, 'voice_unavailable', 'Voice is not configured on this server (no FAL_KEY).');
}

/**
 * Turn a failure from the voice service into a response. The detail is logged, not sent: fal's error
 * body can name internal fields.
 *
 * @param error - What was thrown.
 * @param route - Route name for the log.
 * @returns A 502 for a fal failure, or null to let the generic handler answer 500.
 */
export function upstreamError(error: unknown, route: string): Response | null {
  if (!(error instanceof FalStageError)) return null;
  console.error(`${route}: fal failed (${error.endpoint}, request ${error.requestId ?? 'none'}, status ${error.status ?? 'none'})`, error.message);
  return jsonError(502, 'upstream_error', 'The voice service failed. Try again in a moment.');
}

/**
 * Whether a recording's MIME type looks like audio. Safari can label MP4 audio as video/mp4, and some
 * browsers send no type at all, so those are let through; fal decides if it can decode the bytes.
 *
 * @param type - The Blob's type.
 * @returns True when it is acceptable.
 */
export function isAcceptableAudioType(type: string): boolean {
  const base = type.split(';')[0].trim().toLowerCase();
  return base === '' || base === 'application/octet-stream' || base.startsWith('audio/') || base === 'video/webm' || base === 'video/mp4';
}
