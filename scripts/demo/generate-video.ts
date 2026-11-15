/**
 * `scripts/demo/generate-video.ts`: make a demo era's guide video once and keep the clips in the repo.
 *
 * Owner: Agent 6 (demo assets). The video tier of MASTER.md section 5.1 for the demo set, run from the kept core
 * files so nobody ever pays for the same video twice and fal's 7-day CDN expiry never matters.
 *
 * Usage (repo root; FAL_KEY in .env.local; the era's core files must exist, see generate-demo.ts):
 *   npx tsx --env-file=.env.local scripts/demo/generate-video.ts queens-tower_1893
 *   add --redo guide_frame|walk_on|talk|walk_off (repeatable) to remake a piece
 *
 * Steps, with the pipeline's own stage functions (src/lib/pipeline/stages):
 *   guide_frame  the guide standing in the scene (image edit of scene + headshot)
 *   walk_on      empty scene -> guide frame, Kling 4.0 at 720p, 5 s
 *   talk         guide frame + narration -> lip-synced clip as long as the narration (Kling AI Avatar v2 standard)
 *   walk_off     guide frame -> empty scene, 5 s
 * Each file lands in `public/demo/<eraId>/` the moment it exists (guide_frame.jpg, walk_on.mp4, talk.mp4,
 * walk_off.mp4), and the Era in `data/demo/eras/<eraId>.json` gets `guideVideo` (three segments, no stitched file)
 * and `videoState: 'ready'`. Run load-demo.ts afterwards to put it in the database.
 * Cost and time: about $4.50 and 5 to 15 minutes (talk about $0.056 per second of narration, walks about $0.79 each).
 * A piece whose file exists is skipped, so a rerun after a failure pays only for what is missing.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { EraSchema, type EraId, type VideoSegment } from '@/lib/contracts';
import { uploadToFal, WALK_DURATION_S } from '@/lib/fal';
import { runGuideFrame, runTalk, runWalkOff, runWalkOn } from '@/lib/pipeline/stages';
import { stampDemoUrls } from './stamp-urls';
import { DEMO_ERA_IDS, demoAssetPath, demoEraFile, type DemoEraFile } from './demo-set';

/** The video-tier files kept per era. */
const VIDEO_FILES = { guide_frame: 'guide_frame.jpg', walk_on: 'walk_on.mp4', talk: 'talk.mp4', walk_off: 'walk_off.mp4' } as const;
/** A video-tier piece. */
type VideoPiece = keyof typeof VIDEO_FILES;

/**
 * Site URL and disk path of a kept video-tier file.
 *
 * @param eraId - The era.
 * @param piece - Which file.
 * @returns The `/demo/...` URL and the absolute path under `public/`.
 */
function videoFile(eraId: EraId, piece: VideoPiece): { url: string; file: string } {
  const url = `/demo/${eraId}/${VIDEO_FILES[piece]}`;
  return { url, file: path.join(process.cwd(), 'public', url) };
}

/**
 * Download a URL to a file.
 *
 * @param url - fal CDN URL.
 * @param file - Destination; folders are created.
 * @throws Error on an HTTP error.
 */
async function download(url: string, file: string): Promise<void> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`GET ${url}: HTTP ${response.status}`);
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, Buffer.from(await response.arrayBuffer()));
}

/**
 * Upload a kept file to fal storage (free) so a model can read it.
 *
 * @param file - Absolute path.
 * @param type - Its content type.
 * @returns A fal storage URL.
 */
function upload(file: string, type: string): Promise<string> {
  return uploadToFal(new Blob([new Uint8Array(readFileSync(file))], { type }));
}

/** Run the script. */
async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const eraId = args.find((a) => !a.startsWith('--') && !['guide_frame', 'walk_on', 'talk', 'walk_off'].includes(a));
  const redo = new Set(args.flatMap((a, i) => (a === '--redo' && args[i + 1] ? [args[i + 1]] : [])));
  if (!eraId || !DEMO_ERA_IDS.includes(eraId)) throw new Error(`Name a demo era: ${DEMO_ERA_IDS.join(', ')}`);
  if (!process.env.FAL_KEY) throw new Error('FAL_KEY is not set.');
  const demo = JSON.parse(readFileSync(demoEraFile(eraId), 'utf8')) as DemoEraFile;
  const guide = demo.era.guide;
  if (!guide || demo.era.state !== 'ready') throw new Error(`${eraId} has no finished core tier. Run generate-demo.ts first.`);
  const need = (piece: VideoPiece) => redo.has(piece) || !existsSync(videoFile(eraId, piece).file);
  const log = (msg: string) => console.log(`${eraId}: ${msg}`);
  const provenance = { ...demo.provenance };

  const sceneUrl = await upload(demoAssetPath(eraId, 'scene'), 'image/jpeg');
  let frameUrl: string;
  if (need('guide_frame')) {
    const headshotUrl = await upload(demoAssetPath(eraId, 'headshot'), 'image/jpeg');
    const out = await runGuideFrame({ sceneUrl, headshotUrl, guide, year: demo.era.year });
    await download(out.url, videoFile(eraId, 'guide_frame').file);
    provenance.guide_frame = { model: out.model, falUrl: out.url, seconds: Math.round(out.elapsedMs / 1000), check: out.check ?? null };
    log(`guide frame done in ${Math.round(out.elapsedMs / 1000)} s`);
    frameUrl = out.url;
  } else {
    frameUrl = await upload(videoFile(eraId, 'guide_frame').file, 'image/jpeg');
  }

  const walkInput = { sceneUrl, guideFrameUrl: frameUrl, guide };
  const durations: Partial<Record<VideoPiece, number>> = {};
  const clip = async (piece: 'walk_on' | 'talk' | 'walk_off', make: () => ReturnType<typeof runTalk>) => {
    if (!need(piece)) return;
    const out = await make();
    await download(out.url, videoFile(eraId, piece).file);
    durations[piece] = out.durationS ?? undefined;
    provenance[piece] = { model: out.model, falUrl: out.url, seconds: Math.round(out.elapsedMs / 1000) };
    log(`${piece} done in ${Math.round(out.elapsedMs / 1000)} s${out.durationS ? `, ${out.durationS} s long` : ''}`);
  };
  const results = await Promise.allSettled([
    clip('walk_on', () => runWalkOn(walkInput)),
    clip('talk', async () => runTalk({ guideFrameUrl: frameUrl, narrationUrl: await upload(demoAssetPath(eraId, 'narration'), 'audio/mpeg') })),
    clip('walk_off', () => runWalkOff(walkInput)),
  ]);
  const failures = results.flatMap((r) => (r.status === 'rejected' ? [String(r.reason instanceof Error ? r.reason.message : r.reason)] : []));

  const complete = (['walk_on', 'talk', 'walk_off'] as const).every((p) => existsSync(videoFile(eraId, p).file));
  const previous = demo.era.guideVideo?.segments ?? [];
  const lengthOf = (kind: 'walk_on' | 'talk' | 'walk_off', fallback: number) =>
    durations[kind] ?? previous.find((s) => s.kind === kind)?.durationS ?? fallback;
  const segments: VideoSegment[] = [
    { kind: 'walk_on', url: videoFile(eraId, 'walk_on').url, durationS: lengthOf('walk_on', WALK_DURATION_S) },
    { kind: 'talk', url: videoFile(eraId, 'talk').url, durationS: lengthOf('talk', 45) },
    { kind: 'walk_off', url: videoFile(eraId, 'walk_off').url, durationS: lengthOf('walk_off', WALK_DURATION_S) },
  ];
  const era = EraSchema.parse({
    ...demo.era,
    videoState: complete ? 'ready' : 'failed',
    guideVideo: complete ? { segments, stitchedUrl: null } : null,
    updatedAt: new Date().toISOString(),
  });
  writeFileSync(demoEraFile(eraId), `${JSON.stringify({ era, provenance }, null, 2)}\n`);
  stampDemoUrls(); // a remade clip gets a new URL, so no browser keeps the old one
  if (failures.length) throw new Error(failures.join('; '));
  log('guide video complete. Next: npx tsx --env-file=.env.local scripts/demo/load-demo.ts');
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
