/**
 * The model registry: the only place in src/ that names a fal endpoint.
 *
 * Owner: Agent 2 (Studio). Implements MASTER.md section 5.3 rule 3 ("one registry"), task A2-07.
 * Every row mirrors the "Chosen models" table in notebook/agent-2.md, which records how each
 * choice was made (spikes in spikes/agent-2/). When a bake-off result changes, change the notebook
 * table and this file in the same commit. A test fails if an endpoint id appears twice by mistake.
 *
 * Prices are fal list prices read on 14 Nov 2026 and may change. Times are measured on one
 * request each, from the spikes, and vary with fal's load.
 */
import type { StageKey } from '@/lib/contracts';

/** Stages that call fal. `brief` is Claude (the Historian) and `stitch` is chosen in A2-14. */
export type FalStageKey = Exclude<StageKey, 'brief'> | 'chat_speech' | 'speech_to_text';

/** One stage's model choice. */
export interface ModelChoice {
  /** fal endpoint id, passed to runFal. */
  endpoint: string;
  /** Endpoint to try instead when the primary is down or retired, or null when none is proven. */
  fallback: string | null;
  /** List price in dollars for one typical call, or null when priced per token or per second. */
  typicalCostUsd: number | null;
  /** Measured wall-clock seconds for one call in the spikes, or null when not measured. */
  typicalSeconds: number | null;
  /** Why this model, in one line, and where the evidence is. */
  note: string;
}

/** Image size and aspect ratio sent to the image models. MASTER.md assumption A7: always 16:9. */
export const IMAGE_ASPECT_RATIO = '16:9';
/** Resolution for every still. 1K gave 1376x768, which is enough for the scene and the guide frame. */
export const IMAGE_RESOLUTION = '1K';
/** Resolution for the panorama source. 2K gave 2912x1440, then resized to exactly 2:1 (A2-03). */
export const PANORAMA_RESOLUTION = '2K';
/** Walk clips: always 720p, because the default is 1080p at 50% more cost (F-008). */
export const WALK_RESOLUTION = '720p';
/** Whole seconds, 3 to 30 per the schema. 5 s crosses the pavement without dawdling (A2-06). */
export const WALK_DURATION_S = 5;

/** Endpoint per stage. Keys are the pipeline's stage keys plus the two voice routes. */
export const MODELS: Record<FalStageKey, ModelChoice> = {
  scene: {
    endpoint: 'fal-ai/nano-banana-pro/edit',
    fallback: 'google/nano-banana-2.1/edit',
    typicalCostUsd: 0.15,
    typicalSeconds: 20.6,
    note: 'A2-02: Pro keeps the camera framing almost exactly; 2.1 shifts and zooms the scene.',
  },
  panorama: {
    endpoint: 'fal-ai/nano-banana-pro/edit',
    fallback: null,
    typicalCostUsd: 0.15,
    typicalSeconds: 27,
    note: 'A2-03 route b2: outpaint the scene pasted in a grey 2:1 canvas. fal-ai/hunyuan_world is listed but not served.',
  },
  headshot: {
    endpoint: 'google/nano-banana-2.1',
    fallback: 'fal-ai/nano-banana-pro',
    typicalCostUsd: null,
    typicalSeconds: 18.1,
    note: 'A2-02: clean, period-correct portrait. Token priced. The fallback is untested.',
  },
  narration: {
    endpoint: 'elevenlabs/tts/eleven-v4',
    fallback: 'google/gemini-3.8-flash-tts',
    typicalCostUsd: 0.05,
    typicalSeconds: 12,
    note: 'A2-04: provisional until a human has listened. $0.08 per 1,000 characters.',
  },
  chat_speech: {
    endpoint: 'elevenlabs/tts/eleven-v4-turbo',
    fallback: 'elevenlabs/tts/eleven-v4',
    typicalCostUsd: 0.01,
    typicalSeconds: null,
    note: 'Same voice names as eleven-v4, so the guide sounds the same in chat. $0.04 per 1,000 characters. Not yet timed.',
  },
  speech_to_text: {
    endpoint: 'fal-ai/elevenlabs/speech-to-text/scribe-v2',
    fallback: null,
    typicalCostUsd: 0.001,
    typicalSeconds: 3,
    note: 'A2-04: accepted MP3 and 24 kHz WAV. Phone recordings (webm, m4a) still to be tested. $0.008 per minute.',
  },
  guide_frame: {
    endpoint: 'fal-ai/nano-banana-pro/edit',
    fallback: 'google/nano-banana-2.1/edit',
    typicalCostUsd: 0.15,
    typicalSeconds: 20,
    note: 'A2-05: [scene, headshot] as references; the prompt must ask for a waist-up close-up or the face is too small to lip-sync.',
  },
  talk: {
    endpoint: 'fal-ai/kling-video/ai-avatar/v2/standard',
    fallback: 'veed/fabric-1.0',
    typicalCostUsd: null,
    typicalSeconds: 226,
    note: 'A2-05: provisional until a human has watched. Kling: 226 s and $0.0562/s per 10 s clip. Fabric 480p: 53 s, $0.08/s.',
  },
  walk_on: {
    endpoint: 'kling/v4/image-to-video',
    fallback: 'blackforestlabs/flux-3/first-last-frame-to-video',
    typicalCostUsd: 0.79,
    typicalSeconds: 163,
    note: 'A2-06: 5 s, 720p, empty scene to guide frame. Output is 1280x716, so scale before stitching.',
  },
  walk_off: {
    endpoint: 'kling/v4/image-to-video',
    fallback: 'blackforestlabs/flux-3/first-last-frame-to-video',
    typicalCostUsd: 0.79,
    typicalSeconds: 163,
    note: 'Same model as walk_on, run from the guide frame back to the empty scene. fal-ai/ffmpeg-api/extract-frame is 403 on our key, so the start frame is guide_frame, not the last frame of talk.',
  },
  stitch: {
    endpoint: 'fal-ai/ffmpeg-api/merge-videos',
    fallback: null,
    typicalCostUsd: 0,
    typicalSeconds: null,
    note: 'Not tried yet (A2-14). It uses the smallest input size, and whether it keeps audio is unknown.',
  },
};
