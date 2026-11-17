/**
 * GET /api/landmarks: every landmark.
 *
 * Owner: Agent 1 (Core). MASTER.md section 4.3, task A1-09.
 * Response: `{ landmarks: Landmark[] }` in route order.
 */
import type { LandmarksResponse } from '@/lib/contracts';
import { listEras, listLandmarks } from '@/lib/db';
import { SHOWCASE, showcaseLandmarks } from '@/lib/showcase';
import { handle, json } from '../_lib/http';

/**
 * List the landmarks. In showcase mode (fmota.com), only those with generated eras: see src/lib/showcase.
 *
 * @returns 200 with the landmarks.
 */
export async function GET(): Promise<Response> {
  return handle('GET /api/landmarks', async () => {
    const all = await listLandmarks();
    const body: LandmarksResponse = { landmarks: SHOWCASE ? await showcaseLandmarks(all, listEras) : all };
    return json(body);
  });
}
