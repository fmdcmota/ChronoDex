/**
 * Hold-to-talk microphone recording with MediaRecorder.
 *
 * Owner: Agent 4. Implements A4-08 voice in (MASTER.md section 11). Proven in spikes/agent-4/media.html.
 * The recording is what gets posted to POST /api/voice/stt (Agent 2), which renames the upload by its
 * real bytes, so the MIME type only has to be honest.
 *
 * Phone test round 1 (iPhone, iOS 26.5.1): Safari records `audio/webm;codecs=opus`, and some recordings
 * after the first came out at 5 bytes until a reload. The likely cause is the mic stream kept open
 * between presses: iOS can end or mute its track (for example when a reply plays through the speaker).
 * So every `start()` checks the tracks and reopens the mic when one is not live, records with a
 * timeslice so data flushes as it goes, and a recording under MIN_RECORDING_BYTES is never sent.
 */

/**
 * Audio types to try, best first. Chrome and iOS 26 Safari take the first; older iOS Safari only
 * records audio/mp4 (AAC).
 */
const AUDIO_TYPES = ['audio/webm;codecs=opus', 'audio/mp4', 'audio/ogg;codecs=opus', 'audio/webm'];

/** Shorter than this is treated as an accidental tap and thrown away. */
export const MIN_RECORDING_MS = 400;

/**
 * Smaller than this holds no speech (a WebM header alone is a few hundred bytes; a 4 s iPhone
 * recording was 92 KB). The chat says "Didn't catch that" instead of sending it.
 */
export const MIN_RECORDING_BYTES = 1024;

/** MediaRecorder timeslice. Data is handed over every this often, so a stop never finds it empty. */
const TIMESLICE_MS = 250;

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
 * Whether a recording has enough bytes to hold speech.
 *
 * @param rec - A finished recording.
 * @returns False for the near-empty blobs iOS sometimes produces.
 */
export function hasAudio(rec: Recording): boolean {
  return rec.blob.size >= MIN_RECORDING_BYTES;
}

/**
 * Whether a held-open mic stream can still record: every audio track live and not muted.
 *
 * @param stream - The stream from getUserMedia, or null.
 * @returns False when the stream must be reopened.
 */
export function streamIsUsable(stream: Pick<MediaStream, 'getAudioTracks'> | null): boolean {
  if (!stream) return false;
  const tracks = stream.getAudioTracks();
  return tracks.length > 0 && tracks.every((t) => t.readyState === 'live' && !t.muted && t.enabled);
}

/**
 * Records while a button is held. Keeps the microphone stream open between recordings so the
 * permission prompt appears once and later presses start instantly, and reopens it when iOS has
 * ended or muted it.
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
    if (!streamIsUsable(this.stream)) {
      this.close();
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
    }
    const type = pickAudioType();
    this.chunks = [];
    this.rec = new MediaRecorder(this.stream as MediaStream, type ? { mimeType: type } : undefined);
    this.rec.ondataavailable = (e) => {
      if (e.data.size > 0) this.chunks.push(e.data);
    };
    this.startedAtMs = performance.now();
    this.rec.start(TIMESLICE_MS);
  }

  /**
   * Stop recording. Call from pointerup and pointercancel.
   *
   * Side effects: when the result is near-empty the mic stream is closed, so the next press reopens it.
   *
   * @returns The recording, or null when nothing was recording or it was shorter than MIN_RECORDING_MS.
   * A recording may still be near-empty: check it with `hasAudio`.
   */
  async stop(): Promise<Recording | null> {
    const rec = this.rec;
    if (!rec || rec.state === 'inactive') return null;
    this.rec = null;
    const stopped = new Promise<void>((resolve) => {
      rec.onstop = () => resolve();
    });
    rec.stop();
    await stopped;
    const durationMs = performance.now() - this.startedAtMs;
    if (durationMs < MIN_RECORDING_MS) return null;
    const type = rec.mimeType || pickAudioType() || 'application/octet-stream';
    const recording = { blob: new Blob(this.chunks, { type }), type, durationMs };
    if (!hasAudio(recording)) this.close();
    return recording;
  }

  /** Release the microphone (the browser's recording indicator goes away). */
  close(): void {
    for (const t of this.stream?.getTracks() ?? []) t.stop();
    this.stream = null;
  }
}
