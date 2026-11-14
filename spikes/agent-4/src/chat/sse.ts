/**
 * Incremental parser for the Server-Sent Events stream that POST /api/chat returns (MASTER.md section 4.3, 4.1 `ChatStreamEvent`).
 *
 * Owner: Agent 4. Spike for A4-07 only. Implements the chat stream half of section 4.1 and the chat rules in section 7.
 *
 * Why this exists: the browser reads the reply as bytes arrive, but a chunk can end anywhere, in the
 * middle of a line, inside a JSON object, or between the `\r` and `\n` of one line ending. This parser
 * buffers until a blank line completes an event, so the chat screen only ever sees whole events.
 * It is pure (no DOM, fetch or timers) so it can be unit tested and reused when the spike moves into src/.
 */
import type { ChatStreamEvent } from './contracts';

/** Text the chat screen shows when the server sends something that is not a valid chat event. */
const MALFORMED_EVENT_MESSAGE = 'Malformed chat event';

/** The only SSE field this parser uses. Other fields (`event:`, `id:`, `retry:`) are ignored. */
const DATA_FIELD = 'data';

/**
 * Turn the joined `data` payload of one SSE event into a typed chat event.
 *
 * Why: the server promises one JSON object per event, but a bad payload must not stop the chat.
 * It becomes an `error` event instead, and parsing carries on with the next event.
 *
 * @param payload - The `data` lines of one event, already joined with `\n`.
 * @returns A fresh `ChatStreamEvent` containing only the known fields. Anything invalid becomes
 *   `{ type: 'error', message: 'Malformed chat event' }`.
 */
function toChatEvent(payload: string): ChatStreamEvent {
  let parsed: unknown;
  try {
    parsed = JSON.parse(payload);
  } catch {
    return { type: 'error', message: MALFORMED_EVENT_MESSAGE };
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    return { type: 'error', message: MALFORMED_EVENT_MESSAGE };
  }
  const candidate = parsed as Record<string, unknown>;
  switch (candidate.type) {
    case 'delta':
    case 'done':
      if (typeof candidate.text === 'string') return { type: candidate.type, text: candidate.text };
      return { type: 'error', message: MALFORMED_EVENT_MESSAGE };
    case 'error':
      if (typeof candidate.message === 'string') return { type: 'error', message: candidate.message };
      return { type: 'error', message: MALFORMED_EVENT_MESSAGE };
    default:
      return { type: 'error', message: MALFORMED_EVENT_MESSAGE };
  }
}

/**
 * Create a streaming parser for a `text/event-stream` of chat events.
 *
 * Feed it the decoded text of each network chunk with `push`, in arrival order. Each complete event
 * (terminated by a blank line) is passed to `onEvent` exactly once, in order. Call `end` when the
 * response body closes so a final event without a trailing blank line is not lost.
 *
 * Behaviour, from the SSE standard and MASTER.md section 4.1:
 * - Line endings `\n`, `\r\n` and `\r` are all accepted. A `\r` at the end of a chunk waits for the
 *   next chunk before it is decided, so `\r` and `\n` split across two chunks count as one ending.
 * - Several `data:` lines in one event are joined with `\n` before JSON parsing.
 * - One optional space after `data:` is removed. Lines starting with `:` are comments and are ignored.
 * - An event with no `data:` line produces nothing.
 *
 * @param onEvent - Called once per complete event, in order. Receives a valid `ChatStreamEvent`
 *   (a malformed payload arrives as an `error` event, never as a throw).
 * @returns `push(chunk)` to feed text, and `end()` to flush the final event and stop accepting input.
 * @example
 *   const parser = createChatStreamParser((e) => console.log(e));
 *   parser.push('data: {"type":"delta","text":"Hel');
 *   parser.push('lo"}\n\n');   // logs { type: 'delta', text: 'Hello' }
 *   parser.end();
 */
export function createChatStreamParser(onEvent: (e: ChatStreamEvent) => void): {
  push(chunk: string): void;
  end(): void;
} {
  /** Characters of the line currently being read, not yet ended by a line terminator. */
  let currentLine = '';
  /** Set after a `\r`: a `\n` that comes next is the same line ending and must be skipped. */
  let skipNextLineFeed = false;
  /** `data` values of the event being built. Empty means no event is pending. */
  let pendingDataLines: string[] = [];
  /** Set by end(). Further input is ignored. */
  let ended = false;

  /** Send the pending event, if it has any data, then clear it. A blank line is what triggers this. */
  function dispatchPendingEvent(): void {
    if (pendingDataLines.length === 0) return;
    const payload = pendingDataLines.join('\n');
    pendingDataLines = [];
    onEvent(toChatEvent(payload));
  }

  /**
   * Handle one complete line. Blank lines end an event. `data:` lines add to the pending event.
   *
   * @param line - The line without its terminator.
   */
  function handleLine(line: string): void {
    if (line === '') {
      dispatchPendingEvent();
      return;
    }
    // Comment lines start with a colon. Servers use them as keep-alive pings.
    if (line.startsWith(':')) return;
    const colonIndex = line.indexOf(':');
    const field = colonIndex === -1 ? line : line.slice(0, colonIndex);
    let value = colonIndex === -1 ? '' : line.slice(colonIndex + 1);
    if (value.startsWith(' ')) value = value.slice(1);
    if (field === DATA_FIELD) pendingDataLines.push(value);
  }

  return {
    /**
     * Feed the next piece of decoded stream text. Complete events are emitted synchronously.
     *
     * @param chunk - Any text, which may end in the middle of a line, a JSON object, or a `\r\n` pair.
     *   Ignored after end().
     */
    push(chunk: string): void {
      if (ended) return;
      for (const character of chunk) {
        if (skipNextLineFeed) {
          skipNextLineFeed = false;
          if (character === '\n') continue;
        }
        if (character === '\r') {
          handleLine(currentLine);
          currentLine = '';
          skipNextLineFeed = true;
        } else if (character === '\n') {
          handleLine(currentLine);
          currentLine = '';
        } else {
          currentLine += character;
        }
      }
    },

    /**
     * Mark the end of the stream. A final line without a terminator is read, and an event that still
     * has data is sent, as the SSE standard requires. After this, push() does nothing.
     *
     * Side effects: calls onEvent at most once more. Idempotent.
     */
    end(): void {
      if (ended) return;
      ended = true;
      if (currentLine !== '') handleLine(currentLine);
      currentLine = '';
      dispatchPendingEvent();
    },
  };
}
