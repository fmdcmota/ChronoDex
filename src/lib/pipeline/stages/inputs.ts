/**
 * Builders for the JSON each fal model wants, and the helpers that read a result.
 *
 * Owner: Agent 2 (Studio). Implements MASTER.md sections 5.2 and 5.3, task A2-08. Field names come
 * from each model's schema page (checked 14 Nov and recorded in notebook/agent-2.md). Where a
 * fallback model wants different fields, the builder branches on the registry entry, so the endpoint
 * string is never written here.
 */
import { IMAGE_ASPECT_RATIO, IMAGE_RESOLUTION, MODELS, PANORAMA_RESOLUTION, WALK_DURATION_S, WALK_RESOLUTION, runFal, FalStageError } from '@/lib/fal';
import type { FalStageKey } from '@/lib/fal';
import type { FalImageResult, FalVideoResult, StageContext, StageOutput } from './types';

/** Resolution Fabric is asked for when it stands in for the Kling avatar. 480p is $0.08/s against $0.15/s at 720p. */
const FABRIC_RESOLUTION = '480p';

/**
 * Input for the image-edit models (scene, guide frame, panorama).
 *
 * @param prompt - The edit instruction.
 * @param imageUrls - Reference images, in the order the prompt refers to them ("image 1", "image 2").
 * @param options - Overrides.
 * @param options.aspectRatio - Default IMAGE_ASPECT_RATIO. The panorama passes `auto`, so the output follows its 2:1 canvas.
 * @param options.resolution - Default IMAGE_RESOLUTION.
 * @returns Input for fal-ai/nano-banana-pro/edit or google/nano-banana-2.1/edit (the fields are the same).
 */
export function buildImageEditInput(
  prompt: string,
  imageUrls: string[],
  options: { aspectRatio?: string; resolution?: string } = {},
): Record<string, unknown> {
  return {
    prompt,
    image_urls: imageUrls,
    aspect_ratio: options.aspectRatio ?? IMAGE_ASPECT_RATIO,
    resolution: options.resolution ?? IMAGE_RESOLUTION,
    output_format: 'jpeg',
  };
}

/**
 * Input for the panorama's image edit: one grey canvas (and any period photographs), output shape set by the canvas.
 *
 * @param prompt - From buildPanoramaPrompt.
 * @param canvasUrl - URL of the uploaded canvas. It must be image 1: the prompt says "the photograph in the middle".
 * @param referenceUrls - Real period photographs, after the canvas. The prompt's "images 2 to N" refers to them.
 * @returns Input at PANORAMA_RESOLUTION with `aspect_ratio: "auto"`.
 */
export function buildPanoramaInput(prompt: string, canvasUrl: string, referenceUrls: string[] = []): Record<string, unknown> {
  return buildImageEditInput(prompt, [canvasUrl, ...referenceUrls], { aspectRatio: 'auto', resolution: PANORAMA_RESOLUTION });
}

/**
 * Input for the text-to-image model (headshot).
 *
 * @param prompt - From buildHeadshotPrompt.
 * @returns A square image at IMAGE_RESOLUTION.
 */
export function buildHeadshotInput(prompt: string): Record<string, unknown> {
  return { prompt, aspect_ratio: '1:1', resolution: IMAGE_RESOLUTION, output_format: 'jpeg' };
}

/**
 * Input for a first-and-last-frame video model (walk_on, walk_off).
 *
 * Kling 4.0 defaults to 1080p, which costs 50% more, so 720p is always set (F-008).
 * Flux 3 (the fallback) wants the same fields and defaults to generating audio, which a walk clip does not need.
 *
 * @param endpoint - The endpoint that will run it.
 * @param prompt - From buildWalkPrompt.
 * @param startImageUrl - First frame.
 * @param endImageUrl - Last frame.
 * @returns Input for that model.
 */
export function buildWalkInput(endpoint: string, prompt: string, startImageUrl: string, endImageUrl: string): Record<string, unknown> {
  const input: Record<string, unknown> = {
    prompt,
    start_image_url: startImageUrl,
    end_image_url: endImageUrl,
    duration: WALK_DURATION_S,
    resolution: WALK_RESOLUTION,
  };
  if (endpoint === MODELS.walk_on.fallback) input.generate_audio = false;
  return input;
}

/**
 * Input for a talking-avatar model (talk).
 *
 * Kling takes an optional prompt; Fabric requires a resolution and has no prompt field.
 *
 * @param endpoint - The endpoint that will run it.
 * @param guideFrameUrl - The guide standing in the scene.
 * @param narrationUrl - The narration audio. The video lasts as long as the audio.
 * @param prompt - From buildTalkPrompt.
 * @returns Input for that model.
 */
export function buildTalkInput(endpoint: string, guideFrameUrl: string, narrationUrl: string, prompt: string): Record<string, unknown> {
  if (endpoint === MODELS.talk.fallback) {
    return { image_url: guideFrameUrl, audio_url: narrationUrl, resolution: FABRIC_RESOLUTION };
  }
  return { image_url: guideFrameUrl, audio_url: narrationUrl, prompt };
}

/**
 * Run one model for a stage and return the first image URL.
 *
 * @param stage - Registry key, which gives the default endpoint.
 * @param input - Model input.
 * @param ctx - Stage context. `ctx.endpoint` overrides the registry (for the fallback).
 * @returns The stage output.
 * @throws FalStageError when fal fails or the result holds no image.
 */
export async function runImageModel(stage: FalStageKey, input: Record<string, unknown>, ctx: StageContext = {}): Promise<StageOutput> {
  const { endpoint: override, ...runContext } = ctx;
  const endpoint = override ?? MODELS[stage].endpoint;
  const result = await runFal<FalImageResult>(endpoint, input, runContext);
  const image = result.data.images?.[0];
  const url = image?.url;
  if (!url) throw new FalStageError(`${endpoint} returned no image for stage ${stage}`, { endpoint, requestId: result.requestId });
  return { url, model: endpoint, requestId: result.requestId, elapsedMs: result.elapsedMs, widthPx: image?.width, heightPx: image?.height };
}

/**
 * Run one model for a stage and return the video URL.
 *
 * @param stage - Registry key, which gives the default endpoint.
 * @param buildInput - Builds the input once the endpoint is known, because fallbacks differ.
 * @param ctx - Stage context. `ctx.endpoint` overrides the registry.
 * @returns The stage output.
 * @throws FalStageError when fal fails or the result holds no video.
 */
export async function runVideoModel(
  stage: FalStageKey,
  buildInput: (endpoint: string) => Record<string, unknown>,
  ctx: StageContext = {},
): Promise<StageOutput> {
  const { endpoint: override, ...runContext } = ctx;
  const endpoint = override ?? MODELS[stage].endpoint;
  const result = await runFal<FalVideoResult>(endpoint, buildInput(endpoint), runContext);
  const url = result.data.video?.url;
  if (!url) throw new FalStageError(`${endpoint} returned no video for stage ${stage}`, { endpoint, requestId: result.requestId });
  return { url, model: endpoint, requestId: result.requestId, elapsedMs: result.elapsedMs, durationS: result.data.duration ?? null };
}

/**
 * Input for the panorama upscaler (SeedVR2).
 *
 * @param imageUrl - The picture to enlarge.
 * @param factor - Enlargement, 1 to 10. The panorama uses PANORAMA_UPSCALE_FACTOR.
 * @returns Input for fal-ai/seedvr/upscale/image: a plain multiplication of both sides.
 */
export function buildUpscaleInput(imageUrl: string, factor: number): Record<string, unknown> {
  return { image_url: imageUrl, upscale_mode: 'factor', upscale_factor: factor };
}

/**
 * Run the upscaler and return the enlarged image's URL. Cost: $0.001 per output megapixel (about $0.02
 * for the panorama) and about 35 s.
 *
 * @param imageUrl - The picture to enlarge.
 * @param factor - Enlargement factor.
 * @param ctx - Stage context. `ctx.endpoint` overrides the registry (for the fallback).
 * @returns The stage output, with the model and timing.
 * @throws FalStageError when fal fails or returns no image.
 */
export async function runUpscale(imageUrl: string, factor: number, ctx: StageContext = {}): Promise<StageOutput> {
  const { endpoint: override, ...runContext } = ctx;
  const endpoint = override ?? MODELS.panorama_upscale.endpoint;
  const result = await runFal<{ image?: { url?: string } }>(endpoint, buildUpscaleInput(imageUrl, factor), runContext);
  const url = result.data.image?.url;
  if (!url) throw new FalStageError(`${endpoint} returned no image for the panorama upscale`, { endpoint, requestId: result.requestId });
  return { url, model: endpoint, requestId: result.requestId, elapsedMs: result.elapsedMs };
}
