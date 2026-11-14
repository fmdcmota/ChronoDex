/**
 * Make short test video clips in the browser, so the clip-player spike needs no downloads or ffmpeg.
 *
 * Owner: Agent 4. Spike for A4-04 only.
 *
 * Each clip is a canvas animation (a coloured card, its name, a moving bar, a frame counter)
 * recorded with MediaRecorder, with a sine tone as its audio track. A different pitch per clip
 * makes an audio gap or overlap audible at the joins. Recording runs in real time.
 */

/** Frames per second of the recorded canvas. */
const CLIP_FPS = 30;
/** Canvas size, 16:9 like every still and video in the app (assumption A7). */
const CLIP_W = 640;
const CLIP_H = 360;

/** One clip to make. */
export interface TestClipSpec {
  kind: string;
  colour: string;
  toneHz: number;
  durationMs: number;
}

/**
 * Container types to try, best first. Safari records MP4 only, Chrome and Firefox WebM,
 * recent Chrome both.
 */
const VIDEO_TYPES = ['video/mp4;codecs=avc1,mp4a', 'video/mp4', 'video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'];

/**
 * Pick the first video MIME type this browser's MediaRecorder supports.
 *
 * @returns The type, or '' to let the browser choose.
 */
export function pickVideoType(): string {
  if (typeof MediaRecorder === 'undefined') return '';
  return VIDEO_TYPES.find((t) => MediaRecorder.isTypeSupported(t)) ?? '';
}

/**
 * Record one clip.
 *
 * @param spec - What to draw and play.
 * @param audio - A running AudioContext. Create it inside a tap on iOS.
 * @returns An object URL for the recorded clip and the MIME type used.
 * @throws Error when MediaRecorder or canvas capture is missing.
 */
export async function recordTestClip(spec: TestClipSpec, audio: AudioContext): Promise<{ url: string; type: string }> {
  const canvas = document.createElement('canvas');
  canvas.width = CLIP_W;
  canvas.height = CLIP_H;
  const ctx = canvas.getContext('2d');
  if (!ctx || typeof canvas.captureStream !== 'function') throw new Error('canvas capture not supported');

  const osc = audio.createOscillator();
  osc.frequency.value = spec.toneHz;
  const gain = audio.createGain();
  gain.gain.value = 0.15;
  const dest = audio.createMediaStreamDestination();
  osc.connect(gain).connect(dest);

  const stream = new MediaStream([...canvas.captureStream(CLIP_FPS).getVideoTracks(), ...dest.stream.getAudioTracks()]);
  const type = pickVideoType();
  const rec = new MediaRecorder(stream, type ? { mimeType: type } : undefined);
  const chunks: Blob[] = [];
  rec.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
  const stopped = new Promise<void>((resolve) => { rec.onstop = () => resolve(); });

  const start = performance.now();
  let frame = 0;
  const draw = (): void => {
    const t = performance.now() - start;
    ctx.fillStyle = spec.colour;
    ctx.fillRect(0, 0, CLIP_W, CLIP_H);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 64px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(spec.kind, CLIP_W / 2, CLIP_H / 2);
    ctx.font = '24px monospace';
    ctx.fillText(`frame ${frame++}`, CLIP_W / 2, CLIP_H / 2 + 50);
    ctx.fillRect(0, CLIP_H - 30, (CLIP_W * t) / spec.durationMs, 30);
  };

  draw();
  osc.start();
  rec.start();
  const timer = window.setInterval(draw, 1000 / CLIP_FPS);
  await new Promise((r) => window.setTimeout(r, spec.durationMs));
  rec.stop();
  window.clearInterval(timer);
  osc.stop();
  await stopped;
  for (const track of stream.getTracks()) track.stop();

  const blob = new Blob(chunks, { type: rec.mimeType || type || 'video/webm' });
  return { url: URL.createObjectURL(blob), type: blob.type };
}
