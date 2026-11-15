/**
 * GET /api/media/credits/[eraId]: picture credits (author, licence, file page) for an era's third-party images.
 *
 * Owner: Agent 4 (Time Machine), under the /api/media path the human granted. Task A4-b.
 * Response: `{ credits: PictureCredit[] }` (src/lib/media/credits.ts), possibly empty. 400 for a malformed era id.
 * Read by the Sources drawer and the Then/Now slider. Cached five minutes: the data changes only when the
 * Archivist delivers, and a stale credit list for a few minutes is harmless.
 */
import type { NextRequest } from 'next/server';
import { EraIdSchema, parseEraId } from '@/lib/contracts';
import { archiveDir } from '@/lib/archive';
import { eraPictureCredits } from '@/lib/media/credits';
import { handle, jsonError } from '../../../_lib/http';

/** Reads files from disk. */
export const runtime = 'nodejs';

/** Browser and proxy cache lifetime, seconds. */
const MAX_AGE_S = 300;

/**
 * Get an era's picture credits.
 *
 * @param _request - Unused.
 * @param ctx - Route context with the era id.
 * @returns 200 with `{ credits }`, or 400.
 */
export async function GET(_request: NextRequest, ctx: RouteContext<'/api/media/credits/[eraId]'>): Promise<Response> {
  return handle('GET /api/media/credits/[eraId]', async () => {
    const { eraId } = await ctx.params;
    if (!EraIdSchema.safeParse(eraId).success) return jsonError(400, 'bad_request', `Invalid era id "${eraId}"`);
    const { landmarkId } = parseEraId(eraId);
    const credits = await eraPictureCredits(landmarkId, eraId, archiveDir());
    return Response.json({ credits }, { headers: { 'Cache-Control': `public, max-age=${MAX_AGE_S}` } });
  });
}
