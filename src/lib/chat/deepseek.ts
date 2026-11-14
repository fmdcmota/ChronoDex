/**
 * A minimal streaming client for DeepSeek's chat completions API, used by the guide chat and by
 * the Historian.
 *
 * Owner: Agent 1 (Core). Tasks A1-11 and A1-13, decisions D-024 and D-026 (DeepSeek replaces
 * Claude for both).
 *
 * API (checked against https://api-docs.deepseek.com on 14 Nov 2026):
 * - POST https://api.deepseek.com/chat/completions, header `Authorization: Bearer <DEEPSEEK_API_KEY>`.
 * - OpenAI-style body: `model`, `messages`, `stream: true`, `max_tokens`, `reasoning_effort`
 *   (`none` turns thinking off), `thinking`, `response_format: { type: "json_object" }`.
 * - Server-side web tools: `tools: [{ type: "deepseek_web_search" }, { type: "deepseek_read_url" }]`.
 *   The server runs the searches inside the one request (no client tool loop). The searches it ran
 *   and the citations it used arrive in the last chunk's delta as `server_tool_calls` and
 *   `annotations`. JSON mode cannot be combined with these tools (the API answers 400).
 * - Stream: data-only server-sent events, one `chat.completion.chunk` JSON per `data:` line, text in
 *   `choices[0].delta.content`, ending with `data: [DONE]`.
 * Written on fetch rather than a vendor SDK, so it adds no dependency. Unit tested in chat.test.ts.
 */

/** DeepSeek's OpenAI-format endpoint. */
export const DEEPSEEK_CHAT_URL = 'https://api.deepseek.com/chat/completions';

/** One message in DeepSeek's format. */
export interface DeepSeekMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/** A server-side web tool DeepSeek can run for a request. */
export type DeepSeekWebTool = { type: 'deepseek_web_search' } | { type: 'deepseek_read_url' };

/** Request options for streamDeepSeek. */
export interface DeepSeekRequest {
  model: string;
  messages: DeepSeekMessage[];
  maxTokens: number;
  /** `none` turns thinking off, which suits short chat replies and writing from notes. */
  reasoningEffort: 'none' | 'low' | 'high' | 'max';
  apiKey: string;
  /** Server-side web tools. Cannot be combined with `json`. */
  tools?: DeepSeekWebTool[];
  /** Ask for a single JSON object. The prompt must contain the word "json" and an example. */
  json?: boolean;
  signal?: AbortSignal;
  /** Injected in tests. Defaults to the global fetch. */
  fetchImpl?: typeof fetch;
}

/** What the stream yields: text, then (with web tools) what was searched, then why it stopped. */
export type DeepSeekEvent =
  | { type: 'text'; text: string }
  | { type: 'extras'; annotations: unknown[]; serverToolCalls: unknown[] }
  | { type: 'finish'; reason: string };

/** DeepSeek answered with an error status, or the stream could not be read. */
export class DeepSeekError extends Error {
  /** HTTP status, or 0 when there was no response. */
  readonly status: number;
  /** True when asking again may work: DeepSeek said "please retry", or the status is 429 or 5xx. */
  readonly retryable: boolean;

  /**
   * Create a DeepSeekError.
   *
   * @param status - HTTP status, or 0.
   * @param message - What went wrong.
   * @param retryable - Whether a retry may succeed. Defaults to true for 429 and 5xx.
   */
  constructor(status: number, message: string, retryable: boolean = status === 429 || status >= 500) {
    super(message);
    this.name = 'DeepSeekError';
    this.status = status;
    this.retryable = retryable;
  }
}

/** The fields of a streamed chunk this client reads. */
interface Chunk {
  /**
   * DeepSeek reports a failure that happens mid-stream inside the stream itself, with a normal
   * 200 status. Seen on 14 Nov 2026: "The model failed to generate a complete response. Please
   * retry." arrived in the final chunk of a web-search request, after the reasoning but before
   * any answer text.
   */
  error?: { message?: string };
  choices?: Array<{
    delta?: { content?: string | null; annotations?: unknown[]; server_tool_calls?: unknown[] };
    finish_reason?: string | null;
  }>;
}

/**
 * Stream a chat completion from DeepSeek.
 *
 * @param req - Model, messages, limits, key, and optional tools, JSON mode and signal.
 * @returns Text events as they arrive; an `extras` event when DeepSeek reports citations or the
 *   searches it ran (web tools only); then one `finish` event with DeepSeek's finish_reason
 *   (`stop`, `length`, `content_filter`, ...), or `unknown` if the stream ended without one.
 * @throws DeepSeekError on a non-2xx response or a malformed stream. An aborted signal throws the
 *   fetch abort error, which callers should treat as a quiet stop.
 */
export async function* streamDeepSeek(req: DeepSeekRequest): AsyncGenerator<DeepSeekEvent> {
  const doFetch = req.fetchImpl ?? fetch;
  const body: Record<string, unknown> = {
    model: req.model,
    messages: req.messages,
    stream: true,
    max_tokens: req.maxTokens,
    reasoning_effort: req.reasoningEffort,
  };
  if (req.tools?.length) body.tools = req.tools;
  if (req.json) body.response_format = { type: 'json_object' };

  const res = await doFetch(DEEPSEEK_CHAT_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${req.apiKey}` },
    body: JSON.stringify(body),
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
  let annotations: unknown[] = [];
  let serverToolCalls: unknown[] = [];
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
          if (annotations.length || serverToolCalls.length) yield { type: 'extras', annotations, serverToolCalls };
          yield { type: 'finish', reason: finish ?? 'unknown' };
          return;
        }
        let chunk: Chunk;
        try {
          chunk = JSON.parse(payload) as Chunk;
        } catch {
          throw new DeepSeekError(res.status, 'DeepSeek sent a malformed stream chunk');
        }
        if (chunk.error) {
          const message = chunk.error.message ?? 'unknown error';
          throw new DeepSeekError(res.status, `DeepSeek failed mid-stream: ${message}`, /retry/i.test(message));
        }
        const choice = chunk.choices?.[0];
        const text = choice?.delta?.content;
        if (text) yield { type: 'text', text };
        // Web tools send the complete lists once, in the last chunk's delta.
        if (Array.isArray(choice?.delta?.annotations)) annotations = choice.delta.annotations;
        if (Array.isArray(choice?.delta?.server_tool_calls)) serverToolCalls = choice.delta.server_tool_calls;
        if (choice?.finish_reason) finish = choice.finish_reason;
      }
      if (done) break;
    }
  } finally {
    reader.releaseLock();
  }
  if (annotations.length || serverToolCalls.length) yield { type: 'extras', annotations, serverToolCalls };
  yield { type: 'finish', reason: finish ?? 'unknown' };
}

/** The whole answer of a streamed request, collected. */
export interface DeepSeekCompletion {
  text: string;
  finishReason: string;
  /** Every URL DeepSeek reports having searched, read or cited. Empty without web tools. */
  urls: string[];
}

/**
 * Run a request to the end and collect it. For callers that do not stream to a person, such as
 * the Historian.
 *
 * @param req - As for streamDeepSeek.
 * @returns The text, the finish reason, and the URLs DeepSeek reported.
 * @throws DeepSeekError, as streamDeepSeek does.
 */
export async function completeDeepSeek(req: DeepSeekRequest): Promise<DeepSeekCompletion> {
  let text = '';
  let finishReason = 'unknown';
  const urls = new Set<string>();
  for await (const event of streamDeepSeek(req)) {
    if (event.type === 'text') text += event.text;
    else if (event.type === 'extras') for (const url of collectUrls([event.annotations, event.serverToolCalls])) urls.add(url);
    else finishReason = event.reason;
  }
  return { text, finishReason, urls: [...urls] };
}

/**
 * Find every http(s) URL stored under a key named `url` anywhere inside a JSON value.
 *
 * DeepSeek's `annotations` and `server_tool_calls` nest URLs at several depths (search sources,
 * opened pages, citations), and the exact shape of `page` entries is not documented, so this
 * walks the whole value instead of reading fixed paths.
 *
 * @param value - Any JSON value.
 * @returns The URLs, in order of first appearance, without duplicates.
 */
export function collectUrls(value: unknown): string[] {
  const found = new Set<string>();
  const walk = (v: unknown): void => {
    if (Array.isArray(v)) {
      for (const item of v) walk(item);
    } else if (v && typeof v === 'object') {
      for (const [key, inner] of Object.entries(v)) {
        if (key === 'url' && typeof inner === 'string' && /^https?:\/\//i.test(inner)) found.add(inner);
        else walk(inner);
      }
    }
  };
  walk(value);
  return [...found];
}
