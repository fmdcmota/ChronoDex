/**
 * A fake Anthropic client for unit tests of the Historian and the guide chat. Never used in the app.
 *
 * Owner: Agent 1 (Core). Each call to `messages.stream` or `beta.messages.stream` takes the next
 * scripted response, records the request, and replays the response's text as stream events.
 */
import type { AnthropicLike } from './anthropic';

/** One scripted response. */
export interface FakeResponse {
  /** Text deltas to stream, joined into one text block in the final message. */
  text?: string[];
  stop_reason?: string;
  /** Overrides the final message content (for example, to add server tool blocks). */
  content?: unknown[];
  /** For structured output responses. */
  parsed_output?: unknown;
  /** Throw this instead of responding. */
  error?: Error;
}

/** A fake client and the requests it received. */
export interface FakeClient {
  client: AnthropicLike;
  requests: Array<Record<string, unknown>>;
}

/**
 * Create a fake client that answers with the given responses in order.
 *
 * @param responses - One per expected call.
 * @returns The client and its request log.
 */
export function fakeAnthropic(responses: FakeResponse[]): FakeClient {
  const requests: Array<Record<string, unknown>> = [];
  const queue = [...responses];

  const stream = (params: Record<string, unknown>) => {
    // JSON copy: the caller mutates its message list later, and output formats carry functions.
    requests.push(JSON.parse(JSON.stringify(params)));
    const response = queue.shift();
    if (!response) throw new Error('fakeAnthropic: no response left');
    const text = response.text ?? [];
    return {
      async *[Symbol.asyncIterator]() {
        if (response.error) throw response.error;
        for (const t of text) yield { type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text: t } };
      },
      async finalMessage() {
        if (response.error) throw response.error;
        return {
          stop_reason: response.stop_reason ?? 'end_turn',
          content: response.content ?? [{ type: 'text', text: text.join('') }],
          parsed_output: response.parsed_output ?? null,
        };
      },
    };
  };

  const client = { messages: { stream }, beta: { messages: { stream } } } as unknown as AnthropicLike;
  return { client, requests };
}
