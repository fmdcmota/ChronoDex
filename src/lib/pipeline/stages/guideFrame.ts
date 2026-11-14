/**
 * Stage `guide_frame`: the guide standing in the scene. First frame of nothing, last frame of
 * walk_on, the picture the talk model animates, and the first frame of walk_off.
 *
 * Owner: Agent 2 (Studio). Implements MASTER.md section 5.1 (stage guide_frame), task A2-08.
 */
import { buildImageEditInput, runImageModel } from './inputs';
import { buildGuideFramePrompt, type GuideLook } from './prompts';
import type { StageContext, StageOutput } from './types';

/**
 * Put the guide into the scene as a waist-up close-up.
 *
 * Model: MODELS.guide_frame (Nano Banana Pro edit, scene first and headshot second as references).
 * Cost and time: about $0.15 and 20 s at 1K (A2-05, 1376x768 out).
 * Trap: without "waist up, large in the frame" the guide stands far away with a face about 40 px
 * tall, too small for the lip-sync model (A2-05).
 * Side effects: one fal request. Writes nothing; the orchestrator stores the URL.
 *
 * @param input - The scene and headshot URLs, the guide and the year.
 * @param input.sceneUrl - URL from the scene stage.
 * @param input.headshotUrl - URL from the headshot stage.
 * @param input.guide - The guide's looks.
 * @param input.year - The era's year.
 * @param ctx - Resume id, callbacks and optional fallback endpoint.
 * @returns URL of the frame on fal's CDN, with the model and timing.
 * @throws FalStageError when fal rejects the request or returns no image.
 */
export async function runGuideFrame(
  input: { sceneUrl: string; headshotUrl: string; guide: GuideLook; year: number },
  ctx: StageContext = {},
): Promise<StageOutput> {
  const prompt = buildGuideFramePrompt(input.guide, input.year);
  return runImageModel('guide_frame', buildImageEditInput(prompt, [input.sceneUrl, input.headshotUrl]), ctx);
}
