// Agent 5 spike: make a 1600x900 reference photo from a photo that is taller than 16:9, by padding
// instead of cropping (AGENT5.md 5.5 forbids stretching; cropping a tall tower loses the dome or
// the base). The whole photo is scaled to 900 px high and centred; each side band is the same photo
// scaled to cover the frame, heavily blurred and slightly dimmed, so the image model sees a soft
// continuation of sky and pavement, not a hard bar. The side bands are padding for the model to
// repaint, never evidence.
// Usage: node pad-reference.mjs <in.jpg> <out.jpg> [bottomTrimFraction]
// bottomTrimFraction removes that share of the source's height from the bottom first, for example
// 0.03 to drop a stitching wedge.
import sharp from 'sharp';

const WIDTH_PX = 1600;
const HEIGHT_PX = 900;
const BLUR_SIGMA = 40;
const DIM = 0.85;
const JPEG_QUALITY = 85;

const [input, output, trimArg = '0'] = process.argv.slice(2);
const bottomTrimFraction = Number(trimArg);
if (!input || !output) {
  console.error('Usage: node pad-reference.mjs <in.jpg> <out.jpg>');
  process.exit(1);
}

const meta = await sharp(input).rotate().metadata();
const source = await sharp(input)
  .rotate()
  .extract({ left: 0, top: 0, width: meta.width, height: Math.round(meta.height * (1 - bottomTrimFraction)) })
  .toBuffer();
const centre = await sharp(source).resize({ height: HEIGHT_PX }).toBuffer({ resolveWithObject: true });
const background = await sharp(source)
  .resize(WIDTH_PX, HEIGHT_PX, { fit: 'cover' })
  .blur(BLUR_SIGMA)
  .linear(DIM, 0)
  .toBuffer();
const left = Math.round((WIDTH_PX - centre.info.width) / 2);

await sharp(background)
  .composite([{ input: centre.data, left, top: 0 }])
  .toColourspace('srgb')
  .jpeg({ quality: JPEG_QUALITY, mozjpeg: true })
  .toFile(output);
console.log(`${output}: ${WIDTH_PX}x${HEIGHT_PX}, photo ${centre.info.width}x${HEIGHT_PX} at x=${left}`);
