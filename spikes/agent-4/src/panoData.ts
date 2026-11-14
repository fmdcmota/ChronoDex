/**
 * Map the `Panorama` contract (MASTER.md section 4.1) to Photo Sphere Viewer's `PanoData`.
 *
 * Owner: Agent 4. Spike for A4-01, written to be lifted into src/components/time-machine/ at A4-03.
 *
 * Why this exists: the panorama stage (A2-03) may return a full 2:1 equirectangular image
 * (vFovDeg 180) or a cropped band such as 21:9. PSV renders a band correctly only when told
 * where the band sits inside a notional full sphere. The contract gives us the band's pixel
 * size and its vertical field of view; with square pixels that fixes everything else.
 */

/** Degrees in a full turn. */
const FULL_TURN_DEG = 360;
/** Degrees from straight down to straight up. */
const FULL_PITCH_DEG = 180;
/** A band within this fraction of a full turn is treated as a full turn (absorbs rounding in vFovDeg). */
const FULL_TURN_SNAP = 0.02;

/** The subset of the contract's `Panorama` this module needs. */
export interface PanoramaSize {
  widthPx: number;
  heightPx: number;
  /** Vertical field of view the image covers. 180 means full equirectangular. */
  vFovDeg: number;
}

/** Same shape as PSV's `PanoData` (kept local so this file has no PSV import and is unit-testable). */
export interface PsvPanoData {
  fullWidth: number;
  fullHeight: number;
  croppedWidth: number;
  croppedHeight: number;
  croppedX: number;
  croppedY: number;
}

/**
 * Work out where a (possibly cropped) panorama sits inside a full equirectangular sphere.
 *
 * Assumes square pixels and a band centred on the horizon and on the image's horizontal centre.
 * If the band is wider than 360 degrees at that pixel density (a model stretched it), the
 * horizontal coverage is clamped to 360 and the image is treated as wrapping fully.
 *
 * @param pano - Pixel size and vertical field of view from the era's `Panorama`.
 * @returns PanoData to pass as PSV's `panoData` option.
 * @throws RangeError when a size is not positive or vFovDeg is outside (0, 180].
 * @example panoDataFor({ widthPx: 2100, heightPx: 900, vFovDeg: 90 })
 *   // => { fullWidth: 3600, fullHeight: 1800, croppedWidth: 2100, croppedHeight: 900, croppedX: 750, croppedY: 450 }
 */
export function panoDataFor(pano: PanoramaSize): PsvPanoData {
  const { widthPx, heightPx, vFovDeg } = pano;
  if (!(widthPx > 0) || !(heightPx > 0)) throw new RangeError('Panorama size must be positive');
  if (!(vFovDeg > 0) || vFovDeg > FULL_PITCH_DEG) throw new RangeError('vFovDeg must be in (0, 180]');

  const pxPerDeg = heightPx / vFovDeg;
  let fullWidth = Math.round(FULL_TURN_DEG * pxPerDeg);
  // vFovDeg is usually a rounded number (154 for a 21:9 full turn is really 154.29), so a band
  // that is nearly a full turn would leave a thin seam at the back. Snap it to exactly 360.
  // An over-wide band (a model stretched it) also wraps as a full turn.
  if (widthPx >= fullWidth * (1 - FULL_TURN_SNAP)) fullWidth = widthPx;
  // Equirectangular is always 2:1 over the full sphere.
  const fullHeight = Math.round(fullWidth / 2);

  return {
    fullWidth,
    fullHeight,
    croppedWidth: widthPx,
    croppedHeight: heightPx,
    croppedX: Math.round((fullWidth - widthPx) / 2),
    croppedY: Math.round((fullHeight - heightPx) / 2),
  };
}

/**
 * Horizontal coverage of a panorama, from its pixel size and vertical coverage (square pixels).
 *
 * @param pano - Pixel size and vertical field of view.
 * @returns Degrees, at most 360. Same snapping as panoDataFor, so near-full turns return 360.
 */
export function hFovDegOf(pano: PanoramaSize): number {
  const d = panoDataFor(pano);
  return (FULL_TURN_DEG * d.croppedWidth) / d.fullWidth;
}

/**
 * How far (radians) the camera centre may turn either way from the image centre without the
 * view leaving the image. Works for pitch (vertical) and for yaw on a partial band (horizontal).
 *
 * @param coverDeg - What the image covers on this axis.
 * @param viewDeg - What the viewer shows on this axis at the current zoom.
 * @returns Half-range in radians. 0 when the image is narrower than the screen (the camera then
 *   stays centred). Callers skip the yaw clamp when coverDeg is 360.
 */
export function maxOffsetRad(coverDeg: number, viewDeg: number): number {
  const halfDeg = Math.max(0, (coverDeg - viewDeg) / 2);
  return (halfDeg * Math.PI) / FULL_PITCH_DEG;
}
