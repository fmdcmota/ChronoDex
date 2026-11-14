/**
 * GET /api/eras/[eraId]: one era and its active job. Screens poll this every
 * GAME.POLL_INTERVAL_MS while `job` is not null.
 *
 * Owner: Agent 1 (Core). MASTER.md section 4.3, task A1-09.
 * Response: `{ era: Era, job: Job | null }`. 404 when the era does not exist.
 */
import type { NextRequest } from 'next/server';
import { EraIdSchema, type EraResponse } from '@/lib/contracts';
import { getEra } from '@/lib/db';
import { getActiveJob } from '@/lib/jobs';
import { handle, json, jsonError } from '../../_lib/http';

/**
 * Get an era.
 *
 * @param _request - Unused.
 * @param ctx - Route context with the era id.
 * @returns 200 with the era and job, 400 for a malformed id, 404 for an unknown era.
 */
export async function GET(_request: NextRequest, ctx: RouteContext<'/api/eras/[eraId]'>): Promise<Response> {
  return handle('GET /api/eras/[eraId]', async () => {
    const { eraId } = await ctx.params;
    if (!EraIdSchema.safeParse(eraId).success) return jsonError(400, 'bad_request', `Invalid era id "${eraId}"`);
    const [era, job] = await Promise.all([getEra(eraId), getActiveJob(eraId)]);
    if (!era) return jsonError(404, 'not_found', `No era "${eraId}"`);
    const body: EraResponse = { era, job };
    return json(body);
  });
}
