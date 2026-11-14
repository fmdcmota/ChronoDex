/**
 * GET /api/landmarks/[landmarkId]/eras: one era per year of the landmark, ascending.
 *
 * Owner: Agent 1 (Core). MASTER.md section 4.3, task A1-09.
 * Response: `{ eras: Era[] }`. 404 when the landmark does not exist.
 */
import type { NextRequest } from 'next/server';
import { isLandmarkId, type ErasResponse } from '@/lib/contracts';
import { getLandmark, listEras } from '@/lib/db';
import { handle, json, jsonError } from '../../../_lib/http';

/**
 * List a landmark's eras.
 *
 * @param _request - Unused.
 * @param ctx - Route context with the landmark id.
 * @returns 200 with the eras, 400 for a malformed id, 404 for an unknown landmark.
 */
export async function GET(_request: NextRequest, ctx: RouteContext<'/api/landmarks/[landmarkId]/eras'>): Promise<Response> {
  return handle('GET /api/landmarks/[landmarkId]/eras', async () => {
    const { landmarkId } = await ctx.params;
    if (!isLandmarkId(landmarkId)) return jsonError(400, 'bad_request', `Invalid landmark id "${landmarkId}"`);
    if (!(await getLandmark(landmarkId))) return jsonError(404, 'not_found', `No landmark "${landmarkId}"`);
    const body: ErasResponse = { eras: await listEras(landmarkId) };
    return json(body);
  });
}
