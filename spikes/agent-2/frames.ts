/**
 * Pull first, middle and last frames out of videos with fal's ffmpeg API, so a spike video can be judged as stills
 * (there is no local ffmpeg). Owner: Agent 2. Also proves fal-ai/ffmpeg-api/extract-frame for the walk_off stage.
 * Cost: $0.0002 per second of video (schema page), so well under a cent per call.
 *
 * Usage: npm run frames -- <name> <videoUrl> [<name> <videoUrl> ...]   -> out/frames/<name>-<first|middle|last>.jpg
 */
import { timedFal, download, failAndExit, type FalImage } from './lib.js';

const EXTRACT_FRAME = 'fal-ai/ffmpeg-api/extract-frame';
const FRAME_TYPES = ['first', 'middle', 'last'] as const;

/** Extract all three frames of every named video given on the command line. */
async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const jobs: Promise<void>[] = [];
  for (let i = 0; i + 1 < args.length; i += 2) {
    const [name, videoUrl] = [args[i], args[i + 1]];
    for (const frameType of FRAME_TYPES) {
      jobs.push(
        timedFal<{ images: FalImage[] }>(`${name} ${frameType}`, EXTRACT_FRAME, { video_url: videoUrl, frame_type: frameType }).then(async (result) => {
          const image = result.data.images[0];
          await download(image.url, `frames/${name}-${frameType}.jpg`);
          console.log(`${name} ${frameType}: ${image.width}x${image.height} ${image.url}`);
        }),
      );
    }
  }
  await Promise.all(jobs);
}

main().catch((error: unknown) => failAndExit('frames', error));
