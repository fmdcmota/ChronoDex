/**
 * Hold-to-talk microphone recording with MediaRecorder.
 *
 * Owner: Agent 4. Spike for A4-08 (voice in), written to be lifted into src/components/chat/.
 * The recording is what gets posted to POST /api/voice/stt (Agent 2), so the MIME type each
 * phone produces matters: Scribe v2's accepted formats are not documented (MASTER section 14).
 */

/** Audio types to try, best first. iOS Safari records audio/mp4 (AAC) only. */
const AUDIO_TYPES = ['audio/webm;codecs=opus', 'audio/mp4', 'audio/ogg;codecs=opus', 'audio/webm'];

/** Shorter than this is treated as an accidental tap and thrown away. */
export const MIN_RECORDING_MS = 400;

/** A finished recording. */
export interface Recording {
  blob: Blob;
  /** The MIME type the browser actually used. */
  type: string;
  durationMs: number;
}

/**
 * Pick the first audio MIME type this browser's MediaRecorder supports.
 *
 * @returns The type, or '' to let the browser choose.
 */
export function pickAudioType(): string {
  if (typeof MediaRecorder === 'undefined') return '';
  return AUDIO_TYPES.find((t) => MediaRecorder.isTypeSupported(t)) ?? '';
}

/**
 * File extension for an upload, from a recorded MIME type.
 *
 * @param type - For example "audio/webm;codecs=opus".
 * @returns "webm", "m4a", "ogg" or "bin".
 */
export function extensionFor(type: string): string {
  if (type.startsWith('audio/webm')) return 'webm';
  if (type.startsWith('audio/mp4')) return 'm4a';
  if (type.startsWith('audio/ogg')) return 'ogg';
  return 'bin';
}

/**
 * Records while a button is held. Keeps the microphone stream open between recordings so the
 * permission prompt appears once and later presses start instantly.
 *
 * Side effects: asks for microphone permission on the first `start()`. Holds the mic open until `close()`.
 */
export class HoldToTalkRecorder {
  private stream: MediaStream | null = null;
  private rec: MediaRecorder | null = null;
  private chunks: Blob[] = [];
  private startedAtMs = 0;

  /**
   * Begin recording. Call from pointerdown.
   *
   * @throws DOMException NotAllowedError when the player refuses the microphone, NotFoundError when there is none.
   */
  async start(): Promise<void> {
    if (!this.stream) {
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
    }
    const type = pickAudioType();
    this.chunks = [];
    this.rec = new MediaRecorder(this.stream, type ? { mimeType: type } : undefined);
    this.rec.ondataavailable = (e) => { if (e.data.size > 0) this.chunks.push(e.data); };
    this.startedAtMs = performance.now();
    this.rec.start();
  }

  /**
   * Stop recording. Call from pointerup and pointercancel.
   *
   * @returns The recording, or null when nothing was recording or it was shorter than MIN_RECORDING_MS.
   */
  async stop(): Promise<Recording | null> {
    const rec = this.rec;
    if (!rec || rec.state === 'inactive') return null;
    this.rec = null;
    const stopped = new Promise<void>((resolve) => { rec.onstop = () => resolve(); });
    rec.stop();
    await stopped;
    const durationMs = performance.now() - this.startedAtMs;
    if (durationMs < MIN_RECORDING_MS) return null;
    const type = rec.mimeType || pickAudioType() || 'application/octet-stream';
    return { blob: new Blob(this.chunks, { type }), type, durationMs };
  }

  /** Release the microphone (the browser's recording indicator goes away). */
  close(): void {
    for (const t of this.stream?.getTracks() ?? []) t.stop();
    this.stream = null;
  }
}
