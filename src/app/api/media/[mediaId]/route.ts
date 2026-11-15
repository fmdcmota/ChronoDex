/**
 * GET and HEAD /api/media/[mediaId]: serve a stored generated file (panorama, scene, headshot, narration, clips).
 *
 * Owner: Agent 4 (Time Machine), by the human's grant (MASTER.md section 3). Task A4-12,
 * notebook/agent-4-panorama-plan.md section 3.1.
 *
 * - Media ids are content hashes, so a URL's bytes never change: `Cache-Control: public, max-age=31536000,
 *   immutable` and a strong ETag (the id). A repeat visit costs no download at all.
 * - Answers `Range` with 206 and `Content-Range`, because iOS Safari will not play audio or video otherwise.
 * - `If-None-Match` with our ETag answers 304.
 * Errors: 400 malformed id, 404 unknown id, 416 a range past the end. JSON error shape of MASTER.md 4.3.
 */
import type { NextRequest } from 'next/server';
import { etagMatches, getMediaAsset, isMediaId, openMedia, parseRange } from '@/lib/media';
import { handle, jsonError } from '../../_lib/http';

/** GridFS and the folder backend need Node, not the edge runtime. */
export const runtime = 'nodejs';

/** One year, the longest max-age browsers honour. Safe because the URL is a content hash. */
const IMMUTABLE = 'public, max-age=31536000, immutable';

/**
 * Serve a stored file.
 *
 * @param request - The request. Reads `Range` and `If-None-Match`.
 * @param mediaId - The id from the path.
 * @param withBody - False for HEAD.
 * @returns 200, 206, 304, or a JSON error.
 */
async function serve(request: NextRequest, mediaId: string, withBody: boolean): Promise<Response> {
  if (!isMediaId(mediaId)) return jsonError(400, 'bad_request', `Invalid media id "${mediaId}"`);
  const asset = await getMediaAsset(mediaId);
  if (!asset) return jsonError(404, 'not_found', `No media "${mediaId}"`);

  const etag = `"${asset.id}"`;
  const headers = new Headers({
    'Content-Type': asset.contentType,
    'Cache-Control': IMMUTABLE,
    ETag: etag,
    'Accept-Ranges': 'bytes',
  });
  if (etagMatches(request.headers.get('if-none-match'), etag)) return new Response(null, { status: 304, headers });

  const range = parseRange(request.headers.get('range'), asset.bytes);
  if (range === 'unsatisfiable') {
    headers.set('Content-Range', `bytes */${asset.bytes}`);
    return new Response(null, { status: 416, headers });
  }
  if (range) {
    headers.set('Content-Range', `bytes ${range.start}-${range.end}/${asset.bytes}`);
    headers.set('Content-Length', String(range.end - range.start + 1));
    return new Response(withBody ? await openMedia(asset.id, range) : null, { status: 206, headers });
  }
  headers.set('Content-Length', String(asset.bytes));
  return new Response(withBody ? await openMedia(asset.id) : null, { status: 200, headers });
}

/**
 * Get a stored file, whole or a byte range.
 *
 * @param request - The request.
 * @param ctx - Route context with the media id.
 * @returns The file (200 or 206), 304, or a JSON error.
 */
export async function GET(request: NextRequest, ctx: RouteContext<'/api/media/[mediaId]'>): Promise<Response> {
  return handle('GET /api/media/[mediaId]', async () => serve(request, (await ctx.params).mediaId, true));
}

/**
 * Headers only, for players that probe a file's size first.
 *
 * @param request - The request.
 * @param ctx - Route context with the media id.
 * @returns The same status and headers as GET, with no body.
 */
export async function HEAD(request: NextRequest, ctx: RouteContext<'/api/media/[mediaId]'>): Promise<Response> {
  return handle('HEAD /api/media/[mediaId]', async () => serve(request, (await ctx.params).mediaId, false));
}
