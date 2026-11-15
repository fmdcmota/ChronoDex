/**
 * A2-14 stitch spike. Owner: Agent 2 (Studio). Joins two clips with fal-ai/ffmpeg-api/merge-videos and cuts a last frame
 * with fal-ai/ffmpeg-api/extract-frame, to find out what survives: audio, size, length.
 * Usage (from spikes/agent-2/): npm run stitch-spike. Cost: listed at $0.00 per compute second for merge, $0.0002 per second of
 * video for extract-frame.
 */
import { readFile } from 'node:fs/promises';
import { timedFal, download, failAndExit, type FalImage } from './lib.js';

/** Run both calls and save what comes back. */
async function main(): Promise<void> {
  const { walk, talk } = JSON.parse(await readFile('out/clip-urls.json', 'utf8')) as { walk: string; talk: string };
  const merged = await timedFal<{ video: FalImage; metadata?: unknown }>('merge', 'fal-ai/ffmpeg-api/merge-videos', {
    video_urls: [walk, talk],
    resolution: { width: 1280, height: 720 },
    target_fps: 24,
  });
  console.log(JSON.stringify(merged.data.metadata ?? {}, null, 1).slice(0, 1500));
  await download(merged.data.video.url, 'stitch-test.mp4');
  console.log('merged video:', merged.data.video.url);
  const frame = await timedFal<{ images: FalImage[] }>('frame', 'fal-ai/ffmpeg-api/extract-frame', { video_url: talk, frame_type: 'last' });
  await download(frame.data.images[0].url, 'talk-last-frame.jpg');
  console.log('last frame:', frame.data.images[0].width, 'x', frame.data.images[0].height);
}

main().catch((error: unknown) => failAndExit('stitch', error));
