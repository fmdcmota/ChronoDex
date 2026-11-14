/**
 * Chat screen's calls to the server: streamed guide replies, text to speech, speech to text.
 *
 * Owner: Agent 4. Spike for A4-07 and A4-08. Implements the client side of
 * POST /api/chat (Agent 1), POST /api/voice/tts and POST /api/voice/stt (Agent 2), MASTER.md section 4.3.
 * When the scaffold lands, these move behind Agent 1's typed client in `src/lib/client/`, which owns
 * mock mode (section 4.5). Until then the spike has its own mock, on unless `?api=<origin>` is given.
 *
 * Why the mock goes through the real parser: it emits SSE text in random-sized chunks, so the
 * streaming path tested here is the same one the real endpoint will exercise.
 */
import type { ChatMessage, ChatStreamEvent, EraId } from './contracts';
import { createChatStreamParser } from './sse';
import { sineWav } from '../media/tone';

/** Server origin from `?api=`, or null for mock mode. */
const API_ORIGIN = new URLSearchParams(location.search).get('api');
/** True when the spike answers from canned data instead of a server. */
export const USING_MOCKS = API_ORIGIN === null;

/** Mock timings, chosen to feel like a real streamed reply. */
const MOCK_FIRST_TOKEN_MS = 700;
const MOCK_CHUNK_MS = 45;
const MOCK_STT_MS = 900;
const MOCK_TTS_MS = 600;
/** Mock "speech": a short tone, since the spike has no TTS. */
const MOCK_TONE_HZ = 520;
const MOCK_TONE_MS = 600;

/** Body of POST /api/chat. */
export interface ChatRequest {
  eraId: EraId;
  playerId: string;
  messages: ChatMessage[];
}

/** Error with the server's `{ error: { code, message } }` body when there is one. */
export class ApiError extends Error {
  constructor(message: string, readonly code: string, readonly status: number) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Send the conversation and stream the guide's reply.
 *
 * Calls POST /api/chat (Agent 1). That endpoint runs the guide chat on Claude (CHAT_MODEL,
 * default claude-haiku-5-5), so expect about 1 s to the first delta and a fraction of a cent per reply.
 *
 * @param req - Era, player and the whole conversation so far, player's newest message last.
 * @param onEvent - Called for every delta, then once with done or error.
 * @param signal - Aborts the request, for example when the player leaves the screen.
 * @returns Resolves when the stream ends.
 * @throws ApiError when the server answers with an error status. Network failures throw TypeError.
 */
export async function streamChat(req: ChatRequest, onEvent: (e: ChatStreamEvent) => void, signal?: AbortSignal): Promise<void> {
  const body = USING_MOCKS ? mockChatBody(req) : await fetchStream(req, signal);
  const parser = createChatStreamParser(onEvent);
  const reader = body.getReader();
  // stream: true keeps a multi-byte character split across chunks intact.
  const decoder = new TextDecoder();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    parser.push(decoder.decode(value, { stream: true }));
  }
  parser.push(decoder.decode());
  parser.end();
}

/**
 * Speak a guide reply in the guide's voice.
 *
 * Calls POST /api/voice/tts (Agent 2), which picks the voice from the era's guide and uses
 * fal's Eleven v4 turbo at about $0.04 per 1,000 characters.
 *
 * @param eraId - Era whose guide's voice is used.
 * @param text - What to say.
 * @returns A playable audio URL.
 * @throws ApiError on an error status.
 */
export async function speak(eraId: EraId, text: string): Promise<string> {
  if (USING_MOCKS) {
    await delay(MOCK_TTS_MS);
    return URL.createObjectURL(new Blob([sineWav(MOCK_TONE_HZ, MOCK_TONE_MS)], { type: 'audio/wav' }));
  }
  const res = await fetch(`${API_ORIGIN}/api/voice/tts`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ eraId, text }),
  });
  const json = (await readJson(res)) as { audioUrl: string };
  return json.audioUrl;
}

/**
 * Turn a recording into text.
 *
 * Calls POST /api/voice/stt (Agent 2), multipart field `file`, which uses fal's Scribe v2 at
 * about $0.008 per minute.
 *
 * @param audio - The recording from the hold-to-talk button.
 * @param filename - Name with an extension matching the recording's type, for example "voice.m4a".
 * @returns The transcribed text, possibly empty.
 * @throws ApiError on an error status.
 */
export async function transcribe(audio: Blob, filename: string): Promise<string> {
  if (USING_MOCKS) {
    await delay(MOCK_STT_MS);
    return 'What did people wear around here back then?';
  }
  const form = new FormData();
  form.append('file', audio, filename);
  const res = await fetch(`${API_ORIGIN}/api/voice/stt`, { method: 'POST', body: form });
  const json = (await readJson(res)) as { text: string };
  return json.text;
}

async function fetchStream(req: ChatRequest, signal?: AbortSignal): Promise<ReadableStream<Uint8Array>> {
  const res = await fetch(`${API_ORIGIN}/api/chat`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'text/event-stream' },
    body: JSON.stringify(req),
    signal,
  });
  if (!res.ok || !res.body) await readJson(res);
  return res.body as ReadableStream<Uint8Array>;
}

/** Parse a JSON response, turning the contract's error body into an ApiError. */
async function readJson(res: Response): Promise<unknown> {
  const json: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    const err = (json as { error?: { code?: string; message?: string } } | null)?.error;
    throw new ApiError(err?.message ?? `HTTP ${res.status}`, err?.code ?? 'http_error', res.status);
  }
  return json;
}

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/** Canned replies, chosen by a keyword in the player's message. In the voice of the fixture guide. */
const MOCK_REPLIES: Array<[RegExp, string]> = [
  [/wear|cloth|dress|hat/i, "Oh, everyone's in their Sunday best on the Institute's opening days! Gentlemen in frock coats and top hats, ladies in bustled skirts. Fun fact: the Institute's tower bells were a gift from an Australian lady, and you could hear them right across South Kensington."],
  [/eat|food|tea|drink/i, "You'll want our tea room, dear: a pot of tea and a slice of seed cake for a few pennies. Fun fact: visitors here could sample goods sent from all over the Empire, right under one roof."],
  [/next|visit|where|go/i, "If you've the legs for it, pop round to the Royal Albert Hall, barely two hundred and fifty yards to the north-west. You haven't collected it yet, have you?"],
];
const MOCK_FALLBACK = "Now that's a question I can't rightly answer, I'm only the tea-room attendant! But ask me about the clothes, the food, or where to go next and I'll talk your ear off.";

/** Build an SSE byte stream that answers the last player message in random-sized chunks. */
function mockChatBody(req: ChatRequest): ReadableStream<Uint8Array> {
  const last = [...req.messages].reverse().find((m) => m.role === 'player')?.text ?? '';
  if (/error/i.test(last)) {
    return sseStream([{ type: 'error', message: 'Mock error: the guide lost their train of thought.' }], MOCK_FIRST_TOKEN_MS);
  }
  const reply = MOCK_REPLIES.find(([re]) => re.test(last))?.[1] ?? MOCK_FALLBACK;
  const words = reply.match(/\S+\s*/g) ?? [reply];
  const events: ChatStreamEvent[] = words.map((w) => ({ type: 'delta', text: w }));
  events.push({ type: 'done', text: reply });
  return sseStream(events, MOCK_FIRST_TOKEN_MS);
}

/** Encode events as SSE text and emit them split at random points, with delays. */
function sseStream(events: ChatStreamEvent[], firstMs: number): ReadableStream<Uint8Array> {
  const text = events.map((e) => `data: ${JSON.stringify(e)}\n\n`).join('');
  const enc = new TextEncoder();
  let pos = 0;
  let first = true;
  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      await delay(first ? firstMs : MOCK_CHUNK_MS);
      first = false;
      if (pos >= text.length) { controller.close(); return; }
      // Random cut points, so events arrive split mid-line and mid-JSON like real network chunks.
      const size = 8 + Math.floor(Math.random() * 40);
      controller.enqueue(enc.encode(text.slice(pos, pos + size)));
      pos += size;
    },
  });
}
