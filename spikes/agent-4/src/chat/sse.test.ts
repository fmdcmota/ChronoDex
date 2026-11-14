/**
 * Unit tests for sse.ts (A4-07 spike, Agent 4).
 *
 * Covers the SSE framing rules that the chat stream depends on: chunk boundaries, the three line
 * endings, multi-line data, ignored fields and comments, and the error event for bad payloads.
 */
import { describe, expect, it } from 'vitest';
import { createChatStreamParser } from './sse';
import type { ChatStreamEvent } from './contracts';

/**
 * Run a parser over a list of chunks and collect everything it emits, including after end().
 *
 * @param chunks - Text chunks in arrival order.
 * @param flushAtEnd - Whether to call end() after the last chunk.
 * @returns The events emitted, in order.
 */
function parseChunks(chunks: string[], flushAtEnd = true): ChatStreamEvent[] {
  const events: ChatStreamEvent[] = [];
  const parser = createChatStreamParser((e) => events.push(e));
  for (const chunk of chunks) parser.push(chunk);
  if (flushAtEnd) parser.end();
  return events;
}

describe('createChatStreamParser', () => {
  it('emits one delta event from one chunk', () => {
    expect(parseChunks(['data: {"type":"delta","text":"Hello"}\n\n'])).toEqual([
      { type: 'delta', text: 'Hello' },
    ]);
  });

  it('emits several events from one chunk, in order', () => {
    const events = parseChunks([
      'data: {"type":"delta","text":"Hi "}\n\ndata: {"type":"delta","text":"there"}\n\ndata: {"type":"done","text":"Hi there"}\n\n',
    ]);
    expect(events).toEqual([
      { type: 'delta', text: 'Hi ' },
      { type: 'delta', text: 'there' },
      { type: 'done', text: 'Hi there' },
    ]);
  });

  it('reassembles an event split across three chunks, including mid-JSON', () => {
    const events = parseChunks([
      'data: {"type":"del',
      'ta","text":"Gree',
      'ting"}\n\n',
    ]);
    expect(events).toEqual([{ type: 'delta', text: 'Greeting' }]);
  });

  it('waits for the \\n when a chunk ends between \\r and \\n', () => {
    const events: ChatStreamEvent[] = [];
    const parser = createChatStreamParser((e) => events.push(e));
    parser.push('data: {"type":"delta","text":"A"}\r');
    expect(events).toEqual([]);
    parser.push('\n\r\n');
    expect(events).toEqual([{ type: 'delta', text: 'A' }]);
  });

  it('accepts \\r\\n line endings', () => {
    expect(parseChunks(['data: {"type":"delta","text":"one"}\r\n\r\ndata: {"type":"done","text":"one"}\r\n\r\n'])).toEqual([
      { type: 'delta', text: 'one' },
      { type: 'done', text: 'one' },
    ]);
  });

  it('accepts bare \\r line endings', () => {
    expect(parseChunks(['data: {"type":"delta","text":"cr"}\r\r'])).toEqual([{ type: 'delta', text: 'cr' }]);
  });

  it('joins multi-line data with \\n before parsing', () => {
    // The JSON itself spans two data lines, so the joined payload contains a real newline inside a string escape.
    const events = parseChunks(['data: {"type":"delta",\ndata: "text":"line"}\n\n']);
    expect(events).toEqual([{ type: 'delta', text: 'line' }]);
  });

  it('accepts data lines with or without a space after the colon', () => {
    expect(parseChunks(['data:{"type":"delta","text":"tight"}\n\n'])).toEqual([{ type: 'delta', text: 'tight' }]);
  });

  it('ignores comment lines and the event, id and retry fields', () => {
    const events = parseChunks([
      ': keep-alive ping\n',
      'event: message\n',
      'id: 42\n',
      'retry: 3000\n',
      'data: {"type":"delta","text":"kept"}\n',
      ': another comment\n\n',
    ]);
    expect(events).toEqual([{ type: 'delta', text: 'kept' }]);
  });

  it('emits nothing for a blank line with no data', () => {
    expect(parseChunks(['event: ping\n\n\n'])).toEqual([]);
  });

  it('gives an error event for invalid JSON and carries on with the next event', () => {
    expect(
      parseChunks(['data: {not json\n\ndata: {"type":"delta","text":"after"}\n\n']),
    ).toEqual([
      { type: 'error', message: 'Malformed chat event' },
      { type: 'delta', text: 'after' },
    ]);
  });

  it('gives an error event for a valid JSON value that is not a chat event', () => {
    expect(
      parseChunks([
        'data: [1,2]\n\n',
        'data: null\n\n',
        'data: {"type":"delta"}\n\n',
        'data: {"type":"delta","text":5}\n\n',
        'data: {"type":"error"}\n\n',
      ]),
    ).toEqual([
      { type: 'error', message: 'Malformed chat event' },
      { type: 'error', message: 'Malformed chat event' },
      { type: 'error', message: 'Malformed chat event' },
      { type: 'error', message: 'Malformed chat event' },
      { type: 'error', message: 'Malformed chat event' },
    ]);
  });

  it('gives an error event for an unknown type', () => {
    expect(parseChunks(['data: {"type":"thinking","text":"hmm"}\n\n'])).toEqual([
      { type: 'error', message: 'Malformed chat event' },
    ]);
  });

  it('passes through a server error event with its message', () => {
    expect(parseChunks(['data: {"type":"error","message":"Model unavailable"}\n\n'])).toEqual([
      { type: 'error', message: 'Model unavailable' },
    ]);
  });

  it('drops extra fields and returns only the known ones', () => {
    expect(parseChunks(['data: {"type":"delta","text":"x","extra":true}\n\n'])).toEqual([
      { type: 'delta', text: 'x' },
    ]);
  });

  it('end() flushes a final event that has no trailing blank line', () => {
    expect(parseChunks(['data: {"type":"done","text":"bye"}'], true)).toEqual([
      { type: 'done', text: 'bye' },
    ]);
  });

  it('end() flushes a final event that ends in a newline but no blank line', () => {
    expect(parseChunks(['data: {"type":"done","text":"bye"}\n'], true)).toEqual([
      { type: 'done', text: 'bye' },
    ]);
  });

  it('emits nothing on end() when no data is pending', () => {
    expect(parseChunks(['data: {"type":"delta","text":"a"}\n\n'], true)).toEqual([
      { type: 'delta', text: 'a' },
    ]);
  });

  it('ignores push() after end()', () => {
    const events: ChatStreamEvent[] = [];
    const parser = createChatStreamParser((e) => events.push(e));
    parser.push('data: {"type":"delta","text":"before"}\n\n');
    parser.end();
    parser.push('data: {"type":"delta","text":"after"}\n\n');
    parser.end();
    expect(events).toEqual([{ type: 'delta', text: 'before' }]);
  });
});
