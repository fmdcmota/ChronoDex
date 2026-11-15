/**
 * POST /api/captures: the server's decision on whether a photo collects a badge.
 *
 * Owner: Agent 1 (Core). MASTER.md sections 1.2 (part 1), 4.2 and 4.3, tasks A1-09 and A1-14.
 * The server decides captures; the client only uses the same helpers to show distance.
 *
 * Request: CaptureRequest. Response: CaptureResult. "Too far", "no location" and "no photo" are
 * normal results with `ok: false`, not HTTP errors. HTTP errors: 400 for a malformed body or a
 * photo URL that is not http(s), 403 `spoofed_location` for a spoofed location when
 * ALLOW_SPOOFED_LOCATION is "0" (spoofing is permanent by default for the demo, Agent 6, 15 Nov 2026).
 */
import type { NextRequest } from 'next/server';
import { CaptureRequestSchema, resolveCapture, type Capture, type CaptureResult } from '@/lib/contracts';
import { insertCapture, listLandmarks } from '@/lib/db';
import { handle, json, jsonError, readJson } from '../_lib/http';
import { captureLimiter, limitOrNull } from '../_lib/limits';

/** Distances are stored to the decimetre. GPS is nowhere near that precise anyway. */
const DISTANCE_DECIMALS_FACTOR = 10;
/** Longest player id accepted. Real ids are 36-character UUIDs. */
const MAX_PLAYER_ID_LENGTH = 64;

/**
 * Tell whether a photo URL may be stored and later shown in the Dex.
 *
 * @param url - The URL returned by POST /api/uploads.
 * @returns True for http and https URLs only, so no `javascript:` or `data:` URL is ever stored.
 */
function isWebUrl(url: string): boolean {
  try {
    const { protocol } = new URL(url);
    return protocol === 'https:' || protocol === 'http:';
  } catch {
    return false;
  }
}

/**
 * Decide and record a capture.
 *
 * @param request - Body: CaptureRequest.
 * @returns 200 with a CaptureResult, or an error response.
 */
export async function POST(request: NextRequest): Promise<Response> {
  return handle('POST /api/captures', async () => {
    const limited = limitOrNull(captureLimiter, request);
    if (limited) return limited;
    const body = await readJson(request, CaptureRequestSchema);
    if (!body.ok) return body.response;
    const { playerId, photoUrl, location, accuracyM, spoofed } = body.data;

    if (playerId.length > MAX_PLAYER_ID_LENGTH) return jsonError(400, 'bad_request', 'Invalid player id');
    if (spoofed && process.env.ALLOW_SPOOFED_LOCATION === '0') {
      return jsonError(403, 'spoofed_location', 'Spoofed locations are not accepted on this server');
    }
    if (!location) return json({ ok: false, reason: 'location_missing', nearest: null } satisfies CaptureResult);

    const { hit, nearest } = resolveCapture(location, accuracyM, await listLandmarks());
    const nearestOut = nearest ? { landmarkId: nearest.landmark.id, distanceM: round(nearest.distanceM) } : null;

    if (!photoUrl) return json({ ok: false, reason: 'photo_missing', nearest: nearestOut } satisfies CaptureResult);
    if (!isWebUrl(photoUrl)) return jsonError(400, 'bad_request', 'photoUrl must be an http(s) URL from POST /api/uploads');
    if (!hit) return json({ ok: false, reason: 'too_far', nearest: nearestOut } satisfies CaptureResult);

    const capture: Capture = {
      id: crypto.randomUUID(),
      playerId,
      landmarkId: hit.landmark.id,
      photoUrl,
      location,
      accuracyM,
      distanceM: round(hit.distanceM),
      capturedAt: new Date().toISOString(),
    };
    const stored = await insertCapture(capture);
    const result: CaptureResult = { ok: true, capture: stored.capture, landmark: hit.landmark, alreadyCollected: stored.alreadyCollected };
    return json(result);
  });
}

/**
 * Round a distance for storage and display.
 *
 * @param distanceM - Metres.
 * @returns Metres to one decimal place.
 */
function round(distanceM: number): number {
  return Math.round(distanceM * DISTANCE_DECIMALS_FACTOR) / DISTANCE_DECIMALS_FACTOR;
}
