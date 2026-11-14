/**
 * Request and response bodies of the HTTP API, as TypeScript types.
 *
 * Owner: Agent 1 (Core). Implements MASTER.md section 4.3, which describes these shapes in prose.
 * The typed client (src/lib/client) and the route handlers (src/app/api) both use them, so the two
 * cannot drift apart.
 */
import type {
  Capture,
  ChatMessage,
  Era,
  EraId,
  Job,
  Landmark,
  LatLng,
} from './types';

/** Body of every error response, sent with a 4xx or 5xx status. */
export interface ApiErrorBody {
  error: {
    /** Machine-readable, for example "not_found" or "bad_request". */
    code: string;
    /** For a developer. Not shown to players as is. */
    message: string;
  };
}

/** GET /api/landmarks */
export interface LandmarksResponse {
  landmarks: Landmark[];
}

/** GET /api/players/[playerId]/dex */
export interface DexResponse {
  captures: Capture[];
}

/**
 * POST /api/captures request.
 *
 * `location` may be null: the server then answers `{ ok: false, reason: 'location_missing' }`
 * instead of a 400, so the Capture screen can show a helpful message. `spoofed` is set by the
 * development spoof panel; the server accepts spoofed captures only when ALLOW_SPOOFED_LOCATION=1.
 */
export interface CaptureRequest {
  playerId: string;
  photoUrl: string;
  location: LatLng | null;
  accuracyM: number;
  /** True when the location came from the dev spoof panel, not from the device. */
  spoofed?: boolean;
}

/** GET /api/landmarks/[landmarkId]/eras. One era per entry in the landmark's eraYears. */
export interface ErasResponse {
  eras: Era[];
}

/** GET /api/eras/[eraId] and POST /api/eras/[eraId]/generate. `job` is the active job, if any. */
export interface EraResponse {
  era: Era;
  job: Job | null;
}

/** POST /api/eras/[eraId]/generate request. */
export interface GenerateRequest {
  includeVideo: boolean;
}

/** POST /api/chat request. The response is a `text/event-stream` of ChatStreamEvent. */
export interface ChatRequest {
  eraId: EraId;
  playerId: string;
  /** The whole conversation so far, oldest first, ending with the player's new message. */
  messages: ChatMessage[];
}

/** POST /api/uploads response. The request is multipart with field `file`, JPEG, under 4 MB. */
export interface UploadResponse {
  url: string;
}

/** POST /api/voice/tts request. The server picks the voice from the era's guide. */
export interface TtsRequest {
  eraId: EraId;
  text: string;
}

/** POST /api/voice/tts response. */
export interface TtsResponse {
  audioUrl: string;
}

/** POST /api/voice/stt response. The request is multipart with field `file`, recorded audio. */
export interface SttResponse {
  text: string;
}

/** Largest upload POST /api/uploads accepts. Vercel caps request bodies at about 4.5 MB. */
export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;
