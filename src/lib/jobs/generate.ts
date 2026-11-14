/**
 * What POST /api/eras/[eraId]/generate does: decide whether an era needs a job, and create it.
 *
 * Owner: Agent 1 (Core). Implements MASTER.md section 4.3 (generate is safe to call twice) and the
 * VIDEO_GENERATION switch of section 8.2 (task A1-14). Kept out of the route so the worker scripts
 * and tests can use the same rule.
 */
import { eraNeedsGeneration, type AssetState, type Era, type EraId, type EraResponse } from '@/lib/contracts';
import { getEra, patchEra } from '@/lib/db';
import { enqueueEraJob, getActiveJob } from './queue';

/** The result of a generate request: an EraResponse, or a refusal the route turns into an HTTP error. */
export type GenerationOutcome =
  | { ok: true; response: EraResponse }
  | { ok: false; status: 403 | 404; code: 'not_found' | 'video_disabled'; message: string };

/**
 * Tell whether the video tier may be generated. Off unless VIDEO_GENERATION is exactly "on",
 * because the video tier is about eight times the cost of the core tier (MASTER.md 5.5).
 *
 * @returns True when VIDEO_GENERATION=on.
 */
export function videoGenerationEnabled(): boolean {
  return process.env.VIDEO_GENERATION === 'on';
}

/**
 * Tier states that a new job moves to `queued`. `generating` is included because, with no active
 * job, it can only be left over from a worker that crashed. `ready` is never touched.
 */
const QUEUEABLE: readonly AssetState[] = ['missing', 'failed', 'generating'];

/**
 * Handle a generate request for one era.
 *
 * In order:
 * 1. Unknown era: refuse with 404.
 * 2. An active job exists: return it, whatever includeVideo says.
 * 3. includeVideo while VIDEO_GENERATION is off: refuse with 403 `video_disabled`. Ask again
 *    with includeVideo false for the core tier.
 * 4. Nothing is missing: return the era with `job: null`.
 * 5. Otherwise enqueue a job and mark the missing tiers `queued`.
 *
 * Side effects: may insert a job and patch the era's state fields.
 *
 * @param eraId - The era.
 * @param includeVideo - Whether the caller wants the video tier as well.
 * @returns The outcome.
 */
export async function requestEraGeneration(eraId: EraId, includeVideo: boolean): Promise<GenerationOutcome> {
  const era = await getEra(eraId);
  if (!era) return { ok: false, status: 404, code: 'not_found', message: `No era "${eraId}"` };

  const active = await getActiveJob(eraId);
  if (active) return { ok: true, response: { era, job: active } };

  if (includeVideo && !videoGenerationEnabled()) {
    return {
      ok: false,
      status: 403,
      code: 'video_disabled',
      message: 'Video generation is switched off on this server. Ask again with includeVideo false.',
    };
  }

  if (!eraNeedsGeneration(era, includeVideo)) return { ok: true, response: { era, job: null } };

  const job = await enqueueEraJob(eraId, includeVideo);
  // A worker could in theory claim the job and mark a tier generating between the enqueue above
  // and this patch, which would show `queued` until its next write. The window is milliseconds
  // against a worker poll of seconds, and the job's stages stay correct either way.
  const patch: Partial<Era> = {};
  if (QUEUEABLE.includes(era.state)) patch.state = 'queued';
  if (job.includeVideo && QUEUEABLE.includes(era.videoState)) patch.videoState = 'queued';
  const updated = Object.keys(patch).length > 0 ? await patchEra(eraId, patch) : era;
  return { ok: true, response: { era: updated, job } };
}
