/**
 * A minimal streaming client for DeepSeek's chat completions API, used by the guide chat.
 *
 * Owner: Agent 1 (Core). Task A1-13, after the team chose DeepSeek for the chat (decision D-024).
 *
 * API (checked against https://api-docs.deepseek.com on 14 Nov 2026):
 * - POST https://api.deepseek.com/chat/completions, header `Authorization: Bearer <DEEPSEEK_API_KEY>`.
 * - OpenAI-style body: `model`, `messages` (roles system, user, assistant), `stream: true`,
 *   `max_tokens`, `reasoning_effort` (`none` turns thinking off).
 * - Stream: data-only server-sent events, one `chat.completion.chunk` JSON per `data:` line,
 *   text in `choices[0].delta.content`, ending with `data: [DONE]`.
 * Written on fetch rather than a vendor SDK, so it adds no dependency. Unit tested in chat.test.ts.
 */

/** DeepSeek's OpenAI-format endpoint. */
export const DEEPSEEK_CHAT_URL = 'https://api.deepseek.com/chat/completions';

/** One message in DeepSeek's format. */
export interface DeepSeekMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/** Request options for streamDeepSeek. */
export interface DeepSeekRequest {
  model: string;
  messages: DeepSeekMessage[];
  maxTokens: number;
  /** `none` turns thinking off, which suits short chat replies. */
  reasoningEffort: 'none' | 'low' | 'high' | 'max';
  apiKey: string;
  signal?: AbortSignal;
  /** Injected in tests. Defaults to the global fetch. */
  fetchImpl?: typeof fetch;
}

/** What the stream yields: text as it arrives, then why it stopped. */
export type DeepSeekEvent = { type: 'text'; text: string } | { type: 'finish'; reason: string };

/** DeepSeek answered with an error status, or the stream could not be read. */
export class DeepSeekError extends Error {
  /** HTTP status, or 0 when there was no response. */
  readonly status: number;

  /**
   * Create a DeepSeekError.
   *
   * @param status - HTTP status, or 0.
   * @param message - What went wrong.
   */
  constructor(status: number, message: string) {
    super(message);
    this.name = 'DeepSeekError';
    this.status = status;
  }
}

/** The fields of a streamed chunk this client reads. */
interface Chunk {
  choices?: Array<{ delta?: { content?: string | null }; finish_reason?: string | null }>;
}

/**
 * Stream a chat completion from DeepSeek.
 *
 * @param req - Model, messages, limits, key and optional signal.
 * @returns Text events as they arrive, then one `finish` event with DeepSeek's finish_reason
 *   (`stop`, `length`, `content_filter`, ...). `finish` reason is `unknown` if the stream ended without one.
 * @throws DeepSeekError on a non-2xx response or a malformed stream. An aborted signal throws the
 *   fetch abort error, which callers should treat as a quiet stop.
 */
export async function* streamDeepSeek(req: DeepSeekRequest): AsyncGenerator<DeepSeekEvent> {
  const doFetch = req.fetchImpl ?? fetch;
  const res = await doFetch(DEEPSEEK_CHAT_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${req.apiKey}` },
    body: JSON.stringify({
      model: req.model,
      messages: req.messages,
      stream: true,
      max_tokens: req.maxTokens,
      reasoning_effort: req.reasoningEffort,
    }),
    signal: req.signal,
  });
  if (!res.ok || !res.body) {
    const detail = await res.text().catch(() => '');
    throw new DeepSeekError(res.status, `DeepSeek returned ${res.status}: ${detail.slice(0, 300)}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let finish: string | null = null;
  try {
    while (true) {
      const { done, value } = await reader.read();
      buffer += done ? decoder.decode() : decoder.decode(value, { stream: true });
      let newline: number;
      while ((newline = buffer.indexOf('\n')) !== -1) {
        const line = buffer.slice(0, newline).replace(/\r$/, '');
        buffer = buffer.slice(newline + 1);
        if (!line.startsWith('data:')) continue; // blank separators and keep-alive comments
        const payload = line.slice('data:'.length).trim();
        if (payload === '[DONE]') {
          yield { type: 'finish', reason: finish ?? 'unknown' };
          return;
        }
        let chunk: Chunk;
        try {
          chunk = JSON.parse(payload) as Chunk;
        } catch {
          throw new DeepSeekError(res.status, 'DeepSeek sent a malformed stream chunk');
        }
        const choice = chunk.choices?.[0];
        const text = choice?.delta?.content;
        if (text) yield { type: 'text', text };
        if (choice?.finish_reason) finish = choice.finish_reason;
      }
      if (done) break;
    }
  } finally {
    reader.releaseLock();
  }
  yield { type: 'finish', reason: finish ?? 'unknown' };
}
