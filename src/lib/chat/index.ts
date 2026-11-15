/**
 * The guide chat: stream an in-character reply from DeepSeek as ChatStreamEvents.
 *
 * Owner: Agent 1 (Core). Implements the chat rules of MASTER.md section 7, task A1-13. The team
 * chose DeepSeek instead of Claude for the chat (decision D-024); the Historian stays on Claude.
 *
 * External call: DeepSeek chat completions (./deepseek.ts), streaming, model CHAT_MODEL (default
 * deepseek-flash), thinking off (`reasoning_effort: "none"`) so the first words come quickly.
 * Typical cost: about $0.0006 per reply at peak prices (about 1.5k input tokens at $0.30 and 100
 * output tokens at $1.20 per million; half that off-peak and at weekends). Not yet measured.
 * On failure the stream ends with an `error` event; nothing is thrown to the caller once it runs.
 */
import { haversineM, type ChatMessage, type ChatStreamEvent, type Era, type Guide, type Landmark } from '@/lib/contracts';
import { streamDeepSeek } from './deepseek';
import { buildGuideSystemPrompt, toChatTurns, type NextLandmarkSuggestion } from './prompt';

export { ChatInputError, buildGuideSystemPrompt, toChatTurns, type NextLandmarkSuggestion } from './prompt';
export { DeepSeekError, DEEPSEEK_CHAT_URL } from './deepseek';

/** Default chat model (decision D-026). */
export const DEFAULT_CHAT_MODEL = 'deepseek-flash';

/**
 * Pick the chat model. CHAT_MODEL may name another DeepSeek model, but anything else is ignored
 * with a warning, so a leftover value such as `claude-haiku-5-5` can never be sent to DeepSeek.
 *
 * @returns A model id that starts with `deepseek-`.
 */
export function chatModel(): string {
  const requested = process.env.CHAT_MODEL;
  if (!requested) return DEFAULT_CHAT_MODEL;
  if (requested.startsWith('deepseek-')) return requested;
  console.warn(`CHAT_MODEL "${requested}" is not a DeepSeek model: using ${DEFAULT_CHAT_MODEL}`);
  return DEFAULT_CHAT_MODEL;
}

/**
 * Ceiling on output tokens per reply. Replies are a few sentences; this only stops a runaway
 * reply. Reaching it ends the reply where it stopped.
 */
const CHAT_MAX_TOKENS = 1024;

/** Shown when the model cannot be reached or declines. In character, because the player sees it. */
const CHAT_FAILED_MESSAGE = 'The guide seems lost for words. Try asking again in a moment.';
const CHAT_REFUSED_MESSAGE = 'The guide would rather not answer that one. Try asking something else.';

/**
 * Farthest a guide will send a player on foot, in metres. Beyond this the landmark is in another city
 * (a Porto guide suggesting London's museums was seen in the R3-1d check) and no suggestion is better.
 */
export const MAX_SUGGESTION_DISTANCE_M = 20_000;

/**
 * Pick the landmark the guide should suggest: the nearest one the player has not collected,
 * within MAX_SUGGESTION_DISTANCE_M.
 *
 * @param current - The landmark being chatted about. Never suggested.
 * @param all - Every landmark.
 * @param collectedIds - Ids of landmarks the player has collected.
 * @returns The suggestion, or null when everything else is collected or too far away.
 */
export function pickNextLandmark(
  current: Landmark,
  all: readonly Landmark[],
  collectedIds: ReadonlySet<string>,
): NextLandmarkSuggestion | null {
  const candidates = all
    .filter((l) => l.id !== current.id && !collectedIds.has(l.id))
    .map((l) => ({ name: l.name, distanceM: haversineM(current.photoSpot, l.photoSpot) }))
    .filter((c) => c.distanceM <= MAX_SUGGESTION_DISTANCE_M)
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
  /** Injected in tests. Defaults to the global fetch. */
  fetchImpl?: typeof fetch;
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
 *   history with toChatTurns first, as POST /api/chat does.
 */
export async function* streamGuideReply(input: GuideReplyInput): AsyncGenerator<ChatStreamEvent> {
  const turns = toChatTurns(input.messages);
  const system = buildGuideSystemPrompt(input);
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    console.error('Guide chat failed: DEEPSEEK_API_KEY is not set');
    yield { type: 'error', message: CHAT_FAILED_MESSAGE };
    return;
  }

  let text = '';
  try {
    for await (const event of streamDeepSeek({
      model: chatModel(),
      // The system prompt goes first and is the same for every turn of an era, so DeepSeek's
      // automatic prefix cache can serve it at the cache-hit price.
      messages: [{ role: 'system', content: system }, ...turns],
      maxTokens: CHAT_MAX_TOKENS,
      reasoningEffort: 'none',
      apiKey,
      signal: input.signal,
      fetchImpl: input.fetchImpl,
    })) {
      if (event.type === 'text') {
        text += event.text;
        yield { type: 'delta', text: event.text };
      } else if (event.type === 'finish' && event.reason === 'content_filter') {
        yield { type: 'error', message: CHAT_REFUSED_MESSAGE };
        return;
      }
    }
    yield { type: 'done', text };
  } catch (err) {
    if (input.signal?.aborted) return;
    console.error('Guide chat failed', err);
    yield { type: 'error', message: CHAT_FAILED_MESSAGE };
  }
}
