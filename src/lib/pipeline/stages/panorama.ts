/**
 * Stage `panorama`: grow the scene into a full 360 by 180 degree view.
 *
 * Owner: Agent 2 (Studio). Implements MASTER.md sections 5.1 and 5.4, task A2-08 (route b2 of A2-03), the realism
 * rework after phone test round 1, and the image check of task A2-12.
 */
import sharp from 'sharp';
import type { SceneBrief } from '@/lib/contracts';
import { PANORAMA_UPSCALE_FACTOR, uploadToFal } from '@/lib/fal';
import { criticContext, generateChecked } from './checked';
import { checkPanorama, type CheckVerdict } from './critic';
import { buildPanoramaCanvas, fetchBuffer, toEquirectangular, unpaintedFraction, PANORAMA_FEATHER_PX, PANORAMA_HEIGHT_PX, PANORAMA_WIDTH_PX } from './image';
import { buildPanoramaInput, runImageModel, runUpscale } from './inputs';
import { buildPanoramaCheckPrompt, buildPanoramaPrompt, withCorrection, type PromptStyle } from './prompts';
import { usableReferenceUrls } from './scene';
import type { PanoramaOutput, StageContext, StageOutput } from './types';

/** More unpainted grey than this share of the picture means the model left the canvas unfinished. */
export const PANORAMA_MAX_UNPAINTED = 0.03;

/** Vertical field of view of the result. 180 means a full equirectangular sphere (contracts: Panorama.vFovDeg). */
export const PANORAMA_VFOV_DEG = 180;

/** One painted attempt: the model's output plus the bytes and the cheap local measure. */
interface Painted extends StageOutput {
  bytes: Buffer;
  unpainted: number;
}

/**
 * Make the panorama from the scene image.
 *
 * Steps: download the scene, paste it into a grey 2:1 canvas, upload the canvas, ask the model to paint the rest
 * (with the period photographs as extra images when there are any), then judge the result and repaint once with
 * the critic's advice if it fails, keeping the better. Then resize the keeper to exactly 2:1, optionally enlarge
 * it with SeedVR2, and upload the final image.
 * Model: MODELS.panorama (Nano Banana Pro edit at 2K, `aspect_ratio: "auto"`), MODELS.image_check for the critic
 * and MODELS.panorama_upscale. There is no working dedicated panorama model: fal-ai/hunyuan_world is listed but
 * not served (A2-03).
 * Cost and time: about $0.15 and 35 s for the painting, $0.0125 and 5 s for the check, about $0.02 and 35 s for the
 * upscale. A failed check repeats the painting and the check: at most about $0.34 and 90 s in all.
 * What fails, from live runs and the realism bake-off, and what catches it: a third of the canvas left grey (the
 * pixel check here), and a flat wide photograph, three tiled panels, a hard vertical line where the pasted scene
 * ended, a level-horizon or edge mismatch, modern objects or a computer-generated look (the critic). Fading the
 * pasted edge (`CanvasOptions.featherPx`) removed the hard line in one run but caused a flat photograph in
 * another, so it is off.
 * Side effects: several fal requests, up to three uploads to fal storage and several downloads.
 * Panorama fields for the Era: `widthPx` and `heightPx` from the output, `vFovDeg` PANORAMA_VFOV_DEG, and
 * `centreBearingDeg` = bearingDeg(landmark.photoSpot, landmark.subject), because the scene (photo spot facing
 * subject) sits at the horizontal centre.
 *
 * @param input - The scene image URL, the brief (for surroundings, references and what must not appear) and the year.
 * @param input.sceneUrl - URL from the scene stage.
 * @param input.brief - The scene brief from the Historian. Its `referenceImageUrls` are passed as extra images.
 * @param input.year - The era's year.
 * @param input.horizonFraction - Where the horizon sits in the scene from the top. Optional; see image.ts.
 * @param input.look - `colour` (default) or `monochrome`, as for the scene.
 * @param input.featherPx - Soft edge around the pasted scene, in canvas pixels. Default PANORAMA_FEATHER_PX; 0 gives a hard edge.
 * @param input.upscaleFactor - Enlargement after painting. Default PANORAMA_UPSCALE_FACTOR; 1 or less skips it.
 *   A failed upscale is not an error: the unenlarged panorama is kept.
 * @param ctx - Resume id, callbacks, optional fallback endpoint, and `checks` to switch the critic off.
 * @returns URL of the final 2:1 JPEG, its size, the model, total timing, the attempts made and the critic's report.
 * @throws FalStageError when fal fails or returns no image. Error when a download fails. The critic never throws.
 */
export async function runPanorama(
  input: { sceneUrl: string; brief: SceneBrief; year: number; horizonFraction?: number; look?: PromptStyle['look']; upscaleFactor?: number; featherPx?: number },
  ctx: StageContext = {},
): Promise<PanoramaOutput> {
  const startMs = Date.now();
  const canvas = await buildPanoramaCanvas(await fetchBuffer(input.sceneUrl), { horizonFraction: input.horizonFraction, featherPx: input.featherPx ?? PANORAMA_FEATHER_PX });
  const canvasUrl = await uploadToFal(new Blob([new Uint8Array(canvas)], { type: 'image/png' }));
  const references = usableReferenceUrls(input.brief.referenceImageUrls);
  const prompt = buildPanoramaPrompt(input.brief.surroundings, input.brief.changes.notYetBuilt, input.year, {
    look: input.look,
    referenceCount: references.length,
  });
  const checkPrompt = buildPanoramaCheckPrompt(input.year);

  const { output: kept, report } = await generateChecked<Painted>({
    ctx,
    generate: async (fix, runCtx) => {
      const painted = await runImageModel('panorama', buildPanoramaInput(withCorrection(prompt, fix), canvasUrl, references), runCtx);
      const bytes = await fetchBuffer(painted.url);
      return { ...painted, bytes, unpainted: await unpaintedFraction(bytes) };
    },
    judge: async (painted) => {
      // The cheap local check first: a half-grey picture needs no critic and its advice is obvious.
      if (painted.unpainted > PANORAMA_MAX_UNPAINTED) {
        const verdict: CheckVerdict = {
          passed: false,
          checked: true,
          problems: [`${Math.round(painted.unpainted * 100)}% of the canvas was left unpainted grey`],
          hard: [`${Math.round(painted.unpainted * 100)}% of the canvas was left unpainted grey`],
          fix: 'Paint every part of the grey canvas as part of one continuous photograph; no grey may remain.',
          raw: null,
          costUsd: 0,
        };
        return { verdict };
      }
      return { verdict: await checkPanorama(painted.url, checkPrompt, criticContext(ctx)) };
    },
  });

  let sphere = await toEquirectangular(kept.bytes);
  let widthPx = PANORAMA_WIDTH_PX;
  let heightPx = PANORAMA_HEIGHT_PX;
  const factor = input.upscaleFactor ?? PANORAMA_UPSCALE_FACTOR;
  if (factor > 1) {
    try {
      const sharpUrl = await uploadToFal(new Blob([new Uint8Array(sphere)], { type: 'image/jpeg' }));
      // A new request, not a resume: the saved request id belongs to the painting.
      const enlarged = await runUpscale(sharpUrl, factor, { ...ctx, resumeRequestId: null, onRequestId: undefined, endpoint: undefined });
      widthPx = Math.round((PANORAMA_WIDTH_PX * factor) / 2) * 2;
      heightPx = widthPx / 2;
      // Re-encode to an exact 2:1 JPEG: the upscaler can return a PNG tens of megabytes large.
      sphere = await sharp(await fetchBuffer(enlarged.url)).resize(widthPx, heightPx, { fit: 'fill' }).jpeg({ quality: 90 }).toBuffer();
    } catch (error) {
      // Sharpness is a bonus. Keep the unenlarged panorama rather than failing the whole stage.
      console.warn(`panorama upscale failed, keeping the ${PANORAMA_WIDTH_PX} px version: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  const url = await uploadToFal(new Blob([new Uint8Array(sphere)], { type: 'image/jpeg' }));
  return {
    url,
    model: kept.model,
    requestId: kept.requestId,
    elapsedMs: Date.now() - startMs,
    widthPx,
    heightPx,
    attempts: report.attempts,
    unpaintedFraction: kept.unpainted,
    check: report,
  };
}
