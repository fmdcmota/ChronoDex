/**
 * Draw synthetic panorama test images on a canvas, so the spike needs no downloaded photos.
 *
 * Owner: Agent 4. Spike for A4-01 only.
 *
 * The image is a labelled grid: compass letters every 90 degrees, a red horizon line, a green
 * marker at the horizontal centre (where `centreBearingDeg` points), and pitch lines every 30 degrees.
 * A seam or a wrongly placed band is obvious at a glance.
 */

/** Grid spacing in degrees. */
const GRID_STEP_DEG = 15;
/** Pitch label spacing in degrees. */
const PITCH_LABEL_STEP_DEG = 30;

/**
 * Render a test panorama.
 *
 * @param widthPx - Image width.
 * @param heightPx - Image height.
 * @param vFovDeg - Vertical coverage the image represents. 180 for a full 2:1 sphere.
 * @param hFovDeg - Horizontal coverage. 360 for a full turn.
 * @returns A JPEG data URL.
 */
export function makeTestPanorama(widthPx: number, heightPx: number, vFovDeg: number, hFovDeg = 360): string {
  const canvas = document.createElement('canvas');
  canvas.width = widthPx;
  canvas.height = heightPx;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2D canvas not available');

  const pxPerDegX = widthPx / hFovDeg;
  const pxPerDegY = heightPx / vFovDeg;
  const midX = widthPx / 2;
  const midY = heightPx / 2;

  // Sky to ground gradient so up and down are obvious.
  const grad = ctx.createLinearGradient(0, 0, 0, heightPx);
  grad.addColorStop(0, '#6aa7e0');
  grad.addColorStop(0.5, '#e8dcc0');
  grad.addColorStop(1, '#6b5a3e');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, widthPx, heightPx);

  ctx.strokeStyle = 'rgba(0,0,0,0.35)';
  ctx.lineWidth = 2;
  for (let d = -hFovDeg / 2; d <= hFovDeg / 2; d += GRID_STEP_DEG) {
    const x = midX + d * pxPerDegX;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, heightPx);
    ctx.stroke();
  }
  for (let p = -vFovDeg / 2; p <= vFovDeg / 2; p += GRID_STEP_DEG) {
    const y = midY - p * pxPerDegY;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(widthPx, y);
    ctx.stroke();
  }

  // Horizon.
  ctx.strokeStyle = '#d0202a';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(0, midY);
  ctx.lineTo(widthPx, midY);
  ctx.stroke();

  // Compass labels relative to the image centre (centre = "C", the landmark direction).
  const fontPx = Math.round(heightPx / 12);
  ctx.font = `bold ${fontPx}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  const labels: Array<[number, string]> = [[-180, 'BACK'], [-90, 'LEFT'], [0, 'FRONT'], [90, 'RIGHT'], [180, 'BACK']];
  for (const [deg, text] of labels) {
    if (Math.abs(deg) > hFovDeg / 2) continue;
    const x = midX + deg * pxPerDegX;
    ctx.fillStyle = deg === 0 ? '#118a2e' : '#111';
    ctx.fillText(text, x, midY - 8);
  }

  // Centre marker: where the landmark should sit.
  ctx.fillStyle = '#118a2e';
  ctx.beginPath();
  ctx.arc(midX, midY, fontPx / 3, 0, Math.PI * 2);
  ctx.fill();

  // Pitch labels.
  ctx.fillStyle = '#111';
  ctx.font = `${Math.round(fontPx / 2)}px sans-serif`;
  ctx.textBaseline = 'middle';
  for (let p = -90; p <= 90; p += PITCH_LABEL_STEP_DEG) {
    if (p === 0 || Math.abs(p) > vFovDeg / 2) continue;
    for (const d of [-90, 0, 90]) {
      if (Math.abs(d) > hFovDeg / 2) continue;
      ctx.fillText(`${p > 0 ? '+' : ''}${p}°`, midX + d * pxPerDegX, midY - p * pxPerDegY);
    }
  }

  return canvas.toDataURL('image/jpeg', 0.9);
}
