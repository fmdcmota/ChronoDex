/**
 * A2-02 scene spike. Owner: Agent 2 (Studio). Implements MASTER.md section 11, task A2-02, and 5.2 rows 1-3.
 *
 * Runs the same structured scene prompt through both candidate edit models, side by side, on the same photo,
 * then makes one guide headshot. Outputs go to out/ for judging by eye.
 *
 * Usage: npm run scene [-- path/to/photo.jpg]
 *
 * External calls, all through lib.ts:
 *   - 1 upload (free)
 *   - google/nano-banana-2.1/edit, 1K, 16:9 (token-priced, see notebook)
 *   - fal-ai/nano-banana-pro/edit, 1K, 16:9 ($0.15 per image, schema page)
 *   - google/nano-banana-2.1 text to image, 1K, 1:1 (token-priced)
 * About $0.35 in total.
 */
import { uploadFile, timedFal, download, writeRecord, failAndExit, type FalImage } from './lib.js';
import { buildScenePrompt, buildHeadshotPrompt, type SceneBriefLike, type GuideLike } from './prompts.js';

/** Candidate endpoints, from MASTER.md 5.2. */
const ENDPOINTS = {
  flash: 'google/nano-banana-2.1/edit',
  pro: 'fal-ai/nano-banana-pro/edit',
  headshot: 'google/nano-banana-2.1',
} as const;

/** Year for the spike. Illustrative only: the Historian picks and researches the real demo years. */
const YEAR = 1880;

/**
 * Hand-written stand-in for a Historian SceneBrief for input/test.jpg (Exhibition Road looking south).
 * NOT researched. It exercises the prompt structure; accuracy is A1-11's job.
 */
const BRIEF: SceneBriefLike = {
  description:
    'A broad, newly laid-out Victorian street running south, lined with tall stucco terraces and red-brick institutional buildings, busy with horse-drawn traffic.',
  changes: {
    persists: [
      'the white stucco terrace with columned porches and black iron railings on the left',
      'the line of the street, the pavement on the left and the trees in the far distance',
    ],
    altered: [
      'the road surface becomes compacted gravel and granite setts with horse droppings, no road markings',
      'street lights become black cast-iron gas lamps on short posts',
      'the pavement becomes large York stone flags',
    ],
    notYetBuilt: [
      'the glass and white steel college frontage on the right',
      'the concrete and glass office blocks in the distance',
      'all cars, vans, coaches, bicycles, traffic signs, bollards and yellow lines',
      'the tall modern street lamp in the foreground',
    ],
    gone: ['a row of four-storey red-brick and stone Victorian buildings with chimneys on the right, set back behind railings'],
  },
};

/** Hand-written stand-in for a Historian Guide. Fictional, as A2 requires. */
const GUIDE: GuideLike = {
  name: 'Martha Hale',
  role: 'flower seller on Exhibition Road',
  appearance:
    'A woman in her late thirties, slim, rosy cheeks, brown hair pinned up under a small dark straw bonnet, plain dark green wool dress with a high collar, a knitted grey shawl over her shoulders.',
};

/** Shape of every image model's result in this spike (checked in A2-01 and the schema pages). */
interface ImageResult {
  images: FalImage[];
  description: string;
}

/** Run all three calls (the two edits in parallel), save images and a JSON record. */
async function main(): Promise<void> {
  const inputPath = process.argv[2] ?? 'input/test.jpg';
  const imageUrl = await uploadFile(inputPath);
  console.log(`Uploaded ${inputPath}: ${imageUrl}`);

  const scenePrompt = buildScenePrompt(BRIEF, YEAR);
  const headshotPrompt = buildHeadshotPrompt(GUIDE, YEAR);
  console.log(`\nScene prompt:\n${scenePrompt}\n`);

  const sceneInput = { prompt: scenePrompt, image_urls: [imageUrl], aspect_ratio: '16:9', resolution: '1K', output_format: 'jpeg' };
  // The two edits and the headshot are independent, so all three run at once.
  const [flash, pro, headshot] = await Promise.all([
    timedFal<ImageResult>('flash', ENDPOINTS.flash, sceneInput),
    timedFal<ImageResult>('pro', ENDPOINTS.pro, sceneInput),
    timedFal<ImageResult>('headshot', ENDPOINTS.headshot, {
      prompt: headshotPrompt,
      aspect_ratio: '1:1',
      resolution: '1K',
      output_format: 'jpeg',
    }),
  ]);

  const saved: Record<string, string> = {};
  for (const [name, result] of Object.entries({ flash, pro, headshot })) {
    const image = result.data.images[0];
    if (!image) throw new Error(`${name}: no image in result`);
    saved[name] = await download(image.url, `scene-${YEAR}-${name}.jpg`);
    console.log(`${name}: ${image.width}x${image.height} -> ${saved[name]}`);
  }

  await writeRecord(`scene-spike-${YEAR}.json`, {
    year: YEAR,
    scenePrompt,
    headshotPrompt,
    results: { flash, pro, headshot },
    saved,
  });
}

main().catch((error: unknown) => failAndExit('A2-02', error));
