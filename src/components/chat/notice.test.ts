/**
 * Unit tests for failureNotice. Owner: Agent 4 (A4-07).
 */
import { describe, expect, it } from 'vitest';
import { failureNotice } from './notice';

describe('failureNotice', () => {
  it('uses the first name and adds a retry hint', () => {
    expect(failureNotice('Albert Finch', 'network down')).toBe('Albert could not answer: network down. Try again.');
  });
  it('does not repeat a retry hint the server already gave', () => {
    expect(failureNotice('Albert Finch', 'The guide seems lost for words. Try asking again in a moment.')).toBe(
      'Albert could not answer: The guide seems lost for words. Try asking again in a moment.',
    );
  });
  it('does not double the full stop', () => {
    expect(failureNotice('Ada', 'timeout. ')).toBe('Ada could not answer: timeout. Try again.');
  });
  it('handles an empty reply and an empty name', () => {
    expect(failureNotice('Ada', null)).toBe('Ada could not answer: no reply. Try again.');
    expect(failureNotice('  ', '')).toBe('Your guide could not answer: no reply. Try again.');
  });
});
