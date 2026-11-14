/**
 * Wording for the notice shown when the guide cannot answer.
 *
 * Owner: Agent 4. Part of A4-07 (MASTER.md section 11). The reason comes from the server's error
 * event (Agent 1's /api/chat), which may already tell the player to try again; this avoids saying
 * it twice ("Try asking again in a moment. Try again.").
 */

/**
 * Build the notice for a failed or empty reply.
 *
 * Example: failureNotice('Albert Finch', 'network down') returns
 * "Albert could not answer: network down. Try again."
 *
 * @param guideName - The guide's full name. Only the first word is used, as in the chat header.
 * @param reason - Why the reply failed, or null when the stream ended with no text.
 * @returns One or two sentences ending in a full stop.
 */
export function failureNotice(guideName: string, reason: string | null): string {
  const first = guideName.trim().split(/\s+/)[0] || 'Your guide';
  const clean = (reason ?? 'no reply').trim().replace(/[.\s]+$/, '') || 'no reply';
  const hint = /\bagain\b/i.test(clean) ? '' : ' Try again.';
  return `${first} could not answer: ${clean}.${hint}`;
}
