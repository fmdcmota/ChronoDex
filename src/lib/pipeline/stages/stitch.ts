/**
 * Stage `stitch`: join the three guide clips into one file, when that can be done without losing anything.
 *
 * Owner: Agent 2 (Studio). Implements MASTER.md section 5.1 (stage stitch) and task A2-14.
 */
import { MODELS, runFal } from '@/lib/fal';
import { fetchBuffer } from './image';
import { inspectMp4, verifyStitch } from './video';
import type { StageContext, StageOutput } from './types';

/** Width and height every clip is scaled to. The walk clips come out 1280x716 and the talk clip 1280x720, and without an explicit size the merge uses the smallest of each. */
const STITCH_SIZE = { width: 1280, height: 720 } as const;

/** What a stitch attempt concluded. */
export interface StitchOutcome {
  /** The stitched file's URL when it passed every check, otherwise null: keep the three separate clips. */
  output: StageOutput | null;
  /** Why it was not used, or null when it was. */
  reason: string | null;
}

/**
 * Join the clips in order with fal's ffmpeg merge, then check the result before trusting it.
 *
 * Model: MODELS.stitch (fal-ai/ffmpeg-api/merge-videos, listed at $0). BLOCKED ON OUR KEY: every fal-ai/ffmpeg-api
 * endpoint answers 403 "You do not have permission to use this endpoint" when the job runs (found in A2-14, the
 * same as extract-frame in A2-05). So this currently always returns `output: null` with that reason, and the player
 * plays the three clips in order (a gap of about 20 ms on an iPhone, which is fine). When the human gets access
 * enabled it starts working with no code change.
 * Why check: the merge page says nothing about audio. A stitched video with no sound, or the wrong length, would
 * be worse than three clips with sound, so the file is downloaded and its MP4 boxes are read: it must have a video
 * track, an audio track, and a length within 1.5 s of the clips' total (video.ts).
 * Never throws: any failure becomes a null output and a reason, because stitching is optional.
 * Side effects: one fal request and one download of the merged file.
 *
 * @param input - The clips in play order and their total length.
 * @param input.clipUrls - walk_on, talk, walk_off URLs, in that order.
 * @param input.expectedDurationS - The sum of the clips' lengths, for the length check.
 * @param ctx - Resume id and callbacks. `ctx.endpoint` overrides the registry.
 * @returns The stitched file, or null with the reason.
 */
export async function runStitch(input: { clipUrls: string[]; expectedDurationS: number }, ctx: StageContext = {}): Promise<StitchOutcome> {
  const { endpoint: override, ...runContext } = ctx;
  const endpoint = override ?? MODELS.stitch.endpoint;
  try {
    const result = await runFal<{ video?: { url?: string } }>(endpoint, { video_urls: input.clipUrls, resolution: STITCH_SIZE }, runContext);
    const url = result.data.video?.url;
    if (!url) return { output: null, reason: 'the merge returned no video' };
    const verdict = verifyStitch(inspectMp4(await fetchBuffer(url)), input.expectedDurationS);
    if (!verdict.ok) return { output: null, reason: verdict.reason };
    return { output: { url, model: endpoint, requestId: result.requestId, elapsedMs: result.elapsedMs }, reason: null };
  } catch (error) {
    const status = (error as { status?: number | null }).status;
    const why = status === 403 ? 'fal refused the merge (403): the ffmpeg API is not enabled on this key' : error instanceof Error ? error.message : String(error);
    return { output: null, reason: why };
  }
}
