/**
 * Limits and checks for POST /api/uploads.
 *
 * Owner: Agent 2 (Studio). Implements MASTER.md section 4.3 (uploads) and 5.3 rule 1, task A2-11.
 * The `_lib` folder name keeps Next.js from treating this as a route.
 */
import { createRateLimiter } from '@/lib/fal';

/** Uploads allowed per caller per minute. A player takes a handful of captures, so 20 is generous. */
export const UPLOADS_PER_MINUTE = 20;
/** Limiter for POST /api/uploads. In memory, per server process (see lib/fal/guards.ts). */
export const uploadLimiter = createRateLimiter(UPLOADS_PER_MINUTE, 60_000);

/**
 * Whether bytes start like a JPEG file (FF D8 FF). Checked on the content, not the MIME type, because a
 * browser's claimed type is not trusted and the contract allows JPEG only.
 *
 * @param head - The first bytes of the file.
 * @returns True for a JPEG.
 */
export function looksLikeJpeg(head: Uint8Array): boolean {
  return head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff;
}
