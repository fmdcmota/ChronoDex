/**
 * GET /api/landmarks: every landmark.
 *
 * Owner: Agent 1 (Core). MASTER.md section 4.3, task A1-09.
 * Response: `{ landmarks: Landmark[] }` in route order.
 */
import type { LandmarksResponse } from '@/lib/contracts';
import { listLandmarks } from '@/lib/db';
import { handle, json } from '../_lib/http';

/**
 * List the landmarks.
 *
 * @returns 200 with the landmarks.
 */
export async function GET(): Promise<Response> {
  return handle('GET /api/landmarks', async () => {
    const body: LandmarksResponse = { landmarks: await listLandmarks() };
    return json(body);
  });
}
