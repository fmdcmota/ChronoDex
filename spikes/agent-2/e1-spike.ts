/**
 * Experiment E1 (A2-j, notebook/agent-4-panorama-plan.md section 2 item 8): one picture instead of two.
 * Owner: Agent 2 (Studio).
 *
 * Today: scene ($0.15, re-dates the present-day photo) then panorama ($0.15, paints a 2:1 canvas around the scene).
 * E1: paste the PRESENT-DAY reference photo into the 2:1 canvas and ask for both at once: re-date the middle and paint
 * the rest. The era's scene is then cut out of the middle. One paid picture and one check instead of two.
 * Compared against the real two-step result for Queen's Tower 1893 (spikes/agent-2/out/f1-*.jpg).
 *
 * Usage (from spikes/agent-2/): npx tsx e1-spike.ts. Cost: about $0.15 plus a $0.0125 critic call.
 */
import sharp from 'sharp';
import { readFile, writeFile } from 'node:fs/promises';
import { uploadFile, timedFal, failAndExit, type FalImage } from './lib.js';
import { buildPanoramaCanvas, CANVAS_HEIGHT_PX, CANVAS_WIDTH_PX, SCENE_WIDTH_FRACTION } from '../../src/lib/pipeline/stages/image.js';
import { buildPanoramaPrompt, buildScenePrompt } from '../../src/lib/pipeline/stages/prompts.js';
import { checkPanorama } from '../../src/lib/pipeline/stages/critic.js';
import { buildPanoramaCheckPrompt } from '../../src/lib/pipeline/stages/prompts.js';

const OUT = 'out/e1';
const HORIZON = 0.55;

/** Run the experiment once. */
async function main(): Promise<void> {
  const era = JSON.parse(await readFile('out/f1-era.json', 'utf8'));
  const brief = era.sceneBrief;
  const year = era.year as number;
  const reference = await readFile('../../public/reference/queens-tower.jpg');
  const canvas = await buildPanoramaCanvas(reference, { horizonFraction: HORIZON, featherPx: 90 });
  await writeFile(`${OUT}-canvas.png`, canvas);
  const canvasUrl = await uploadFile(`${OUT}-canvas.png`);

  // One prompt that does both jobs: the scene's change list for the middle, the panorama's rules for the rest.
  const prompt = [
    `This image has a present-day photograph in its middle, surrounded by flat grey. Make the whole image one full 360 by 180 degree equirectangular panorama photograph of this place in the year ${year}.`,
    'FIRST, the middle photograph: change it to the same view in that year, following these instructions.',
    buildScenePrompt(brief, year, { look: 'colour' }),
    'SECOND, the grey: paint the rest of the panorama around it, following these instructions.',
    buildPanoramaPrompt(brief.surroundings, brief.changes.notYetBuilt, year, { look: 'colour' }),
  ].join('\n\n');
  await writeFile(`${OUT}-prompt.txt`, prompt);

  const result = await timedFal<{ images: FalImage[] }>('e1', 'fal-ai/nano-banana-pro/edit', { prompt, image_urls: [canvasUrl], aspect_ratio: 'auto', resolution: '2K', output_format: 'jpeg' });
  const image = result.data.images[0];
  const bytes = Buffer.from(await (await fetch(image.url)).arrayBuffer());
  const pano = await sharp(bytes).resize(2880, 1440, { fit: 'fill' }).jpeg({ quality: 90 }).toBuffer();
  await writeFile(`${OUT}-panorama.jpg`, pano);

  // Cut the scene out where the reference was pasted, scaled to the output, then widen to 16:9 around its centre.
  const scale = 2880 / CANVAS_WIDTH_PX;
  const pastedW = Math.round(CANVAS_WIDTH_PX * SCENE_WIDTH_FRACTION);
  const pastedH = Math.round((pastedW * 900) / 1600);
  const top = Math.round((CANVAS_HEIGHT_PX / 2 - HORIZON * pastedH) * scale);
  const width = Math.round(pastedW * scale);
  const height = Math.round((width * 9) / 16);
  const left = Math.round((2880 - width) / 2);
  await sharp(pano).extract({ left, top, width, height }).resize(1376, 774).jpeg({ quality: 90 }).toFile(`${OUT}-scene.jpg`);

  const critic = await checkPanorama(image.url, buildPanoramaCheckPrompt(year));
  console.log(JSON.stringify({ seconds: result.elapsedMs / 1000, requestId: result.requestId, size: `${image.width}x${image.height}`, criticPassed: critic.passed, projection: critic.raw?.projection, problems: critic.problems, criticUsd: critic.costUsd }, null, 1));
}

main().catch((error: unknown) => failAndExit('E1', error));
