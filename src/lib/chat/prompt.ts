/**
 * Prompt builders for the guide chat. Prompts are code (MASTER.md 8.4 rule 4).
 *
 * Owner: Agent 1 (Core). Implements the chat rules of MASTER.md section 7, task A1-13.
 * Unit tested in prompt.test.ts.
 */
import type Anthropic from '@anthropic-ai/sdk';
import type { ChatMessage, Era, Guide, Landmark } from '@/lib/contracts';

/** A landmark the guide may suggest next: the nearest one the player has not collected. */
export interface NextLandmarkSuggestion {
  name: string;
  /** Walking distance is not known; this is the straight-line distance from this landmark. */
  distanceM: number;
}

/** Everything the system prompt is built from. */
export interface GuidePromptInput {
  era: Era & { guide: Guide };
  landmark: Landmark;
  suggestion: NextLandmarkSuggestion | null;
}

/** Distances in the prompt are rounded to this many metres, as a person would say them. */
const DISTANCE_ROUNDING_M = 50;

/**
 * Build the guide's system prompt for one era.
 *
 * Intent: keep the guide in character, warm and brief (text-message length), grounded in the
 * era's researched brief, honest when unsure, and never claiming to be a real person. It changes
 * only when the era or the suggestion changes, so it can be prompt-cached.
 *
 * Example output (abridged):
 *
 *     You are Albert Finch, Porter at the Imperial Institute, in the year 1893. ...
 *     ## What you know (from the archive brief)
 *     Summary: In May 1893 Queen Victoria opened ...
 *     Facts:
 *     - The architect was Thomas Edward Collcutt.
 *     ## Suggest next
 *     If it fits, suggest the Royal Albert Hall, about 200 m away, which they have not visited yet.
 *
 * @param input - What the prompt is built from.
 * @param input.era - The era, with its guide.
 * @param input.landmark - The era's landmark.
 * @param input.suggestion - The next landmark to suggest, or null.
 * @returns The system prompt text.
 */
export function buildGuideSystemPrompt({ era, landmark, suggestion }: GuidePromptInput): string {
  const { guide } = era;
  const facts = era.funFacts.map((f) => `- ${f}`).join('\n') || '- (no extra facts recorded)';
  const sources = era.sources.map((s) => `- ${s.title}`).join('\n') || '- (none recorded)';
  const suggest = suggestion
    ? `If it fits the conversation, suggest the ${suggestion.name}, about ${roundDistance(suggestion.distanceM)} m from here, which the visitor has not collected yet. Mention it at most once or twice in the whole chat.`
    : 'The visitor has collected every landmark. Congratulate them if it comes up.';

  return `You are ${guide.name}, ${guide.role}, at ${landmark.name} in the year ${era.year}. You are chatting by text message with a visitor from the present day who has travelled back to meet you.

## Who you are
${guide.bio}
Appearance: ${guide.appearance}
You are a fictional person, not a real historical figure. If asked, say you are an ordinary ${guide.role.toLowerCase()} of the time. Never claim to be, or to speak for, any real named person.

## How you write
- Stay in character as someone living in ${era.year}. Speak warmly, with the manners and turns of phrase of your time, but keep it easy for a modern reader.
- Keep replies short, like text messages: one to three sentences, rarely more. No lists or headings.
- Where it fits, add one fun fact about the area per reply, no more.
- You only know the world up to ${era.year}. If the visitor mentions later things, be curious or puzzled, in character.

## What you know (from the archive brief)
Title: ${era.title ?? `${landmark.name} in ${era.year}`}
Summary: ${era.summary ?? 'No summary recorded.'}
Facts:
${facts}
Sources the brief relies on:
${sources}

Base factual claims on the brief first. If you are not sure of something, say so in character ("I couldn't rightly say, but...") and do not invent dates, names or numbers.

## Suggest next
${suggest}

## The conversation so far
You opened the chat with: "${guide.greeting}"`;
}

/**
 * Round a distance the way a person would say it.
 *
 * @param distanceM - Metres.
 * @returns A multiple of 50 m, at least 50.
 */
function roundDistance(distanceM: number): number {
  return Math.max(DISTANCE_ROUNDING_M, Math.round(distanceM / DISTANCE_ROUNDING_M) * DISTANCE_ROUNDING_M);
}

/** The chat history cannot be sent: it is empty or does not end with the player. */
export class ChatInputError extends Error {}

/**
 * Convert the app's chat history to Claude messages.
 *
 * Guide messages before the player's first message (the greeting) are dropped, because the
 * conversation must start with a user turn; the greeting is in the system prompt instead.
 * Consecutive messages from the same side are allowed and merged by the API.
 *
 * Empty messages are ignored.
 *
 * @param messages - History, oldest first.
 * @returns Messages for the Messages API.
 * @throws ChatInputError when there is no player message or the last message is not the player's
 *   (the model cannot continue a guide message: assistant prefill is not supported).
 */
export function toClaudeMessages(messages: readonly ChatMessage[]): Anthropic.MessageParam[] {
  const nonEmpty = messages.filter((m) => m.text.trim().length > 0);
  const firstPlayer = nonEmpty.findIndex((m) => m.role === 'player');
  if (firstPlayer === -1) throw new ChatInputError('The chat has no message from the player');
  if (nonEmpty[nonEmpty.length - 1].role !== 'player') {
    throw new ChatInputError('The last message must be from the player');
  }
  return nonEmpty
    .slice(firstPlayer)
    .map((m) => ({ role: m.role === 'player' ? 'user' : 'assistant', content: m.text }));
}
