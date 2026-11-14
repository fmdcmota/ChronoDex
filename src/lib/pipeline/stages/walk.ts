/**
 * Stages `walk_on` and `walk_off`: the guide walks into the scene and, after talking, out of it.
 *
 * Owner: Agent 2 (Studio). Implements MASTER.md section 5.1 (stages walk_on, walk_off), task A2-08.
 * One file for both because they differ only in which frame starts and which ends.
 */
import { buildWalkInput, runVideoModel } from './inputs';
import { buildWalkPrompt, type GuideLook } from './prompts';
import type { StageContext, StageOutput } from './types';

/** Inputs for a walk clip. */
export interface WalkInput {
  /** URL of the scene with nobody in it (the scene stage's output). */
  sceneUrl: string;
  /** URL of the guide standing in the scene (the guide_frame stage's output). */
  guideFrameUrl: string;
  /** The guide's looks, for the prompt. */
  guide: GuideLook;
}

/**
 * Make the clip of the guide walking into the scene: empty scene first, guide frame last.
 *
 * Model: MODELS.walk_on (Kling 4.0 image to video, 5 s, 720p).
 * Cost and time: about $0.79 and 163 s (A2-06). The output is 1280x716, not 1280x720, so the stitch
 * stage must scale every clip to one size.
 * Side effects: one fal request. Writes nothing; the orchestrator stores the URL.
 *
 * @param input - Scene, guide frame and guide.
 * @param ctx - Resume id, callbacks and optional fallback endpoint.
 * @returns URL of the MP4 on fal's CDN, with the model and timing.
 * @throws FalStageError when fal rejects the request or returns no video.
 */
export async function runWalkOn(input: WalkInput, ctx: StageContext = {}): Promise<StageOutput> {
  const prompt = buildWalkPrompt(input.guide, 'on');
  return runVideoModel('walk_on', (endpoint) => buildWalkInput(endpoint, prompt, input.sceneUrl, input.guideFrameUrl), ctx);
}

/**
 * Make the clip of the guide walking out of the scene: guide frame first, empty scene last.
 *
 * Model: MODELS.walk_off (same as walk_on). Cost and time: about $0.79 and 163 s.
 * It starts from the guide frame, which is also the talk clip's first frame, so the cut from talk to
 * walk_off can jump slightly. A cleaner start would be the talk clip's last frame, but
 * fal-ai/ffmpeg-api/extract-frame is refused (403) on our key.
 * Side effects: one fal request. Writes nothing.
 *
 * @param input - Scene, guide frame and guide.
 * @param ctx - Resume id, callbacks and optional fallback endpoint.
 * @returns URL of the MP4 on fal's CDN, with the model and timing.
 * @throws FalStageError when fal rejects the request or returns no video.
 */
export async function runWalkOff(input: WalkInput, ctx: StageContext = {}): Promise<StageOutput> {
  const prompt = buildWalkPrompt(input.guide, 'off');
  return runVideoModel('walk_off', (endpoint) => buildWalkInput(endpoint, prompt, input.guideFrameUrl, input.sceneUrl), ctx);
}
