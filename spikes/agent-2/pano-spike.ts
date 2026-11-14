/**
 * A2-03 panorama bake-off. Owner: Agent 2 (Studio). Implements MASTER.md 5.4 (panorama) and task A2-03.
 *
 * Routes, all started from the A2-02 scene (out/scene-1880-pro.jpg). Run `python -I make_canvases.py` first.
 *   a   fal-ai/hunyuan_world, image to panorama. No published schema (F-002), so the input is a guess and
 *       a validation error tells us the real fields. Reported ~$0.15.
 *   b1  fal-ai/nano-banana-pro/edit with an empty 2:1 grid as image 1 and the scene as image 2, aspect "auto".
 *   b2  fal-ai/nano-banana-pro/edit outpainting the scene pasted into the centre of a 2:1 grey canvas.
 *   c   fal-ai/nano-banana-pro/edit outpainting a 21:9 canvas (a cropped band, vFovDeg about 154).
 * Pro edits are $0.15 each at 2K (4K is double). About $0.60 for all four.
 *
 * Usage: npm run pano -- a b1 b2 c     (any subset; default is all)
 */
import { uploadFile, timedFal, download, writeRecord, failAndExit, type FalImage } from './lib.js';
import { buildPanoramaGridPrompt, buildPanoramaOutpaintPrompt } from './prompts.js';

const YEAR = 1880;
const PRO_EDIT = 'fal-ai/nano-banana-pro/edit';
const HUNYUAN = 'fal-ai/hunyuan_world';

/** Stand-in for SceneBrief.surroundings. Not researched; the Historian writes the real one. */
const SURROUNDINGS =
  'A wide Victorian street running north to south. Behind the viewer the street continues north between more ' +
  'white stucco terraces and red-brick buildings, with horse-drawn cabs and pedestrians. On both sides, tall ' +
  'four- and five-storey terraces with iron railings and gas lamps. Overcast grey London sky above, granite setts and York stone pavement below.';

interface ImageResult {
  images: FalImage[];
}

/** Run one route and return a record of it. */
async function runRoute(route: string, urls: Record<string, string>): Promise<Record<string, unknown>> {
  const common = { resolution: '2K', output_format: 'jpeg' };
  let endpoint: string;
  let input: Record<string, unknown>;
  switch (route) {
    case 'a':
      endpoint = HUNYUAN;
      input = { image_url: urls.scene, prompt: `The same Victorian street in ${YEAR}. ${SURROUNDINGS}` };
      break;
    case 'b1':
      endpoint = PRO_EDIT;
      input = { ...common, prompt: buildPanoramaGridPrompt(SURROUNDINGS, YEAR), image_urls: [urls.grid, urls.scene], aspect_ratio: 'auto' };
      break;
    case 'b2':
      endpoint = PRO_EDIT;
      input = { ...common, prompt: buildPanoramaOutpaintPrompt(SURROUNDINGS, YEAR, true), image_urls: [urls.canvas2x1], aspect_ratio: 'auto' };
      break;
    case 'c':
      endpoint = PRO_EDIT;
      input = { ...common, prompt: buildPanoramaOutpaintPrompt(SURROUNDINGS, YEAR, false), image_urls: [urls.canvas21x9], aspect_ratio: '21:9' };
      break;
    default:
      throw new Error(`Unknown route ${route}`);
  }
  try {
    const result = await timedFal<Record<string, unknown>>(route, endpoint, input);
    // Hunyuan's output shape is unknown, so print it raw and look for an image in the likely places.
    if (route === 'a') console.log('a raw output:', JSON.stringify(result.data, null, 2));
    const data = result.data as Partial<ImageResult> & { image?: FalImage; panorama?: FalImage };
    const image = data.images?.[0] ?? data.image ?? data.panorama;
    const saved = image ? await download(image.url, `pano-${YEAR}-${route}.jpg`) : null;
    console.log(`${route}: ${image?.width}x${image?.height} -> ${saved}`);
    return { route, endpoint, requestId: result.requestId, elapsedMs: result.elapsedMs, image, saved, data: result.data };
  } catch (error) {
    const body = (error as { body?: unknown }).body;
    console.error(`${route} failed:`, (error as Error).message, body ? JSON.stringify(body) : '');
    return { route, endpoint, error: (error as Error).message, body };
  }
}

/** Upload the inputs once, then run the chosen routes in parallel. */
async function main(): Promise<void> {
  const routes = process.argv.slice(2).length ? process.argv.slice(2) : ['a', 'b1', 'b2', 'c'];
  const [scene, grid, canvas2x1, canvas21x9] = await Promise.all([
    uploadFile('out/scene-1880-pro.jpg'),
    uploadFile('out/pano-layout-2x1.png'),
    uploadFile('out/pano-outpaint-2x1.png'),
    uploadFile('out/pano-outpaint-21x9.png'),
  ]);
  const urls = { scene, grid, canvas2x1, canvas21x9 };
  const records = await Promise.all(routes.map((route) => runRoute(route, urls)));
  await writeRecord(`pano-spike-${YEAR}-${routes.join('-')}.json`, { urls, records });
}

main().catch((error: unknown) => failAndExit('A2-03', error));
