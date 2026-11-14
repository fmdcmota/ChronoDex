/**
 * GET /api/players/[playerId]/dex: a player's captures.
 *
 * Owner: Agent 1 (Core). MASTER.md section 4.3, task A1-09.
 * Response: `{ captures: Capture[] }`, oldest first. An unknown player has an empty Dex, not a 404.
 */
import type { NextRequest } from 'next/server';
import type { DexResponse } from '@/lib/contracts';
import { listCaptures } from '@/lib/db';
import { handle, json, jsonError } from '../../../_lib/http';

/** Longest player id accepted. Real ids are 36-character UUIDs. */
const MAX_PLAYER_ID_LENGTH = 64;

/**
 * List a player's captures.
 *
 * @param _request - Unused.
 * @param ctx - Route context with the player id.
 * @returns 200 with the captures, 400 for a malformed id.
 */
export async function GET(_request: NextRequest, ctx: RouteContext<'/api/players/[playerId]/dex'>): Promise<Response> {
  return handle('GET /api/players/[playerId]/dex', async () => {
    const { playerId } = await ctx.params;
    if (!playerId || playerId.length > MAX_PLAYER_ID_LENGTH) return jsonError(400, 'bad_request', 'Invalid player id');
    const body: DexResponse = { captures: await listCaptures(playerId) };
    return json(body);
  });
}
