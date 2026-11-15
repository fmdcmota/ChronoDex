/**
 * Per-caller request limits for the routes that spend money or write to the database.
 *
 * Owner: Agent 1 (Core). Protects the credits behind MASTER.md section 5.5 once the site has a public
 * address (task A1-12). Reuses Agent 2's fixed-window limiter, imported from its pure module so the fal
 * client is not pulled into these routes. State lives in one server instance's memory, which is enough
 * to stop a script from running up a bill: on Vercel each instance counts separately, so the real
 * ceiling is a small multiple of these numbers.
 *
 * The numbers are generous on purpose. A demo room often shares one public address, so a limit that is
 * right for one person would lock out a table of judges.
 */
import { createRateLimiter } from '@/lib/fal/guards';
import { jsonError } from './http';

/** One minute, in milliseconds. */
const MINUTE_MS = 60_000;
/** Guide chat replies per caller per minute. Each one is a paid DeepSeek request. */
export const CHAT_PER_MINUTE = 60;
/** Generate requests per caller per minute. The server already refuses a second job for one era. */
export const GENERATE_PER_MINUTE = 20;
/** Captures per caller per minute. Each stores a row. */
export const CAPTURE_PER_MINUTE = 60;

/** Limiter for POST /api/chat. */
export const chatLimiter = createRateLimiter(CHAT_PER_MINUTE, MINUTE_MS);
/** Limiter for POST /api/eras/[eraId]/generate. */
export const generateLimiter = createRateLimiter(GENERATE_PER_MINUTE, MINUTE_MS);
/** Limiter for POST /api/captures. */
export const captureLimiter = createRateLimiter(CAPTURE_PER_MINUTE, MINUTE_MS);

/**
 * Identify the caller: the first address in X-Forwarded-For (which Vercel sets), else one shared
 * bucket for local development.
 *
 * @param request - The incoming request.
 * @returns A key for the limiter.
 */
export function callerKey(request: Request): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local';
}

/**
 * Check a caller against a limiter and build the 429 response when they are over.
 *
 * @param limiter - One of the limiters above.
 * @param request - The incoming request.
 * @returns A 429 response with Retry-After, or null when the call may go ahead.
 */
export function limitOrNull(limiter: ReturnType<typeof createRateLimiter>, request: Request): Response | null {
  const decision = limiter.check(callerKey(request));
  if (decision.ok) return null;
  const response = jsonError(429, 'rate_limited', `Too many requests. Try again in ${decision.retryAfterS} s.`);
  response.headers.set('Retry-After', String(decision.retryAfterS));
  return response;
}
