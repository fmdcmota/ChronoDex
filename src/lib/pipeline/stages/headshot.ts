/**
 * Stage `headshot`: the guide's portrait, used as the chat profile picture and as the identity
 * reference for the guide frame.
 *
 * Owner: Agent 2 (Studio). Implements MASTER.md section 5.1 (stage headshot), task A2-08.
 */
import { buildHeadshotInput, runImageModel } from './inputs';
import { buildHeadshotPrompt, type GuideLook } from './prompts';
import type { StageContext, StageOutput } from './types';

/**
 * Make a square portrait of the guide.
 *
 * Model: MODELS.headshot (Nano Banana 2.1, text to image, 1K, 1:1 gives 1024x1024).
 * Cost and time: token priced, about 18 s (A2-02).
 * Side effects: one fal request. Writes nothing; the orchestrator stores the URL on Guide.headshotUrl.
 *
 * @param input - The guide's looks and the year.
 * @param input.guide - Name, role and appearance of the fictional guide.
 * @param input.year - The era's year.
 * @param ctx - Resume id, callbacks and optional fallback endpoint.
 * @returns URL of the portrait on fal's CDN, with the model and timing.
 * @throws FalStageError when fal rejects the request or returns no image.
 */
export async function runHeadshot(input: { guide: GuideLook; year: number }, ctx: StageContext = {}): Promise<StageOutput> {
  return runImageModel('headshot', buildHeadshotInput(buildHeadshotPrompt(input.guide, input.year)), ctx);
}
