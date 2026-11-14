/**
 * A2-05 talking-guide spike, part 1. Owner: Agent 2 (Studio). Implements MASTER.md 5.4 (guide video) and task A2-05.
 *
 * Steps:
 *   1. guide_frame: fal-ai/nano-banana-pro/edit with [scene, headshot] from A2-02 ($0.15).
 *   2. A ~10 s narration clip in a provisional voice (Eleven v4, Lily, about $0.01). Lip-sync quality should not
 *      depend on the voice, so this does not wait for the A2-04 decision.
 *   3. In parallel, the 10 s bake-off on the guide frame:
 *        kling-standard  fal-ai/kling-video/ai-avatar/v2/standard  $0.0562/s, about $0.56
 *        fabric-480p     veed/fabric-1.0 at 480p                   $0.08/s,   about $0.80
 *   The full 45 s clip (part 2) runs after a voice is chosen.
 *
 * Usage: npm run talk            (all steps)
 *        npm run talk -- --frame-only
 *        npm run talk -- --use <frameUrl> <audioUrl>   (skip steps 1-2, reuse an earlier frame and clip)
 */
import { uploadFile, timedFal, download, writeRecord, failAndExit, type FalImage } from './lib.js';
import { buildGuideFramePrompt, type GuideLike } from './prompts.js';

const YEAR = 1880;
const ENDPOINTS = {
  guideFrame: 'fal-ai/nano-banana-pro/edit',
  tts: 'elevenlabs/tts/eleven-v4',
  klingStandard: 'fal-ai/kling-video/ai-avatar/v2/standard',
  fabric: 'veed/fabric-1.0',
} as const;

/** Same stand-in guide as scene-spike.ts. */
const GUIDE: GuideLike = {
  name: 'Martha Hale',
  role: 'flower seller on Exhibition Road',
  appearance:
    'A woman in her late thirties, slim, rosy cheeks, brown hair pinned up under a small dark straw bonnet, plain dark green wool dress with a high collar, a knitted grey shawl over her shoulders.',
};

/** First two sentences of the A2-04 script: about 10 s spoken. */
const SHORT_SCRIPT =
  "Good afternoon, dearie! I'm Martha Hale, and I sell flowers on this very corner. Violets in spring, lavender come summer, a penny a bunch.";

/** Motion prompt for the avatar models that take one. Keeps the body calm so the scene does not warp. */
const TALK_PROMPT =
  'The woman talks warmly to the camera with natural lip movement, small nods and gentle hand gestures. The camera is still. The street behind her stays still apart from slight natural movement.';

interface VideoResult {
  video: FalImage;
  duration?: number;
}

/** Run the guide frame, then (unless --frame-only) the short narration and both avatar models. */
async function main(): Promise<void> {
  const frameOnly = process.argv.includes('--frame-only');
  const useIndex = process.argv.indexOf('--use');
  if (useIndex >= 0) {
    // Reuse: wrap the given URLs in the same shapes the generating branch produces.
    const [frameUrl, audioUrl] = process.argv.slice(useIndex + 1, useIndex + 3);
    await runTalk({ url: frameUrl }, { url: audioUrl }, { reused: { frameUrl, audioUrl } });
    return;
  }
  const [sceneUrl, headshotUrl] = await Promise.all([uploadFile('out/scene-1880-pro.jpg'), uploadFile('out/scene-1880-headshot.jpg')]);

  const [frame, narration] = await Promise.all([
    timedFal<{ images: FalImage[] }>('guide_frame', ENDPOINTS.guideFrame, {
      prompt: buildGuideFramePrompt(GUIDE, YEAR),
      image_urls: [sceneUrl, headshotUrl],
      aspect_ratio: '16:9',
      resolution: '1K',
      output_format: 'jpeg',
    }),
    timedFal<{ audio: FalImage }>('narration-10s', ENDPOINTS.tts, { text: SHORT_SCRIPT, voice: 'Lily', stability: 0.4, language_code: 'en' }),
  ]);
  const frameImage = frame.data.images[0];
  await download(frameImage.url, `guide-frame-${YEAR}.jpg`);
  await download(narration.data.audio.url, `narration-10s.mp3`);
  console.log(`guide frame ${frameImage.width}x${frameImage.height}: ${frameImage.url}`);
  console.log(`narration: ${narration.data.audio.url}`);
  const record: Record<string, unknown> = { frame, narration, sceneUrl, headshotUrl };
  if (frameOnly) {
    await writeRecord(`talk-spike-frame.json`, record);
    return;
  }
  await runTalk(frameImage, narration.data.audio, record);
}

/** Step 3: both avatar models on one frame and one clip, in parallel. Writes out/talk-spike-10s.json. */
async function runTalk(frameImage: FalImage, audio: FalImage, record: Record<string, unknown>): Promise<void> {
  {
    const runs = await Promise.allSettled([
      timedFal<VideoResult>('kling-standard', ENDPOINTS.klingStandard, {
        image_url: frameImage.url,
        audio_url: audio.url,
        prompt: TALK_PROMPT,
      }),
      timedFal<VideoResult>('fabric-480p', ENDPOINTS.fabric, {
        image_url: frameImage.url,
        audio_url: audio.url,
        resolution: '480p',
      }),
    ]);
    for (const [name, run] of [['kling-standard', runs[0]], ['fabric-480p', runs[1]]] as const) {
      if (run.status === 'fulfilled') {
        await download(run.value.data.video.url, `talk-10s-${name}.mp4`);
        console.log(`${name}: ${run.value.elapsedMs / 1000} s, duration ${run.value.data.duration ?? '?'} s, ${run.value.data.video.url}`);
        record[name] = run.value;
      } else {
        const body = (run.reason as { body?: unknown }).body;
        console.error(`${name} failed:`, (run.reason as Error).message, body ? JSON.stringify(body) : '');
        record[name] = { error: (run.reason as Error).message, body };
      }
    }
  }
  await writeRecord(`talk-spike-10s.json`, record);
}

main().catch((error: unknown) => failAndExit('A2-05', error));
