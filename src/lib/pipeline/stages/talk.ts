/**
 * Stage `talk`: the guide, lip-synced to the narration, about 45 seconds.
 *
 * Owner: Agent 2 (Studio). Implements MASTER.md section 5.1 (stage talk), task A2-08.
 */
import { buildTalkInput, runVideoModel } from './inputs';
import { buildTalkPrompt } from './prompts';
import type { StageContext, StageOutput } from './types';

/**
 * Animate the guide frame with the narration.
 *
 * Model: MODELS.talk (Kling AI Avatar v2 standard; Fabric 1.0 is the fallback). The video lasts as
 * long as the audio. PROVISIONAL: the choice waits for a human to compare the two (A2-05).
 * Cost and time: Kling $0.0562 per second of video and about 226 s per 10 s clip, so a 45 s clip is
 * about $2.50 and 15 minutes. Fabric 480p is $0.08 per second and about 53 s per 10 s clip. The
 * maximum audio length is not stated by either model and a full 45 s clip has not been proven yet.
 * Pass `onPoll` in ctx (heartbeatJob) so the job lease is renewed during the long wait.
 * Side effects: one fal request. Writes nothing; the orchestrator stores the URL.
 *
 * @param input - The guide frame and the narration URLs.
 * @param input.guideFrameUrl - URL from the guide_frame stage.
 * @param input.narrationUrl - URL from the narration stage.
 * @param ctx - Resume id, callbacks and optional fallback endpoint.
 * @returns URL of the MP4 on fal's CDN, with the model and timing.
 * @throws FalStageError when fal rejects the request, the audio is refused or no video comes back.
 */
export async function runTalk(input: { guideFrameUrl: string; narrationUrl: string }, ctx: StageContext = {}): Promise<StageOutput> {
  return runVideoModel('talk', (endpoint) => buildTalkInput(endpoint, input.guideFrameUrl, input.narrationUrl, buildTalkPrompt()), ctx);
}
