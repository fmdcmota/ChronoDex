/**
 * A2-06 walk-on spike. Owner: Agent 2 (Studio). Implements MASTER.md 5.1 (walk_on) and task A2-06.
 *
 * kling/v4/image-to-video from the empty A2-02 scene (start) to the A2-05 guide frame (end), 5 s at 720p.
 * Cost: $0.157 per second at 720p (F-008), so about $0.79. Always pass resolution "720p": the default is 1080p.
 *
 * Usage: npm run walk -- <sceneUrl> <guideFrameUrl>
 */
import { timedFal, download, writeRecord, failAndExit, type FalImage } from './lib.js';
import { buildWalkPrompt, type GuideLike } from './prompts.js';

const KLING_I2V = 'kling/v4/image-to-video';
/** Whole seconds, 3 to 30 (schema). 5 s is enough to cross the pavement without dawdling. */
const WALK_DURATION_S = 5;

/** Same stand-in guide as scene-spike.ts. */
const GUIDE: GuideLike = {
  name: 'Martha Hale',
  role: 'flower seller on Exhibition Road',
  appearance:
    'A woman in her late thirties, slim, rosy cheeks, brown hair pinned up under a small dark straw bonnet, plain dark green wool dress with a high collar, a knitted grey shawl over her shoulders.',
};

/** Make the walk_on clip and save it. */
async function main(): Promise<void> {
  const [sceneUrl, guideFrameUrl] = process.argv.slice(2);
  if (!sceneUrl || !guideFrameUrl) throw new Error('Usage: npm run walk -- <sceneUrl> <guideFrameUrl>');
  const prompt = buildWalkPrompt(GUIDE, 'on');
  console.log(prompt);
  const result = await timedFal<{ video: FalImage }>('walk_on', KLING_I2V, {
    start_image_url: sceneUrl,
    end_image_url: guideFrameUrl,
    prompt,
    duration: WALK_DURATION_S,
    resolution: '720p',
  });
  await download(result.data.video.url, 'walk-on-5s.mp4');
  console.log(`walk_on: ${result.data.video.url}`);
  await writeRecord('walk-spike.json', { prompt, sceneUrl, guideFrameUrl, result });
}

main().catch((error: unknown) => failAndExit('A2-06', error));
