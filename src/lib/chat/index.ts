/**
 * The guide chat: stream an in-character reply from Claude as ChatStreamEvents.
 *
 * Owner: Agent 1 (Core). Implements MASTER.md section 7 (guide chat), task A1-13.
 *
 * External call: Claude Messages API, streaming, model CHAT_MODEL (default claude-haiku-5-5) at
 * effort `low`, which suits short chat replies. Typical cost: under $0.001 per reply (about 2k
 * input and 100 output tokens at $0.10 / $0.50 per million). Typical time: first words in about a
 * second. On failure the stream ends with an `error` event; nothing is thrown to the caller.
 * Claude Haiku 5.5 has no server-side refusal fallback, so a refusal also ends with `error`.
 */
import Anthropic from '@anthropic-ai/sdk';
import { haversineM, type ChatMessage, type ChatStreamEvent, type Era, type Guide, type Landmark } from '@/lib/contracts';
import { getAnthropic, type AnthropicLike } from './anthropic';
import { buildGuideSystemPrompt, toClaudeMessages, type NextLandmarkSuggestion } from './prompt';

export { ChatInputError, buildGuideSystemPrompt, toClaudeMessages, type NextLandmarkSuggestion } from './prompt';
export { getAnthropic } from './anthropic';

/** Default chat model (MASTER.md section 7). Override with CHAT_MODEL. */
export const DEFAULT_CHAT_MODEL = 'claude-haiku-5-5';

/**
 * Ceiling on output tokens per reply, thinking included. Replies are a few sentences; this only
 * stops a runaway reply. Reaching it ends the reply where it stopped.
 */
const CHAT_MAX_TOKENS = 4096;

/** Shown when Claude cannot be reached or declines. In character, because the player sees it. */
const CHAT_FAILED_MESSAGE = 'The guide seems lost for words. Try asking again in a moment.';
const CHAT_REFUSED_MESSAGE = 'The guide would rather not answer that one. Try asking something else.';

/**
 * Pick the landmark the guide should suggest: the nearest one the player has not collected.
 *
 * @param current - The landmark being chatted about. Never suggested.
 * @param all - Every landmark.
 * @param collectedIds - Ids of landmarks the player has collected.
 * @returns The suggestion, or null when everything else is collected.
 */
export function pickNextLandmark(
  current: Landmark,
  all: readonly Landmark[],
  collectedIds: ReadonlySet<string>,
): NextLandmarkSuggestion | null {
  const candidates = all
    .filter((l) => l.id !== current.id && !collectedIds.has(l.id))
    .map((l) => ({ name: l.name, distanceM: haversineM(current.photoSpot, l.photoSpot) }))
    .sort((a, b) => a.distanceM - b.distanceM);
  return candidates[0] ?? null;
}

/** Input to streamGuideReply. */
export interface GuideReplyInput {
  era: Era & { guide: Guide };
  landmark: Landmark;
  suggestion: NextLandmarkSuggestion | null;
  /** Whole history, oldest first, ending with the player's new message. */
  messages: readonly ChatMessage[];
  /** Abort to stop generating, for example when the player closes the chat. */
  signal?: AbortSignal;
  /** Injected in tests. Defaults to the shared client. */
  client?: AnthropicLike;
}

/**
 * Stream the guide's reply.
 *
 * Yields `delta` events as text arrives, then exactly one `done` (with the full text) or `error`.
 * An aborted request ends the stream quietly with no final event.
 *
 * @param input - Era, landmark, suggestion, history, signal.
 * @returns An async stream of ChatStreamEvent.
 * @throws ChatInputError on the first read, before any request is made, when the history cannot
 *   be sent. A generator runs only when read, so callers that need a clean 400 should check the
 *   history with toClaudeMessages first, as POST /api/chat does.
 */
export async function* streamGuideReply(input: GuideReplyInput): AsyncGenerator<ChatStreamEvent> {
  const messages = toClaudeMessages(input.messages);
  const system = buildGuideSystemPrompt(input);
  let text = '';
  try {
    const client = input.client ?? getAnthropic();
    const stream = client.messages.stream(
      {
        model: process.env.CHAT_MODEL || DEFAULT_CHAT_MODEL,
        max_tokens: CHAT_MAX_TOKENS,
        // The system prompt is stable for an era; caching it makes later turns cheaper.
        system: [{ type: 'text', text: system, cache_control: { type: 'ephemeral' } }],
        messages,
        output_config: { effort: 'low' },
      },
      { signal: input.signal },
    );
    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        text += event.delta.text;
        yield { type: 'delta', text: event.delta.text };
      }
    }
    const final = await stream.finalMessage();
    if (final.stop_reason === 'refusal') {
      yield { type: 'error', message: CHAT_REFUSED_MESSAGE };
      return;
    }
    yield { type: 'done', text };
  } catch (err) {
    if (err instanceof Anthropic.APIUserAbortError || input.signal?.aborted) return;
    console.error('Guide chat failed', err);
    yield { type: 'error', message: CHAT_FAILED_MESSAGE };
  }
}
