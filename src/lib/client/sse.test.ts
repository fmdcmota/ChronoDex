/**
 * Unit tests for the SSE parser used by the chat client. Owner: Agent 1.
 */
import { describe, expect, it } from 'vitest';
import type { ChatStreamEvent } from '@/lib/contracts';
import { SseParser, formatSseEvent } from './sse';

const events: ChatStreamEvent[] = [
  { type: 'delta', text: 'Good ' },
  { type: 'delta', text: 'day, with a\nnewline and "quotes"' },
  { type: 'done', text: 'Good day' },
];
const stream = events.map(formatSseEvent).join('');

describe('SseParser', () => {
  it('parses a whole stream in one chunk', () => {
    const parser = new SseParser();
    expect([...parser.push(stream), ...parser.end()]).toEqual(events);
  });

  it('parses the same stream split at every possible point', () => {
    for (let i = 0; i <= stream.length; i++) {
      const parser = new SseParser();
      const out = [...parser.push(stream.slice(0, i)), ...parser.push(stream.slice(i)), ...parser.end()];
      expect(out).toEqual(events);
    }
  });

  it('handles CRLF line endings, comments and other fields', () => {
    const parser = new SseParser();
    const text = ': keep-alive\r\nevent: message\r\ndata: {"type":"delta","text":"a"}\r\n\r\n';
    expect([...parser.push(text), ...parser.end()]).toEqual([{ type: 'delta', text: 'a' }]);
  });

  it('flushes a final event without a trailing blank line', () => {
    const parser = new SseParser();
    expect([...parser.push('data: {"type":"done","text":"x"}'), ...parser.end()]).toEqual([{ type: 'done', text: 'x' }]);
  });

  it('turns a malformed payload into an error event', () => {
    const parser = new SseParser();
    const out = parser.push('data: not json\n\ndata: {"type":"other"}\n\n');
    expect(out.map((e) => e.type)).toEqual(['error', 'error']);
  });
});
