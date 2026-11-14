/**
 * Mechanical checks on a written brief: the Historian rules a JSON schema cannot express.
 *
 * Owner: Agent 1 (Core). Implements MASTER.md sections 6 and 7, task A1-11.
 * Unit tested in historian.test.ts.
 */
import type { EraBrief } from '@/lib/contracts';
import { SCRIPT_MAX_WORDS, SCRIPT_MIN_WORDS } from './prompt';

/** The guide should say their name within this many words of the start of the script. */
const NAME_WITHIN_WORDS = 25;
/** Fewest fun facts a brief may have. The writing prompt asks for 3 to 6. */
const MIN_FUN_FACTS = 3;

/** Hosts whose imagery must never be fed to a model (MASTER.md section 6, assumption A8). */
const GOOGLE_IMAGE_HOST = /(^|\.)(google|googleapis|gstatic|googleusercontent|ggpht)\.[a-z.]+$/i;

/**
 * Count the words in a script.
 *
 * @param text - The script.
 * @returns Number of whitespace-separated words.
 */
export function countWords(text: string): number {
  const trimmed = text.trim();
  return trimmed ? trimmed.split(/\s+/).length : 0;
}

/**
 * Tell whether a URL is an http(s) URL.
 *
 * @param url - Candidate.
 * @returns True for http: and https:.
 */
function isWebUrl(url: string): boolean {
  try {
    const { protocol } = new URL(url);
    return protocol === 'https:' || protocol === 'http:';
  } catch {
    return false;
  }
}

/**
 * Tell whether a URL is Google imagery.
 *
 * @param url - Candidate.
 * @returns True when the host is a Google domain, or the URL cannot be parsed.
 */
export function isGoogleUrl(url: string): boolean {
  try {
    return GOOGLE_IMAGE_HOST.test(new URL(url).hostname);
  } catch {
    return true;
  }
}

/**
 * Remove reference images that are not usable model input: Google imagery and non-web URLs.
 * Fixed silently rather than retried, because dropping a reference image loses little.
 *
 * @param brief - The brief. Not modified.
 * @returns A copy with only allowed reference image URLs.
 */
export function stripDisallowedImages(brief: EraBrief): EraBrief {
  const referenceImageUrls = brief.sceneBrief.referenceImageUrls.filter((u) => isWebUrl(u) && !isGoogleUrl(u));
  return { ...brief, sceneBrief: { ...brief.sceneBrief, referenceImageUrls } };
}

/**
 * Check a brief against the Historian rules.
 *
 * @param brief - A brief that already matches EraBriefSchema.
 * @param voiceKeys - Keys of VOICE_CATALOG.
 * @returns Problems in plain words, suitable to send back to the model. Empty when the brief passes.
 */
export function validateBrief(brief: EraBrief, voiceKeys: readonly string[]): string[] {
  const problems: string[] = [];
  const { guide } = brief;

  const words = countWords(guide.script);
  if (words < SCRIPT_MIN_WORDS || words > SCRIPT_MAX_WORDS) {
    problems.push(`guide.script has ${words} words; it must have ${SCRIPT_MIN_WORDS} to ${SCRIPT_MAX_WORDS}.`);
  }
  const firstName = guide.name.trim().split(/\s+/)[0] ?? '';
  const opening = guide.script.split(/\s+/).slice(0, NAME_WITHIN_WORDS).join(' ').toLowerCase();
  if (!firstName || !opening.includes(firstName.toLowerCase())) {
    problems.push(`guide.script must open with the guide introducing themself by name ("${guide.name}") in the first ${NAME_WITHIN_WORDS} words.`);
  }
  if (!voiceKeys.includes(guide.voiceKey)) {
    problems.push(`guide.voiceKey "${guide.voiceKey}" is not one of: ${voiceKeys.join(', ')}.`);
  }
  if (brief.sources.length === 0) problems.push('sources is empty; every claim needs a source.');
  const badSources = brief.sources.filter((s) => !isWebUrl(s.url)).map((s) => s.url);
  if (badSources.length > 0) problems.push(`these sources are not web URLs: ${badSources.join(', ')}.`);
  if (brief.funFacts.length < MIN_FUN_FACTS) problems.push(`funFacts has ${brief.funFacts.length} items; give at least ${MIN_FUN_FACTS}.`);
  if (!guide.greeting.trim()) problems.push('guide.greeting is empty.');
  return problems;
}
