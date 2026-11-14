/**
 * Shrinks a camera photo before upload (MASTER.md section 5.3 rule 7, task A3-06).
 *
 * Owner: Agent 3 (Explorer).
 *
 * The rule: photos are resized in the browser to at most 1600 px on the long side, as JPEG, before
 * upload, because `POST /api/uploads` accepts under 4 MB (Vercel's body limit is about 4.5 MB) and
 * phone cameras produce 8 to 12 MB originals. The size maths is pure and unit tested; the canvas
 * work needs a browser.
 */

/** Longest edge of an uploaded photo, in pixels (MASTER.md section 5.3 rule 7). */
export const MAX_PHOTO_EDGE_PX = 1600;

/** JPEG quality tried first. 0.85 is visually clean and about 300 to 700 KB at 1600 px. */
export const JPEG_QUALITY_FIRST = 0.85;

/** Lowest JPEG quality tried before giving up on staying under the size limit. */
export const JPEG_QUALITY_FLOOR = 0.5;

/** Quality is lowered by this much per attempt. */
export const JPEG_QUALITY_STEP = 0.1;

/** The upload limit in bytes (MASTER.md section 4.3: under 4 MB). */
export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;

/** Width and height in whole pixels. */
export interface Size {
  widthPx: number;
  heightPx: number;
}

/**
 * Work out the size a photo should be scaled to: the same shape, with the long edge at most
 * `maxEdgePx`. A photo already small enough keeps its size (it is never enlarged).
 *
 * @param widthPx - Source width in pixels.
 * @param heightPx - Source height in pixels.
 * @param maxEdgePx - Longest allowed edge. Defaults to MAX_PHOTO_EDGE_PX.
 * @returns The target size, each side at least 1.
 * @throws Error when the source has a zero, negative or non-finite side.
 */
export function fitWithin(widthPx: number, heightPx: number, maxEdgePx: number = MAX_PHOTO_EDGE_PX): Size {
  if (!Number.isFinite(widthPx) || !Number.isFinite(heightPx) || widthPx <= 0 || heightPx <= 0) {
    throw new Error(`Cannot resize an image of ${widthPx} x ${heightPx} px`);
  }
  const longEdge = Math.max(widthPx, heightPx);
  if (longEdge <= maxEdgePx) return { widthPx: Math.round(widthPx), heightPx: Math.round(heightPx) };
  const scale = maxEdgePx / longEdge;
  return {
    widthPx: Math.max(1, Math.round(widthPx * scale)),
    heightPx: Math.max(1, Math.round(heightPx * scale)),
  };
}

/**
 * The JPEG qualities to try, highest first, ending at JPEG_QUALITY_FLOOR.
 *
 * @returns For example [0.85, 0.75, 0.65, 0.55, 0.5].
 */
export function qualityLadder(): number[] {
  const ladder: number[] = [];
  for (let q = JPEG_QUALITY_FIRST; q > JPEG_QUALITY_FLOOR; q -= JPEG_QUALITY_STEP) {
    ladder.push(Math.round(q * 100) / 100);
  }
  ladder.push(JPEG_QUALITY_FLOOR);
  return ladder;
}

/**
 * Encode a canvas as JPEG.
 *
 * @param canvas - The canvas to encode.
 * @param quality - JPEG quality from 0 to 1.
 * @returns The JPEG bytes.
 * @throws Error when the browser cannot encode the canvas.
 */
function canvasToJpeg(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('The browser could not encode the photo'))),
      'image/jpeg',
      quality,
    );
  });
}

/**
 * Draw a source onto a canvas at the target size and encode it as a JPEG under MAX_UPLOAD_BYTES.
 *
 * Side effects: creates one off-screen canvas. Does not close the source.
 *
 * @param source - A decoded image, video frame or bitmap.
 * @param sourceSize - The source's own pixel size.
 * @returns A JPEG blob whose long edge is at most MAX_PHOTO_EDGE_PX and which is under the upload
 *   limit (lowering the quality if needed).
 * @throws Error when the canvas cannot be created, or the photo is still too big at the lowest quality.
 */
export async function encodeJpeg(
  source: CanvasImageSource,
  sourceSize: Size,
): Promise<Blob> {
  const target = fitWithin(sourceSize.widthPx, sourceSize.heightPx);
  const canvas = document.createElement('canvas');
  canvas.width = target.widthPx;
  canvas.height = target.heightPx;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('The browser could not prepare the photo');
  context.drawImage(source, 0, 0, target.widthPx, target.heightPx);

  let last: Blob | null = null;
  for (const quality of qualityLadder()) {
    last = await canvasToJpeg(canvas, quality);
    if (last.size < MAX_UPLOAD_BYTES) return last;
  }
  throw new Error('The photo is too large to upload even after shrinking it');
}

/**
 * Turn a photo file (from the camera app through a file input) into an upload-ready JPEG.
 *
 * `createImageBitmap` with `imageOrientation: 'from-image'` applies the EXIF rotation, so a phone
 * photo taken in portrait is not uploaded sideways.
 *
 * @param file - The photo the player picked or took.
 * @returns A JPEG under the upload limit, long edge at most MAX_PHOTO_EDGE_PX.
 * @throws Error when the file cannot be decoded as an image.
 */
export async function resizeFileToJpeg(file: Blob): Promise<Blob> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    throw new Error('That file could not be read as a photo');
  }
  try {
    return await encodeJpeg(bitmap, { widthPx: bitmap.width, heightPx: bitmap.height });
  } finally {
    bitmap.close();
  }
}
