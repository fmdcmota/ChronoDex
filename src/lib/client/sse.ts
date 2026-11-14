/**
 * A minimal parser for the server-sent events of POST /api/chat.
 *
 * Owner: Agent 1 (Core). Implements the stream format in MASTER.md section 4.3: one JSON
 * ChatStreamEvent per `data:` line, events separated by a blank line. Unit tested in sse.test.ts.
 * Written by hand because EventSource cannot send a POST body.
 */
import { ChatStreamEventSchema, type ChatStreamEvent } from '@/lib/contracts';

/**
 * Incremental SSE parser. Feed it text chunks as they arrive; it returns the complete events.
 *
 * Chunks may split anywhere, even inside a line. Comment lines (starting with ":") and fields
 * other than `data` are ignored. A `data` payload that is not a valid ChatStreamEvent becomes an
 * `error` event rather than throwing, so one bad line cannot kill the chat.
 */
export class SseParser {
  private buffer = '';
  private dataLines: string[] = [];

  /**
   * Add a chunk of the stream.
   *
   * @param chunk - Text decoded from the response body.
   * @returns Events completed by this chunk, in order.
   */
  push(chunk: string): ChatStreamEvent[] {
    this.buffer += chunk;
    const events: ChatStreamEvent[] = [];
    let newline: number;
    while ((newline = this.buffer.search(/\r\n|\r|\n/)) !== -1) {
      const line = this.buffer.slice(0, newline);
      const eolLength = this.buffer.startsWith('\r\n', newline) ? 2 : 1;
      // A lone "\r" at the very end may be the first half of "\r\n": wait for more input.
      if (this.buffer[newline] === '\r' && eolLength === 1 && newline === this.buffer.length - 1) break;
      this.buffer = this.buffer.slice(newline + eolLength);
      const event = this.line(line);
      if (event) events.push(event);
    }
    return events;
  }

  /**
   * Signal the end of the stream and flush any event left without a closing blank line.
   *
   * @returns The final event, if one was pending.
   */
  end(): ChatStreamEvent[] {
    const events = this.buffer.length > 0 ? this.push('\n') : [];
    const last = this.dispatch();
    return last ? [...events, last] : events;
  }

  private line(line: string): ChatStreamEvent | null {
    if (line === '') return this.dispatch();
    if (line.startsWith(':')) return null;
    const colon = line.indexOf(':');
    const field = colon === -1 ? line : line.slice(0, colon);
    let value = colon === -1 ? '' : line.slice(colon + 1);
    if (value.startsWith(' ')) value = value.slice(1);
    if (field === 'data') this.dataLines.push(value);
    return null;
  }

  private dispatch(): ChatStreamEvent | null {
    if (this.dataLines.length === 0) return null;
    const payload = this.dataLines.join('\n');
    this.dataLines = [];
    return parseChatEvent(payload);
  }
}

/**
 * Parse one `data:` payload into a ChatStreamEvent.
 *
 * @param payload - The JSON text.
 * @returns The event, or an `error` event when the payload is not a valid ChatStreamEvent.
 */
export function parseChatEvent(payload: string): ChatStreamEvent {
  try {
    const parsed = ChatStreamEventSchema.safeParse(JSON.parse(payload));
    if (parsed.success) return parsed.data;
  } catch {
    // Fall through to the error event below.
  }
  return { type: 'error', message: 'The chat stream sent a malformed event' };
}

/**
 * Format one event as an SSE frame. The chat route (A1-13) uses this so both ends agree.
 *
 * @param event - The event to send.
 * @returns `data: <json>` followed by a blank line.
 */
export function formatSseEvent(event: ChatStreamEvent): string {
  return `data: ${JSON.stringify(event)}\n\n`;
}
