/**
 * Image helpers for the panorama stage: build the grey canvas the model paints around, and turn the
 * model's picture into an exact 2:1 equirectangular image.
 *
 * Owner: Agent 2 (Studio). Implements MASTER.md section 5.4 (panorama, route b2 from A2-03), task A2-08.
 * Uses `sharp`, which Next.js already installs for image optimisation. Pure functions on buffers: no
 * network, no database, so they are unit tested with synthetic images.
 */
import sharp from 'sharp';

/** Width of the canvas sent to the model. 2:1, as the equirectangular layout the model must fill. */
export const CANVAS_WIDTH_PX = 2048;
/** Height of the canvas sent to the model. */
export const CANVAS_HEIGHT_PX = 1024;
/**
 * Share of the canvas width the scene covers. A phone photo spans about 65 to 75 degrees, which is
 * about 20% of 360, but a third (120 degrees) keeps the landmark readable when the viewer opens
 * facing it (A2-03).
 */
export const SCENE_WIDTH_FRACTION = 1 / 3;
/**
 * Where the horizon sits in the scene, as a fraction of its height from the top. 0.5 is a level
 * phone photo; the Exhibition Road test photo was tilted up and measured 0.69. The scene's horizon is
 * lined up with the canvas's middle row, because the panorama's horizon must be the middle row.
 */
export const DEFAULT_HORIZON_FRACTION = 0.55;
/**
 * How wide the soft edge around the pasted scene is, in canvas pixels (the scene is about 683 px wide).
 * Without it the finished panorama showed the scene as a hard-edged rectangle (realism bake-off).
 */
export const PANORAMA_FEATHER_PX = 90;
/** Final panorama width. Exactly twice the height, which the viewer needs for vFovDeg 180. */
export const PANORAMA_WIDTH_PX = 2880;
/** Final panorama height. */
export const PANORAMA_HEIGHT_PX = 1440;
/** Grey (0 to 255) that marks "paint here" on the canvas. */
const CANVAS_GREY = 128;
/** A pixel within this many levels of the marker grey, in every channel, counts as unpainted. */
const UNPAINTED_TOLERANCE = 4;
/** Width of the thumbnail used to measure unpainted area. Plenty to see a missing band, and fast. */
const MEASURE_WIDTH_PX = 256;
/** JPEG quality of the final panorama. High, because 2880 px over 360 degrees is already soft. */
const PANORAMA_JPEG_QUALITY = 90;

/** Options for the canvas. All optional. */
export interface CanvasOptions {
  /** Where the horizon sits in the scene, from the top. Default DEFAULT_HORIZON_FRACTION. */
  horizonFraction?: number;
  /**
   * Width in pixels of a soft edge that fades the pasted scene into the grey canvas. 0 (the default) keeps a
   * hard edge. A hard edge left a visible vertical line in the finished panorama where the scene meets the
   * model's painting (phone test round 1 realism bake-off); a fade gives the model nothing to line up with.
   */
  featherPx?: number;
}

/**
 * Build the canvas for the panorama model: the scene in the horizontal middle of a flat grey 2:1
 * image, its horizon on the middle row.
 *
 * Why grey: the model is asked to replace "all the flat grey", which tells it exactly what to invent.
 *
 * @param scene - The scene image (any format sharp reads).
 * @param options - Horizon position.
 * @returns A PNG of CANVAS_WIDTH_PX by CANVAS_HEIGHT_PX.
 */
export async function buildPanoramaCanvas(scene: Buffer, options: CanvasOptions = {}): Promise<Buffer> {
  const horizonFraction = options.horizonFraction ?? DEFAULT_HORIZON_FRACTION;
  // Fit inside a third of the width and the full height: a portrait photo would otherwise be taller
  // than the canvas, and sharp refuses to composite an image larger than its canvas.
  const resized = await sharp(scene)
    .resize({ width: Math.round(CANVAS_WIDTH_PX * SCENE_WIDTH_FRACTION), height: CANVAS_HEIGHT_PX, fit: 'inside' })
    .png()
    .toBuffer();
  const resizedMeta = await sharp(resized).metadata();
  const sceneWidth = resizedMeta.width ?? 0;
  const sceneHeight = resizedMeta.height ?? 0;
  const left = Math.round((CANVAS_WIDTH_PX - sceneWidth) / 2);
  // Put the scene's horizon on the canvas's middle row, but never let the scene fall off the canvas.
  const wantedTop = Math.round(CANVAS_HEIGHT_PX / 2 - horizonFraction * sceneHeight);
  const top = Math.min(Math.max(wantedTop, 0), Math.max(CANVAS_HEIGHT_PX - sceneHeight, 0));
  const pasted = options.featherPx ? await featherEdges(resized, sceneWidth, sceneHeight, options.featherPx) : resized;
  return sharp({
    create: { width: CANVAS_WIDTH_PX, height: CANVAS_HEIGHT_PX, channels: 3, background: { r: CANVAS_GREY, g: CANVAS_GREY, b: CANVAS_GREY } },
  })
    .composite([{ input: pasted, left, top }])
    .png()
    .toBuffer();
}

/**
 * Fade the outer `featherPx` pixels of an image to transparent, so it blends into whatever is behind it.
 *
 * @param image - The image (any format sharp reads).
 * @param width - Its width in pixels.
 * @param height - Its height in pixels.
 * @param featherPx - Fade distance from each edge, in pixels. Capped at a third of the smaller side.
 * @returns A PNG with an alpha channel: 1 in the middle, 0 at the very edge.
 */
export async function featherEdges(image: Buffer, width: number, height: number, featherPx: number): Promise<Buffer> {
  const feather = Math.max(1, Math.min(featherPx, Math.floor(Math.min(width, height) / 3)));
  const alpha = Buffer.alloc(width * height);
  for (let y = 0; y < height; y++) {
    const fromTopBottom = Math.min(y, height - 1 - y) / feather;
    for (let x = 0; x < width; x++) {
      const fromSides = Math.min(x, width - 1 - x) / feather;
      alpha[y * width + x] = Math.round(Math.min(fromSides, fromTopBottom, 1) * 255);
    }
  }
  // Flatten to plain RGB bytes first. sharp applies removeAlpha late in its pipeline, so calling it on the same
  // chain as joinChannel would strip the fade it has just added.
  const rgb = await sharp(image).removeAlpha().raw().toBuffer();
  return sharp(rgb, { raw: { width, height, channels: 3 } })
    .joinChannel(alpha, { raw: { width, height, channels: 1 } })
    .png()
    .toBuffer();
}

/**
 * Turn the model's panorama into an exact 2:1 JPEG.
 *
 * Why: Nano Banana Pro returned 2912 by 1440 (2.02:1) for a 2:1 canvas. The viewer's full-sphere mode
 * needs exactly 2:1, and the 1% stretch is not visible.
 *
 * @param image - The model's picture.
 * @returns A JPEG of PANORAMA_WIDTH_PX by PANORAMA_HEIGHT_PX.
 */
export async function toEquirectangular(image: Buffer): Promise<Buffer> {
  return sharp(image).resize(PANORAMA_WIDTH_PX, PANORAMA_HEIGHT_PX, { fit: 'fill' }).jpeg({ quality: PANORAMA_JPEG_QUALITY }).toBuffer();
}

/**
 * Download a file into memory.
 *
 * Side effects: one HTTP GET, normally to fal's CDN.
 *
 * @param url - Public URL.
 * @returns The bytes.
 * @throws Error when the response is not OK.
 */
export async function fetchBuffer(url: string): Promise<Buffer> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Download failed (${response.status}) for ${url}`);
  return Buffer.from(await response.arrayBuffer());
}

/**
 * Measure how much of a panorama is still the flat grey of the canvas.
 *
 * Why: in a live run (A2-08) the model once returned a mirrored two-row picture with the bottom third
 * left as the unpainted grey canvas. Photographs of streets almost never contain large patches of
 * exactly this grey, so a high fraction means the model did not do the job and the stage should retry.
 *
 * @param image - The model's picture.
 * @returns The fraction of pixels (0 to 1) within UNPAINTED_TOLERANCE of the canvas grey.
 */
export async function unpaintedFraction(image: Buffer): Promise<number> {
  const { data, info } = await sharp(image).resize({ width: MEASURE_WIDTH_PX }).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  let flat = 0;
  const pixels = info.width * info.height;
  for (let i = 0; i < pixels; i++) {
    const [r, g, b] = [data[i * 3], data[i * 3 + 1], data[i * 3 + 2]];
    if ([r, g, b].every((channel) => Math.abs(channel - CANVAS_GREY) <= UNPAINTED_TOLERANCE)) flat++;
  }
  return flat / pixels;
}
