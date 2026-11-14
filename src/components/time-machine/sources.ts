/**
 * Pure helpers for the era sources drawer.
 *
 * Owner: Agent 4. Implements A4-09 (MASTER.md section 11) and assumption A9 (each era lists its
 * sources). Source URLs are written by the Historian from web search, so they are treated as
 * untrusted: only http and https links are rendered as links.
 */
import type { Source } from '@/lib/contracts';

/**
 * Return a URL safe to put in an `href`, or null.
 *
 * Why: a `javascript:` or `data:` URL in a source would run in our page when tapped. The Historian
 * should never write one, but its input is the open web.
 *
 * @param url - The source's URL as stored on the Era.
 * @returns The normalised URL when it is http or https, else null.
 */
export function safeSourceUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:' ? parsed.href : null;
  } catch {
    return null;
  }
}

/**
 * The host to show under a source title, without a leading "www.".
 *
 * @param url - Any URL.
 * @returns For example "en.wikipedia.org", or an empty string when the URL does not parse.
 */
export function sourceHost(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

/**
 * Whether the drawer has anything to show for an era.
 *
 * @param era - The era's text fields.
 * @param era.summary - Era summary, null before the Historian has run.
 * @param era.funFacts - Era fun facts.
 * @param era.sources - Era sources.
 * @returns True when there is a summary, a fact or a source.
 */
export function hasSourceNotes(era: { summary: string | null; funFacts: string[]; sources: Source[] }): boolean {
  return Boolean(era.summary) || era.funFacts.length > 0 || era.sources.length > 0;
}
