/**
 * `scripts/demo/fix-seam.ts`: repair the join behind the viewer in a kept demo panorama.
 *
 * Owner: Agent 6 (demo assets). Why: a panorama's left and right edges meet behind the viewer. The model does not
 * always make them match (Singapore 1819: open sea on one edge, jungle on the other, a hard vertical line in the
 * 360 view, human review 15 Nov 2026).
 *
 * How: shift the picture half a turn so the join sits in the middle, ask the image-edit model to repaint a band
 * around the middle so the two sides continue into each other, then paste back only that band with feathered edges
 * and shift back. Everything outside the band stays exactly as it was, and the result is still 2:1.
 *
 * Usage (FAL_KEY in .env.local): npx tsx --env-file=.env.local scripts/demo/fix-seam.ts raffles-landing-site_1819 [place words]
 *   add --smooth-only to skip the model and only remove the colour step at the join (free)
 * Cost and time: one Nano Banana Pro edit, about $0.15 and 30 s. Overwrites public/demo/<eraId>/panorama.jpg; the
 * previous file is kept beside it as panorama.before-seam.jpg; delete it once the result is approved.
 */
import { copyFileSync, readFileSync, writeFileSync } from 'node:fs';
import sharp from 'sharp';
import { MODELS, PANORAMA_RESOLUTION, runFal, uploadToFal } from '@/lib/fal';
import { buildImageEditInput } from '@/lib/pipeline/stages/inputs';
import { demoAssetPath } from './demo-set';

/** Width of the repainted band, as a share of the panorama's width. */
const BAND_FRACTION = 0.2;
/** Width of the grey strip the model must repaint, as a share of the panorama's width. Inside the pasted band. */
const GREY_FRACTION = 0.08;
/** Width of the soft edge on each side of the band, as a share of the panorama's width. */
const FEATHER_FRACTION = 0.05;

/**
 * Prompt for the seam repair. Intent: repaint only the middle band so the left half and the right half (which were
 * the far edges of the panorama) join as one continuous view, without inventing a new subject there.
 * Example output: "This is part of a 360 degree panorama of the Singapore River in 1819 ...".
 *
 * @param place - What the panorama shows, for example "the Singapore River in 1819".
 * @returns The edit instruction.
 */
export function buildSeamPrompt(place: string): string {
  return [
    `This is a 360 degree equirectangular panorama of ${place}. A flat grey vertical strip runs down the middle of the image.`,
    'Replace all of the flat grey with scenery, so the left side continues smoothly and naturally into the right side across it: the same horizon height, the same sky, the same ground and water, matching light and colour, no vertical line, no hard edge, no grey left.',
    'Where the two sides show different things (for example water on one side and land on the other), make a believable transition such as a shoreline curving between them.',
    'Keep everything outside the middle band exactly as it is. Same size and same 2:1 shape. It must look like one real period photograph, with no text and nothing modern.',
  ].join('\n\n');
}

/**
 * Shift an image horizontally by half its width, wrapping around.
 *
 * @param input - Image bytes.
 * @returns The shifted image as PNG bytes, and its size.
 */
async function halfTurn(input: Buffer): Promise<{ data: Buffer; width: number; height: number }> {
  const { width = 0, height = 0 } = await sharp(input).metadata();
  const half = Math.floor(width / 2);
  const left = await sharp(input).extract({ left: 0, top: 0, width: half, height }).toBuffer();
  const right = await sharp(input).extract({ left: half, top: 0, width: width - half, height }).toBuffer();
  const data = await sharp({ create: { width, height, channels: 3, background: '#000' } })
    .composite([
      { input: right, left: 0, top: 0 },
      { input: left, left: width - half, top: 0 },
    ])
    .png()
    .toBuffer();
  return { data, width, height };
}

/** Half-width, in pixels, of the area over which smoothSeam spreads the colour correction. */
const SMOOTH_HALF_WIDTH_PX = 360;
/** Rows averaged when measuring the step at the join, so noise does not streak. */
const SMOOTH_ROWS = 15;

/**
 * Remove the colour step along the vertical centre line of a (half-turned) panorama, free and local.
 *
 * Why: the model often keeps a faint hard line exactly where the two edges met (Singapore 1819). Per row, the
 * difference between the pixels just left and just right of the line is measured (averaged over SMOOTH_ROWS rows)
 * and split between the two sides, fading to zero over SMOOTH_HALF_WIDTH_PX, so sky, water and ground meet with no step.
 *
 * @param png - The half-turned image.
 * @returns The image with the step removed, as PNG bytes.
 */
export async function smoothSeam(png: Buffer): Promise<Buffer> {
  const { data, info } = await sharp(png).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  const c = Math.floor(width / 2);
  const at = (x: number, y: number, k: number) => data[(y * width + x) * channels + k];
  const steps: number[][] = [];
  for (let y = 0; y < height; y++) {
    const d: number[] = [];
    for (let k = 0; k < channels; k++) {
      let sum = 0;
      let n = 0;
      for (let yy = Math.max(0, y - SMOOTH_ROWS); yy <= Math.min(height - 1, y + SMOOTH_ROWS); yy++) {
        sum += (at(c, yy, k) + at(c + 1, yy, k)) / 2 - (at(c - 1, yy, k) + at(c - 2, yy, k)) / 2;
        n += 1;
      }
      d.push(sum / n);
    }
    steps.push(d);
  }
  const out = Buffer.from(data);
  for (let y = 0; y < height; y++) {
    for (let i = 0; i < SMOOTH_HALF_WIDTH_PX; i++) {
      const weight = 0.5 * (1 - i / SMOOTH_HALF_WIDTH_PX);
      for (let k = 0; k < channels; k++) {
        const left = (y * width + (c - 1 - i)) * channels + k;
        const right = (y * width + (c + i)) * channels + k;
        out[left] = Math.max(0, Math.min(255, Math.round(data[left] + steps[y][k] * weight)));
        out[right] = Math.max(0, Math.min(255, Math.round(data[right] - steps[y][k] * weight)));
      }
    }
  }
  return sharp(out, { raw: { width, height, channels } }).png().toBuffer();
}

/** Run the script. */
async function main(): Promise<void> {
  const smoothOnly = process.argv.includes('--smooth-only');
  const args = process.argv.slice(2).filter((a) => a !== '--smooth-only');
  const eraId = args[0];
  const place = args.slice(1).join(' ') || eraId?.replace(/_/, ' in ').replace(/-/g, ' ');
  if (!eraId) throw new Error('Name an era, for example raffles-landing-site_1819');
  const file = demoAssetPath(eraId, 'panorama');
  copyFileSync(file, file.replace(/panorama\.jpg$/, 'panorama.before-seam.jpg'));
  if (smoothOnly) {
    const turned = await halfTurn(readFileSync(file));
    const back = await halfTurn(await smoothSeam(turned.data));
    writeFileSync(file, await sharp(back.data).jpeg({ quality: 90, mozjpeg: true }).toBuffer());
    return void console.log(`${eraId}: colour step at the join smoothed (no model call).`);
  }

  const shifted = await halfTurn(readFileSync(file));
  // Grey out the join itself: left as it was, the model copied the hard line through (Singapore 1819, first try).
  const greyW = Math.round(shifted.width * GREY_FRACTION);
  const withGrey = await sharp(shifted.data)
    .composite([{ input: { create: { width: greyW, height: shifted.height, channels: 3, background: '#808080' } }, left: Math.round((shifted.width - greyW) / 2), top: 0 }])
    .png()
    .toBuffer();
  const url = await uploadToFal(new Blob([new Uint8Array(withGrey)], { type: 'image/png' }));
  const { data } = await runFal<{ images?: { url?: string }[] }>(
    MODELS.scene.endpoint,
    buildImageEditInput(buildSeamPrompt(place), [url], { aspectRatio: 'auto', resolution: PANORAMA_RESOLUTION }),
  );
  const editedUrl = data.images?.[0]?.url;
  if (!editedUrl) throw new Error('The model returned no image.');
  const edited = await sharp(Buffer.from(await (await fetch(editedUrl)).arrayBuffer()))
    .resize(shifted.width, shifted.height, { fit: 'fill' })
    .png()
    .toBuffer();

  // A mask that is white in the band and fades to black over the feather on each side.
  const band = Math.round(shifted.width * BAND_FRACTION);
  const feather = Math.round(shifted.width * FEATHER_FRACTION);
  const x0 = Math.round((shifted.width - band) / 2);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${shifted.width}" height="${shifted.height}">
    <defs><linearGradient id="g" x1="0" x2="1" y1="0" y2="0">
      <stop offset="0" stop-color="#000"/><stop offset="${feather / band}" stop-color="#fff"/>
      <stop offset="${1 - feather / band}" stop-color="#fff"/><stop offset="1" stop-color="#000"/>
    </linearGradient></defs>
    <rect width="100%" height="100%" fill="#000"/><rect x="${x0}" width="${band}" height="100%" fill="url(#g)"/></svg>`;
  const mask = await sharp(Buffer.from(svg)).greyscale().raw().toBuffer();
  const bandPixels = await sharp(edited).removeAlpha().joinChannel(mask, { raw: { width: shifted.width, height: shifted.height, channels: 1 } }).png().toBuffer();
  const blended = await sharp(shifted.data).composite([{ input: bandPixels }]).png().toBuffer();

  const restored = await halfTurn(blended);
  writeFileSync(file, await sharp(restored.data).jpeg({ quality: 90, mozjpeg: true }).toBuffer());
  console.log(`${eraId}: seam repaired (${band} px band, ${feather} px feather). Previous file kept as panorama.before-seam.jpg`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
