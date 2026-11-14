/**
 * Stage `scene`: edit the reference photo to the era's year.
 *
 * Owner: Agent 2 (Studio). Implements MASTER.md section 5.1 (stage scene), task A2-08.
 */
import type { SceneBrief } from '@/lib/contracts';
import { buildImageEditInput, runImageModel } from './inputs';
import { buildScenePrompt } from './prompts';
import type { StageContext, StageOutput } from './types';

/**
 * Edit the present-day reference photo into the same place in `year`.
 *
 * Model: MODELS.scene (Nano Banana Pro edit; schema at https://fal.ai/models/<endpoint>/llms.txt).
 * Cost and time: about $0.15 and 20 s at 1K, 16:9 (A2-02, 1376x768 out).
 * The reference photo must already be 16:9: the model centre-crops anything else, and the crop would
 * decide the framing (A2-02 trap; Agent 1's seed normalises photos).
 * Side effects: one fal request. Writes nothing; the orchestrator stores the URL.
 *
 * @param input - The reference photo URL, the Historian's scene brief and the year.
 * @param input.referencePhotoUrl - URL of the present-day photo (Landmark.referencePhotoUrl).
 * @param input.brief - The scene brief from the Historian.
 * @param input.year - The era's year.
 * @param ctx - Resume id, callbacks and optional fallback endpoint.
 * @returns URL of the edited scene on fal's CDN, with the model and timing.
 * @throws FalStageError when fal rejects the request or returns no image.
 */
export async function runScene(
  input: { referencePhotoUrl: string; brief: SceneBrief; year: number },
  ctx: StageContext = {},
): Promise<StageOutput> {
  const prompt = buildScenePrompt(input.brief, input.year);
  return runImageModel('scene', buildImageEditInput(prompt, [input.referencePhotoUrl]), ctx);
}
