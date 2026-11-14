/**
 * Stage `panorama`: grow the scene into a full 360 by 180 degree view.
 *
 * Owner: Agent 2 (Studio). Implements MASTER.md sections 5.1 and 5.4, task A2-08 (route b2 of A2-03).
 */
import type { SceneBrief } from '@/lib/contracts';
import { uploadToFal } from '@/lib/fal';
import { buildPanoramaCanvas, fetchBuffer, toEquirectangular, unpaintedFraction, PANORAMA_HEIGHT_PX, PANORAMA_WIDTH_PX } from './image';
import { buildPanoramaInput, runImageModel } from './inputs';
import { buildPanoramaPrompt } from './prompts';
import type { PanoramaOutput, StageContext } from './types';

/** Most model attempts per panorama: the first plus one retry (MASTER.md 5.3 rule 5), so a failure costs at most $0.30. */
export const PANORAMA_MAX_ATTEMPTS = 2;
/** More unpainted grey than this share of the picture means the model left the canvas unfinished. */
export const PANORAMA_MAX_UNPAINTED = 0.03;

/** Vertical field of view of the result. 180 means a full equirectangular sphere (contracts: Panorama.vFovDeg). */
export const PANORAMA_VFOV_DEG = 180;

/**
 * Make the panorama from the scene image.
 *
 * Steps: download the scene, paste it into a grey 2:1 canvas, upload the canvas, ask the model to
 * paint the rest, download the result, resize it to exactly 2:1, upload that.
 * Model: MODELS.panorama (Nano Banana Pro edit at 2K, `aspect_ratio: "auto"`). There is no
 * working dedicated panorama model: fal-ai/hunyuan_world is listed but not served (A2-03).
 * Cost and time: about $0.15 and 35 s with the download, resize and uploads; a retry (see below) doubles it.
 * Reliability: three live runs gave one good sphere, one with the horizon about 10% too low and one with the
 * bottom third left grey. The grey one is caught here and retried once. The low horizon is not caught yet:
 * A2-12 (Claude image check) should judge horizon, seam and leftover modern objects.
 * Side effects: one fal request, two uploads to fal storage and two downloads. Writes nothing else.
 * Panorama fields for the Era: `widthPx` and `heightPx` from the output, `vFovDeg` PANORAMA_VFOV_DEG,
 * and `centreBearingDeg` = bearingDeg(landmark.photoSpot, landmark.subject), because the scene
 * (photo spot facing subject) sits at the horizontal centre.
 *
 * @param input - The scene image URL, the brief (for surroundings and what must not appear) and the year.
 * @param input.sceneUrl - URL from the scene stage.
 * @param input.brief - The scene brief from the Historian.
 * @param input.year - The era's year.
 * @param input.horizonFraction - Where the horizon sits in the scene from the top. Optional; see image.ts.
 * @param ctx - Resume id, callbacks and optional fallback endpoint.
 * @returns URL of the 2880x1440 JPEG, its size, the model and total timing.
 * @throws FalStageError when fal fails or returns no image. Error when a download fails.
 */
export async function runPanorama(
  input: { sceneUrl: string; brief: SceneBrief; year: number; horizonFraction?: number },
  ctx: StageContext = {},
): Promise<PanoramaOutput> {
  const startMs = Date.now();
  const canvas = await buildPanoramaCanvas(await fetchBuffer(input.sceneUrl), { horizonFraction: input.horizonFraction });
  const canvasUrl = await uploadToFal(new Blob([new Uint8Array(canvas)], { type: 'image/png' }));
  const prompt = buildPanoramaPrompt(input.brief.surroundings, input.brief.changes.notYetBuilt, input.year);
  // The model is not reliable here: of three live runs one left a third of the canvas grey. Try again once
  // when a cheap pixel check says the canvas was not filled, then keep the least-grey result.
  let painted = await runImageModel('panorama', buildPanoramaInput(prompt, canvasUrl), ctx);
  let paintedBytes = await fetchBuffer(painted.url);
  let unpainted = await unpaintedFraction(paintedBytes);
  let attempts = 1;
  while (unpainted > PANORAMA_MAX_UNPAINTED && attempts < PANORAMA_MAX_ATTEMPTS) {
    attempts++;
    // A fresh request: the saved resume id belongs to the attempt that has just finished.
    const retry = await runImageModel('panorama', buildPanoramaInput(prompt, canvasUrl), { ...ctx, resumeRequestId: null });
    const retryBytes = await fetchBuffer(retry.url);
    const retryUnpainted = await unpaintedFraction(retryBytes);
    if (retryUnpainted < unpainted) {
      painted = retry;
      paintedBytes = retryBytes;
      unpainted = retryUnpainted;
    }
  }
  const sphere = await toEquirectangular(paintedBytes);
  const url = await uploadToFal(new Blob([new Uint8Array(sphere)], { type: 'image/jpeg' }));
  return {
    url,
    model: painted.model,
    requestId: painted.requestId,
    elapsedMs: Date.now() - startMs,
    widthPx: PANORAMA_WIDTH_PX,
    heightPx: PANORAMA_HEIGHT_PX,
    attempts,
    unpaintedFraction: unpainted,
  };
}
