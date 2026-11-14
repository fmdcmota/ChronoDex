/**
 * Optional fal route for the landmark sprites (MASTER.md task A3-01). Owner: Agent 3.
 * Run with `npm run art:fal -- --yes [--only <landmarkId>]`. SPENDS fal CREDITS.
 *
 * The committed sprites are hand-drawn in code (`npm run art`, free). This script makes fal
 * candidates to compare against them, written to art/fal/ only, so it can never overwrite the
 * art the map uses. To adopt a candidate, copy it over art/sprites/<id>.png by hand and log
 * the choice in notebook/agent-3.md.
 *
 * Per landmark, two fal calls (endpoints and fields read from each model's llms.txt on
 * 14 Nov 2026):
 * 1. `google/nano-banana-2.1`, text to image. Input `prompt`, `aspect_ratio` "1:1",
 *    `resolution` "1K", `output_format` "png". Output `images[].url`. Token-priced; MASTER.md
 *    section 5.5 budgets about $0.15 per image. Typically 10 to 30 s.
 * 2. `fal-ai/birefnet/v2`, background removal. Input `image_url`, `output_format` "png".
 *    Output `image.url`. Listed at $0. A few seconds.
 * Then the cut-out is shrunk to a 32 px palette sprite locally (scripts/pixel/pixelate.ts).
 *
 * Endpoint ids appear here and nowhere else in the spike. In the app they belong in Agent 2's
 * `src/lib/fal/models.ts` (MASTER.md section 5.3 rule 3); this is a throwaway spike script.
 *
 * Key: FAL_KEY from the environment, or from spikes/agent-3/.env.local or the repo's
 * .env.local. It is never printed. On failure the landmark is skipped and the error shown;
 * nothing is retried, so a failure never pays twice.
 */
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { config as loadEnv } from 'dotenv';
import { fal } from '@fal-ai/client';
import { PNG } from 'pngjs';
import { SPIKE_LANDMARKS } from '../src/lib/landmarks';
import { PixelCanvas } from './pixel/canvas';
import { pixelate } from './pixel/pixelate';
import { buildSpritePrompt } from './fal/prompts';

const HERE = dirname(fileURLToPath(import.meta.url));
const SPIKE_DIR = join(HERE, '..');
const OUT_DIR = join(SPIKE_DIR, 'art', 'fal');
const RAW_DIR = join(OUT_DIR, 'raw');
/** Export scale, the same as scripts/make-pixel-art.ts. */
const SCALE = 4;
/** Rough cost per landmark, for the warning only. */
const EST_COST_PER_LANDMARK_USD = 0.15;

const TEXT_TO_IMAGE = 'google/nano-banana-2.1';
const REMOVE_BACKGROUND = 'fal-ai/birefnet/v2';

for (const envFile of [join(SPIKE_DIR, '.env.local'), join(SPIKE_DIR, '..', '..', '.env.local')]) {
  if (existsSync(envFile)) loadEnv({ path: envFile, quiet: true });
}

const args = process.argv.slice(2);
const onlyIndex = args.indexOf('--only');
const only = onlyIndex >= 0 ? args[onlyIndex + 1] : undefined;
const targets = SPIKE_LANDMARKS.filter((l) => !only || l.id === only);

if (!process.env.FAL_KEY) {
  console.error('FAL_KEY is not set. Put it in spikes/agent-3/.env.local (git-ignored) or export it.');
  process.exit(1);
}
if (targets.length === 0) {
  console.error(`No landmark with id "${only}".`);
  process.exit(1);
}
if (!args.includes('--yes')) {
  console.error(
    `This makes ${targets.length * 2} fal calls, about $${(targets.length * EST_COST_PER_LANDMARK_USD).toFixed(2)}. ` +
      'Run again with --yes to go ahead.',
  );
  process.exit(1);
}

/** Download a URL into a buffer. */
async function download(url: string): Promise<Buffer> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Download failed (${res.status}) for ${url}`);
  return Buffer.from(await res.arrayBuffer());
}

/** Decode PNG bytes into a PixelCanvas. */
function decodePng(bytes: Buffer): PixelCanvas {
  const png = PNG.sync.read(bytes);
  const c = new PixelCanvas(png.width, png.height);
  c.data.set(png.data);
  return c;
}

mkdirSync(RAW_DIR, { recursive: true });

for (const landmark of targets) {
  const started = Date.now();
  try {
    const prompt = buildSpritePrompt(landmark);
    const gen = await fal.subscribe(TEXT_TO_IMAGE, {
      input: { prompt, aspect_ratio: '1:1', resolution: '1K', output_format: 'png' },
    });
    const imageUrl = gen.data.images[0]?.url;
    if (!imageUrl) throw new Error(`${TEXT_TO_IMAGE} returned no image (request ${gen.requestId})`);
    writeFileSync(join(RAW_DIR, `${landmark.id}.png`), await download(imageUrl));

    const cut = await fal.subscribe(REMOVE_BACKGROUND, { input: { image_url: imageUrl, output_format: 'png' } });
    const cutBytes = await download(cut.data.image.url);
    writeFileSync(join(RAW_DIR, `${landmark.id}-cutout.png`), cutBytes);

    const sprite = pixelate(decodePng(cutBytes));
    writeFileSync(join(OUT_DIR, `${landmark.id}.png`), sprite.scaled(SCALE).toPng());
    const seconds = ((Date.now() - started) / 1000).toFixed(1);
    console.log(`${landmark.id}: done in ${seconds} s (requests ${gen.requestId}, ${cut.requestId}) -> art/fal/${landmark.id}.png`);
  } catch (err) {
    const seconds = ((Date.now() - started) / 1000).toFixed(1);
    console.error(`${landmark.id}: FAILED after ${seconds} s:`, err instanceof Error ? err.message : err);
  }
}
