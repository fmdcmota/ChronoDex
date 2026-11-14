/**
 * Unit tests for the sources drawer helpers. Owner: Agent 4 (A4-09).
 */
import { describe, expect, it } from 'vitest';
import { hasSourceNotes, safeSourceUrl, sourceHost } from './sources';

describe('safeSourceUrl', () => {
  it('keeps http and https links', () => {
    expect(safeSourceUrl('https://example.org/a?b=1')).toBe('https://example.org/a?b=1');
    expect(safeSourceUrl('http://example.org')).toBe('http://example.org/');
  });
  it('drops script, data and malformed URLs', () => {
    expect(safeSourceUrl('javascript:alert(1)')).toBeNull();
    expect(safeSourceUrl(' JavaScript:alert(1)')).toBeNull();
    expect(safeSourceUrl('data:text/html,hi')).toBeNull();
    expect(safeSourceUrl('not a url')).toBeNull();
    expect(safeSourceUrl('')).toBeNull();
  });
});

describe('sourceHost', () => {
  it('strips www and keeps subdomains', () => {
    expect(sourceHost('https://www.british-history.ac.uk/x')).toBe('british-history.ac.uk');
    expect(sourceHost('https://en.wikipedia.org/wiki/Queen%27s_Tower')).toBe('en.wikipedia.org');
  });
  it('returns empty for a bad URL', () => {
    expect(sourceHost('nope')).toBe('');
  });
});

describe('hasSourceNotes', () => {
  const empty = { summary: null, funFacts: [], sources: [] };
  it('is false for an era the Historian has not written', () => {
    expect(hasSourceNotes(empty)).toBe(false);
  });
  it('is true when any part exists', () => {
    expect(hasSourceNotes({ ...empty, summary: 'S' })).toBe(true);
    expect(hasSourceNotes({ ...empty, funFacts: ['F'] })).toBe(true);
    expect(hasSourceNotes({ ...empty, sources: [{ title: 'T', url: 'https://x.org' }] })).toBe(true);
  });
});
