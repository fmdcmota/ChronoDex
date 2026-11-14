/**
 * The interface both client implementations (real and mock) satisfy.
 *
 * Owner: Agent 1 (Core). Implements MASTER.md section 4.3 as one method per endpoint.
 */
import type {
  Capture,
  CaptureRequest,
  CaptureResult,
  ChatRequest,
  ChatStreamEvent,
  Era,
  EraId,
  EraResponse,
  Landmark,
  LandmarkId,
} from '@/lib/contracts';

/** Options for streamChat. */
export interface ChatOptions {
  /** Abort to stop the stream, for example when the player leaves the screen. The generator then ends quietly. */
  signal?: AbortSignal;
}

/**
 * One method per HTTP endpoint. Every method throws ApiError on failure.
 * Single-field responses are unwrapped: listLandmarks returns the array, not `{ landmarks }`.
 */
export interface ChronodexApi {
  /** GET /api/landmarks. */
  listLandmarks(): Promise<Landmark[]>;
  /** GET /api/players/[playerId]/dex: the player's captures. */
  getDex(playerId: string): Promise<Capture[]>;
  /** POST /api/captures. A capture that is too far is a normal result (`ok: false`), not an error. */
  postCapture(body: CaptureRequest): Promise<CaptureResult>;
  /** GET /api/landmarks/[landmarkId]/eras: one era per year, ascending. */
  listEras(landmarkId: LandmarkId): Promise<Era[]>;
  /** GET /api/eras/[eraId]. Poll every GAME.POLL_INTERVAL_MS while `job` is not null. */
  getEra(eraId: EraId): Promise<EraResponse>;
  /** POST /api/eras/[eraId]/generate. Safe to call twice; `job` is null when nothing is missing. */
  generateEra(eraId: EraId, includeVideo: boolean): Promise<EraResponse>;
  /** POST /api/chat, as an async stream of events ending with `done` or `error`. */
  streamChat(body: ChatRequest, options?: ChatOptions): AsyncGenerator<ChatStreamEvent>;
  /** POST /api/uploads. Send a JPEG under 4 MB, already resized to 1600 px. Returns its public URL. */
  uploadPhoto(file: Blob): Promise<string>;
  /** POST /api/voice/tts. Speaks `text` in the era's guide voice. Returns an audio URL. */
  textToSpeech(eraId: EraId, text: string): Promise<string>;
  /** POST /api/voice/stt. Transcribes a MediaRecorder recording. Returns the text. */
  speechToText(audio: Blob): Promise<string>;
}
