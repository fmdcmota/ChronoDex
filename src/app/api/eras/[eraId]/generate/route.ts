/**
 * POST /api/eras/[eraId]/generate: make sure an era's missing parts are being generated.
 *
 * Owner: Agent 1 (Core). MASTER.md section 4.3, tasks A1-09 and A1-14.
 * Request: `{ includeVideo: boolean }`. Response: `{ era: Era, job: Job | null }`.
 * Safe to call twice: returns the active job, or `job: null` when nothing is missing.
 * 403 `video_disabled` when includeVideo is true and VIDEO_GENERATION is not "on".
 * The rule itself is requestEraGeneration in src/lib/jobs/generate.ts.
 */
import type { NextRequest } from 'next/server';
import { EraIdSchema, GenerateRequestSchema } from '@/lib/contracts';
import { requestEraGeneration } from '@/lib/jobs';
import { handle, json, jsonError, readJson } from '../../../_lib/http';
import { generateLimiter, limitOrNull } from '../../../_lib/limits';

/**
 * Request generation.
 *
 * @param request - Body `{ includeVideo }`.
 * @param ctx - Route context with the era id.
 * @returns 200 with the era and job, 400 for bad input, 403 when video is off, 404 for an unknown era.
 */
export async function POST(request: NextRequest, ctx: RouteContext<'/api/eras/[eraId]/generate'>): Promise<Response> {
  return handle('POST /api/eras/[eraId]/generate', async () => {
    const limited = limitOrNull(generateLimiter, request);
    if (limited) return limited;
    const { eraId } = await ctx.params;
    if (!EraIdSchema.safeParse(eraId).success) return jsonError(400, 'bad_request', `Invalid era id "${eraId}"`);
    const body = await readJson(request, GenerateRequestSchema);
    if (!body.ok) return body.response;
    const outcome = await requestEraGeneration(eraId, body.data.includeVideo);
    return outcome.ok ? json(outcome.response) : jsonError(outcome.status, outcome.code, outcome.message);
  });
}
