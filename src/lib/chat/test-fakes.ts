/**
 * Fakes for unit tests of everything that calls DeepSeek: a fake `fetch` that replays scripted
 * streams, and a builder for DeepSeek-style server-sent events. Never used in the app.
 *
 * Owner: Agent 1 (Core). Shared by chat.test.ts and the Historian's tests.
 */

/** Extra fields DeepSeek puts on the last chunk of a web-tool request, or an in-stream failure. */
export interface SseExtras {
  annotations?: unknown[];
  serverToolCalls?: unknown[];
  /** An in-stream error message: the stream ends with an `error` field instead of a finish reason. */
  error?: string;
}

/**
 * Build an SSE body in DeepSeek's format, split into fixed-size pieces to test buffering.
 *
 * @param deltas - Text pieces, each sent as one chunk's `delta.content`.
 * @param finish - The finish_reason of the last chunk.
 * @param chunkSize - Piece size in characters. Small values split lines and JSON mid-way.
 * @param extras - Citations, searches or an in-stream error to put on the last chunk.
 * @returns The body, as the pieces a network would deliver.
 */
export function sse(deltas: string[], finish = 'stop', chunkSize = 7, extras: SseExtras = {}): string[] {
  const last: Record<string, unknown> = {};
  if (extras.annotations) last.annotations = extras.annotations;
  if (extras.serverToolCalls) last.server_tool_calls = extras.serverToolCalls;
  const lines = [
    ...deltas.map((t) => `data: ${JSON.stringify({ object: 'chat.completion.chunk', choices: [{ index: 0, delta: { content: t }, finish_reason: null }] })}\n\n`),
    extras.error
      ? `data: ${JSON.stringify({ choices: [], error: { message: extras.error } })}\n\n`
      : `data: ${JSON.stringify({ choices: [{ index: 0, delta: last, finish_reason: finish }] })}\n\n`,
    ': keep-alive\n\n',
    'data: [DONE]\n\n',
  ].join('');
  const parts: string[] = [];
  for (let i = 0; i < lines.length; i += chunkSize) parts.push(lines.slice(i, i + chunkSize));
  return parts;
}

/** One scripted answer: a stream (from sse) or an error status. */
export type FakeAnswer = string[] | { status: number; text: string };

/** A recorded request. */
export interface FakeCall {
  url: string;
  init: RequestInit;
  /** The parsed JSON body. */
  body: Record<string, unknown> & { messages: Array<{ role: string; content: string }> };
}

/**
 * A fake `fetch` that answers each request with the next scripted answer, and records the requests.
 *
 * @param answers - One per expected request, in order. Running out throws.
 * @returns The fetch implementation and the recorded calls.
 */
export function fakeFetch(...answers: FakeAnswer[]): { impl: typeof fetch; calls: FakeCall[] } {
  const calls: FakeCall[] = [];
  const queue = [...answers];
  const impl = (async (url: string, init: RequestInit) => {
    calls.push({ url, init, body: JSON.parse(String(init.body)) });
    const answer = queue.shift();
    if (!answer) throw new Error('fakeFetch: no answer left');
    if (!Array.isArray(answer)) return new Response(answer.text, { status: answer.status });
    const encoder = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        for (const part of answer) controller.enqueue(encoder.encode(part));
        controller.close();
      },
    });
    return new Response(stream, { status: 200, headers: { 'Content-Type': 'text/event-stream' } });
  }) as unknown as typeof fetch;
  return { impl, calls };
}
