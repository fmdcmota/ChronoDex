/**
 * The real implementation of the typed API client: fetch calls to the routes in MASTER.md 4.3.
 *
 * Owner: Agent 1 (Core). Task A1-05. Do not import this directly; import `api` from
 * "@/lib/client", which switches to mock mode when NEXT_PUBLIC_USE_MOCKS=1.
 */
import type {
  CaptureRequest,
  CaptureResult,
  ChatRequest,
  ChatStreamEvent,
  DexResponse,
  Era,
  EraId,
  EraResponse,
  ErasResponse,
  Landmark,
  LandmarkId,
  LandmarksResponse,
  SttResponse,
  TtsResponse,
  UploadResponse,
} from '@/lib/contracts';
import { ApiError } from './errors';
import { SseParser } from './sse';
import type { ChatOptions, ChronodexApi } from './types';

/**
 * Send a request and decode a JSON response, turning any failure into an ApiError.
 *
 * @param path - Site-relative path, for example "/api/landmarks".
 * @param init - fetch options.
 * @returns The parsed body.
 * @throws ApiError with the server's code and message, or code "network_error" with status 0.
 */
async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, init);
  } catch (err) {
    throw new ApiError(0, 'network_error', err instanceof Error ? err.message : 'Network request failed');
  }
  if (!res.ok) throw await errorFrom(res);
  return (await res.json()) as T;
}

/**
 * Build an ApiError from a failed response, reading `{ error: { code, message } }` if present.
 *
 * @param res - The non-2xx response.
 * @returns The error to throw.
 */
async function errorFrom(res: Response): Promise<ApiError> {
  try {
    const body = (await res.json()) as { error?: { code?: string; message?: string } };
    return new ApiError(res.status, body.error?.code ?? 'http_error', body.error?.message ?? res.statusText);
  } catch {
    return new ApiError(res.status, 'http_error', res.statusText || `HTTP ${res.status}`);
  }
}

/** JSON POST options. */
function postJson(body: unknown, signal?: AbortSignal): RequestInit {
  return { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal };
}

/** Multipart POST options with one field named `file`. */
function postFile(file: Blob, filename: string): RequestInit {
  const form = new FormData();
  form.append('file', file, filename);
  return { method: 'POST', body: form };
}

/** The client that talks to the real API. */
export const httpApi: ChronodexApi = {
  /** See ChronodexApi.listLandmarks in ./types.ts. */
  async listLandmarks(): Promise<Landmark[]> {
    return (await request<LandmarksResponse>('/api/landmarks')).landmarks;
  },

  /** See ChronodexApi.getDex in ./types.ts. */
  async getDex(playerId: string) {
    return (await request<DexResponse>(`/api/players/${encodeURIComponent(playerId)}/dex`)).captures;
  },

  /** See ChronodexApi.postCapture in ./types.ts. */
  postCapture(body: CaptureRequest): Promise<CaptureResult> {
    return request<CaptureResult>('/api/captures', postJson(body));
  },

  /** See ChronodexApi.listEras in ./types.ts. */
  async listEras(landmarkId: LandmarkId): Promise<Era[]> {
    return (await request<ErasResponse>(`/api/landmarks/${encodeURIComponent(landmarkId)}/eras`)).eras;
  },

  /** See ChronodexApi.getEra in ./types.ts. */
  getEra(eraId: EraId): Promise<EraResponse> {
    return request<EraResponse>(`/api/eras/${encodeURIComponent(eraId)}`);
  },

  /** See ChronodexApi.generateEra in ./types.ts. */
  generateEra(eraId: EraId, includeVideo: boolean): Promise<EraResponse> {
    return request<EraResponse>(`/api/eras/${encodeURIComponent(eraId)}/generate`, postJson({ includeVideo }));
  },

  /** See ChronodexApi.streamChat in ./types.ts. */
  async *streamChat(body: ChatRequest, options?: ChatOptions): AsyncGenerator<ChatStreamEvent> {
    let res: Response;
    try {
      res = await fetch('/api/chat', postJson(body, options?.signal));
    } catch (err) {
      if (options?.signal?.aborted) return;
      throw new ApiError(0, 'network_error', err instanceof Error ? err.message : 'Network request failed');
    }
    if (!res.ok) throw await errorFrom(res);
    if (!res.body) throw new ApiError(res.status, 'empty_stream', 'The chat response had no body');

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    const parser = new SseParser();
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        for (const event of parser.push(decoder.decode(value, { stream: true }))) yield event;
      }
      for (const event of parser.push(decoder.decode())) yield event;
      for (const event of parser.end()) yield event;
    } catch (err) {
      if (options?.signal?.aborted) return;
      throw new ApiError(0, 'network_error', err instanceof Error ? err.message : 'The chat stream broke');
    } finally {
      reader.releaseLock();
    }
  },

  /** See ChronodexApi.uploadPhoto in ./types.ts. */
  async uploadPhoto(file: Blob): Promise<string> {
    return (await request<UploadResponse>('/api/uploads', postFile(file, 'capture.jpg'))).url;
  },

  /** See ChronodexApi.textToSpeech in ./types.ts. */
  async textToSpeech(eraId: EraId, text: string): Promise<string> {
    return (await request<TtsResponse>('/api/voice/tts', postJson({ eraId, text }))).audioUrl;
  },

  /** See ChronodexApi.speechToText in ./types.ts. */
  async speechToText(audio: Blob): Promise<string> {
    const extension = audio.type.includes('mp4') ? 'mp4' : audio.type.includes('ogg') ? 'ogg' : 'webm';
    return (await request<SttResponse>('/api/voice/stt', postFile(audio, `speech.${extension}`))).text;
  },
};
