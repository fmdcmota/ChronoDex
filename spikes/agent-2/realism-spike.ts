/**
 * Realism bake-off for Queen's Tower 1893. Owner: Agent 2 (Studio). Human-assigned after phone test round 1
 * ("the AI panoramic 360 reconstruction is very unrealistic"). notebook/agent-2.md has the findings.
 *
 * Question: what makes the scene and the 360 panorama look like a real photograph of the year?
 * Levers tried: (a) a period-specific, anti-CGI prompt, (b) real period photographs as extra reference
 * images, (c) a monochrome versus a colour look, (d) upscaling. Each variant is one fal call at about $0.15.
 *
 * Inputs (all openly licensed, from Wikimedia Commons; never Google imagery):
 *   base       present-day Queen's Tower with the modern library (CC BY-SA 4.0), cropped to 16:9
 *   refs       the Imperial Institute in the 1890s (CC0 Rijksmuseum; two public-domain prints)
 *
 * Usage (from spikes/agent-2/):
 *   npm run realism -- prep                      crop, upload, write out/realism/urls.json  (free)
 *   npm run realism -- scenes                    three scene variants                        (about $0.45)
 *   npm run realism -- pano <name> <scene> <mode>  one panorama from out/realism/<scene>.jpg
 *        mode: old | new | new-ref | mono-ref
 *   npm run realism -- upscale <image> [factor]  SeedVR2 upscale of out/realism/<image>.jpg ($0.001 per MP)
 */
import sharp from 'sharp';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { uploadFile, timedFal, download, failAndExit, type FalImage } from './lib.js';
import * as BEFORE from './prompts-before-realism.js';
import * as NOW from '../../src/lib/pipeline/stages/prompts.js';
import { buildPanoramaCanvas } from '../../src/lib/pipeline/stages/image.js';

const DIR = 'out/realism';
const EDIT = 'fal-ai/nano-banana-pro/edit';
const UPSCALE = 'fal-ai/seedvr/upscale/image';
const YEAR = 1893;
/** Nano Banana Pro is $0.15 per image at 1K and 2K, double at 4K (schema page). */
const COST_PER_IMAGE_USD = 0.15;

/**
 * Stand-in for a Historian brief, written by looking at the real archive photographs of the Institute.
 * NOT researched by the Historian: it only has to be concrete and true to the photographs.
 */
const BRIEF: NOW.SceneChanges & { surroundings: string } = {
  description:
    'A vast pale-stone and buff-terracotta Renaissance-style building with red-brick bands, many shaped gables, domed corner turrets and arched ground-floor windows, a tall central tower topped with a domed lantern, seen across a broad kerbed road with gas lamps, a horse-drawn van and men in top hats on the pavement.',
  changes: {
    persists: ['the tall central tower with its domed lantern'],
    altered: [
      'the ground becomes a broad kerbed road of granite setts and packed gravel with horse droppings and wheel ruts',
      'street lamps become gas lamps on cast-iron posts',
    ],
    notYetBuilt: [
      'the modern concrete and glass Central Library and every other post-war college block',
      'modern street lamps, benches, signs, bollards, bicycles and cars',
    ],
    gone: [
      'the long Imperial Institute building: pale Portland-stone and buff terracotta wings with red-brick bands, shaped gables, domed corner turrets and arched windows, standing right behind a low railing',
    ],
  },
  surroundings:
    'Behind the viewer a broad newly laid road lined with stucco and red-brick terraced houses of South Kensington. To the sides, more pale-stone museum buildings, some still in scaffolding, open ground, gas lamps along the kerb, horse-drawn cabs and delivery vans, a few pedestrians in dark Victorian dress, a hazy smoky overcast sky.',
};

/** Reference photographs to crop (fractions of the width and height that exclude the card mount and captions). */
const REFS: { name: string; src: string; left: number; top: number; width: number; height: number }[] = [
  { name: 'ref-rijksmuseum', src: 'gezicht-op-het-imperial-institute-te-lon', left: 0.2, top: 0.205, width: 0.59, height: 0.59 },
  { name: 'ref-postcard1903', src: '1903-11-04-front-imperial-institute-lond', left: 0.02, top: 0.03, width: 0.96, height: 0.72 },
  { name: 'ref-jubilee', src: 'commonwealth-institute-qe1-35', left: 0.01, top: 0.01, width: 0.98, height: 0.95 },
];

interface ImageResult {
  images: FalImage[];
}

/** Read the uploaded URLs written by `prep`. */
async function urls(): Promise<Record<string, string>> {
  return JSON.parse(await readFile(`${DIR}/urls.json`, 'utf8')) as Record<string, string>;
}

/** Append one line to the cost ledger. */
async function ledger(entry: Record<string, unknown>): Promise<void> {
  let all: unknown[] = [];
  try {
    all = JSON.parse(await readFile(`${DIR}/ledger.json`, 'utf8')) as unknown[];
  } catch {
    all = [];
  }
  all.push({ at: new Date().toISOString(), ...entry });
  await writeFile(`${DIR}/ledger.json`, JSON.stringify(all, null, 1));
}

/** Crop the base and the references, upload them, write urls.json. Free. */
async function prep(): Promise<void> {
  await mkdir(DIR, { recursive: true });
  // The library photo is 1920x1637. A 16:9 window that keeps the tower (right edge) and the modern block.
  await sharp('input/refs/imperial-college-central-library-imperia.jpg').extract({ left: 0, top: 250, width: 1920, height: 1080 }).jpeg({ quality: 92 }).toFile(`${DIR}/base.jpg`);
  const found: Record<string, string> = { base: await uploadFile(`${DIR}/base.jpg`) };
  for (const ref of REFS) {
    const meta = await sharp(`input/refs/${ref.src}.jpg`).metadata();
    const w = meta.width ?? 1;
    const h = meta.height ?? 1;
    await sharp(`input/refs/${ref.src}.jpg`)
      .extract({ left: Math.round(ref.left * w), top: Math.round(ref.top * h), width: Math.round(ref.width * w), height: Math.round(ref.height * h) })
      .jpeg({ quality: 92 })
      .toFile(`${DIR}/${ref.name}.jpg`);
    found[ref.name] = await uploadFile(`${DIR}/${ref.name}.jpg`);
  }
  await writeFile(`${DIR}/urls.json`, JSON.stringify(found, null, 1));
  console.log('prepared', Object.keys(found).join(', '));
}

/** Make one scene variant. */
async function scene(name: string, prompt: string, imageUrls: string[]): Promise<void> {
  const result = await timedFal<ImageResult>(name, EDIT, { prompt, image_urls: imageUrls, aspect_ratio: '16:9', resolution: '1K', output_format: 'jpeg' });
  const image = result.data.images[0];
  await download(image.url, `realism/${name}.jpg`);
  await ledger({ name, endpoint: EDIT, requestId: result.requestId, seconds: result.elapsedMs / 1000, costUsd: COST_PER_IMAGE_USD, size: `${image.width}x${image.height}` });
  await writeFile(`${DIR}/${name}.prompt.txt`, prompt);
  console.log(`${name}: ${image.width}x${image.height}`);
}

/** The three scene variants, in parallel. */
async function scenes(): Promise<void> {
  const u = await urls();
  const refs = [u['ref-rijksmuseum'], u['ref-postcard1903'], u['ref-jubilee']];
  await Promise.all([
    scene('scene-old', BEFORE.buildScenePrompt(BRIEF, YEAR), [u.base]),
    scene('scene-colour', NOW.buildScenePrompt(BRIEF, YEAR, { look: 'colour', referenceCount: refs.length }), [u.base, ...refs]),
    scene('scene-mono', NOW.buildScenePrompt(BRIEF, YEAR, { look: 'monochrome', referenceCount: refs.length }), [u.base, ...refs]),
  ]);
}

/** One extra scene variant: `<name> <colour|monochrome> <0|3 references>`. Used to separate the prompt from the references. */
async function scene1(name: string, look: string, refCount: number): Promise<void> {
  const u = await urls();
  const refs = [u['ref-rijksmuseum'], u['ref-postcard1903'], u['ref-jubilee']].slice(0, refCount);
  await scene(name, NOW.buildScenePrompt(BRIEF, YEAR, { look: look as 'colour' | 'monochrome', referenceCount: refs.length }), [u.base, ...refs]);
}

/** Make one panorama from a scene file. */
async function pano(name: string, sceneName: string, mode: string): Promise<void> {
  const u = await urls();
  const refs = [u['ref-rijksmuseum'], u['ref-postcard1903'], u['ref-jubilee']];
  // Modes ending in -feather fade the pasted scene into the grey so no hard paste line is left to see.
  const feathered = mode.endsWith('-feather');
  mode = mode.replace('-feather', '');
  const canvas = await buildPanoramaCanvas(await readFile(`${DIR}/${sceneName}.jpg`), { horizonFraction: 0.55, featherPx: feathered ? 90 : 0 });
  await writeFile(`${DIR}/${name}.canvas.png`, canvas);
  const canvasUrl = await uploadFile(`${DIR}/${name}.canvas.png`);
  let prompt: string;
  let imageUrls = [canvasUrl];
  if (mode === 'old') prompt = BEFORE.buildPanoramaPrompt(BRIEF.surroundings, BRIEF.changes.notYetBuilt, YEAR);
  else if (mode === 'new') prompt = NOW.buildPanoramaPrompt(BRIEF.surroundings, BRIEF.changes.notYetBuilt, YEAR, { look: 'colour' });
  else {
    const look = mode === 'mono-ref' ? 'monochrome' : 'colour';
    prompt = NOW.buildPanoramaPrompt(BRIEF.surroundings, BRIEF.changes.notYetBuilt, YEAR, { look, referenceCount: refs.length });
    imageUrls = [canvasUrl, ...refs];
  }
  const result = await timedFal<ImageResult>(name, EDIT, { prompt, image_urls: imageUrls, aspect_ratio: 'auto', resolution: '2K', output_format: 'jpeg' });
  const image = result.data.images[0];
  const bytes = Buffer.from(await (await fetch(image.url)).arrayBuffer());
  await writeFile(`${DIR}/${name}.raw.jpg`, bytes);
  // Exact 2:1, as the production stage does, so the viewer treats it as a full sphere.
  await sharp(bytes).resize(2880, 1440, { fit: 'fill' }).jpeg({ quality: 90 }).toFile(`${DIR}/${name}.jpg`);
  await ledger({ name, endpoint: EDIT, requestId: result.requestId, seconds: result.elapsedMs / 1000, costUsd: COST_PER_IMAGE_USD, mode, scene: sceneName, size: `${image.width}x${image.height}` });
  await writeFile(`${DIR}/${name}.prompt.txt`, prompt);
  console.log(`${name} (${mode} from ${sceneName}): ${image.width}x${image.height}`);
}

/** Upscale an image with SeedVR2. */
async function upscale(imageName: string, factor: number): Promise<void> {
  const url = await uploadFile(`${DIR}/${imageName}.jpg`);
  const meta = await sharp(`${DIR}/${imageName}.jpg`).metadata();
  const result = await timedFal<{ image: FalImage }>(`upscale ${imageName}`, UPSCALE, { image_url: url, upscale_mode: 'factor', upscale_factor: factor });
  const image = result.data.image;
  await download(image.url, `realism/${imageName}-x${factor}.jpg`);
  const megapixels = ((meta.width ?? 0) * factor * (meta.height ?? 0) * factor) / 1e6;
  await ledger({ name: `${imageName}-x${factor}`, endpoint: UPSCALE, requestId: result.requestId, seconds: result.elapsedMs / 1000, costUsd: Number((megapixels * 0.001).toFixed(3)), size: `${image.width}x${image.height}` });
  console.log(`${imageName} x${factor}: ${image.width}x${image.height}`);
}

const [command, ...args] = process.argv.slice(2);
const job =
  command === 'prep' ? prep()
  : command === 'scenes' ? scenes()
  : command === 'scene1' ? scene1(args[0], args[1], Number(args[2] ?? 0))
  : command === 'pano' ? pano(args[0], args[1], args[2])
  : command === 'upscale' ? upscale(args[0], Number(args[1] ?? 2))
  : Promise.reject(new Error(`Unknown command "${command}". See the header.`));
job.catch((error: unknown) => failAndExit('realism', error));
