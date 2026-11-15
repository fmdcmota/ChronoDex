/**
 * Stage `guide_frame`: the guide standing in the scene. First frame of nothing, last frame of
 * walk_on, the picture the talk model animates, and the first frame of walk_off.
 *
 * Owner: Agent 2 (Studio). Implements MASTER.md section 5.1 (stage guide_frame), task A2-08, and the image check
 * of task A2-12.
 */
import { checkGuideFrame } from './critic';
import { criticContext, generateChecked } from './checked';
import { buildImageEditInput, runImageModel } from './inputs';
import { buildGuideFrameCheckPrompt, buildGuideFramePrompt, withCorrection, type GuideLook } from './prompts';
import type { StageContext, StageOutput } from './types';

/**
 * Put the guide into the scene as a waist-up close-up, then have the critic judge it against the portrait.
 *
 * Model: MODELS.guide_frame (Nano Banana Pro edit, scene first and headshot second as references).
 * Cost and time: about $0.15 and 20 s at 1K (A2-05, 1376x768 out), plus about $0.0125 for the check. A frame whose
 * face is small or does not match the portrait is made once more with the critic's advice, and the better one kept.
 * Trap: without "waist up, large in the frame" the guide stands far away with a face about 40 px
 * tall, too small for the lip-sync model (A2-05).
 * Side effects: one or two fal edits and one or two critic requests. Writes nothing; the orchestrator stores the URL.
 *
 * @param input - The scene and headshot URLs, the guide and the year.
 * @param input.sceneUrl - URL from the scene stage.
 * @param input.headshotUrl - URL from the headshot stage.
 * @param input.guide - The guide's looks.
 * @param input.year - The era's year.
 * @param ctx - Resume id, callbacks, optional fallback endpoint, and `checks` to switch the critic off.
 * @returns URL of the frame on fal's CDN, with the model, timing and the critic's report.
 * @throws FalStageError when fal rejects the request or returns no image. The critic never throws.
 */
export async function runGuideFrame(
  input: { sceneUrl: string; headshotUrl: string; guide: GuideLook; year: number },
  ctx: StageContext = {},
): Promise<StageOutput> {
  const prompt = buildGuideFramePrompt(input.guide, input.year);
  const checkPrompt = buildGuideFrameCheckPrompt();
  const { output, report } = await generateChecked({
    ctx,
    generate: (fix, runCtx) => runImageModel('guide_frame', buildImageEditInput(withCorrection(prompt, fix), [input.sceneUrl, input.headshotUrl]), runCtx),
    judge: async (frame) => ({ verdict: await checkGuideFrame(frame.url, input.headshotUrl, checkPrompt, criticContext(ctx)) }),
  });
  return { ...output, check: report };
}
