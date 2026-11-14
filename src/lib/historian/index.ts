/**
 * The Historian: researches a landmark in one year and writes the text half of an Era.
 *
 * Owner: Agent 1 (Core). Implements MASTER.md sections 4.4 and 7, task A1-11.
 *
 * Two Claude calls, both claude-opus-5-5 through the beta Messages API, streamed:
 * 1. Research, effort `high`, with the server web search tool (up to RESEARCH_MAX_SEARCHES
 *    searches). Returns free-text notes with source URLs. A long search turn can stop with
 *    `pause_turn`; the turn is sent back unchanged and the server resumes it.
 * 2. Writing, effort `medium`, no tools, structured output validated against EraBriefSchema,
 *    then the mechanical checks in ./validate.ts. One corrective retry if a check fails.
 * Research and writing are separate so a retry never repeats the searches, and so search
 * citations never meet structured output in one response.
 *
 * Both calls send `fallbacks: "default"` (beta server-side-fallback-2026-07-01): if Opus 5.5's
 * safety classifiers decline, the API reruns the request on a fallback model inside the same call.
 *
 * Cost and time (estimate from list prices, not yet measured): about $0.25 to $0.60 and one to
 * three minutes per brief, mostly the research phase ($4 / $20 per million tokens, plus $10 per
 * 1,000 searches).
 * Side effects: Claude requests only. Writes nothing; the pipeline stores the result.
 * Without credentials the first request fails with the SDK's error. There is deliberately no
 * placeholder fallback, so placeholder text can never be stored as a real era.
 */
import Anthropic from '@anthropic-ai/sdk';
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod';
import { EraBriefSchema, type EraBrief, type Landmark } from '@/lib/contracts';
import { getAnthropic, type AnthropicLike } from '@/lib/chat/anthropic';
import { VOICE_CATALOG } from '@/lib/fal/voices';
import { buildCorrectionPrompt, buildResearchPrompt, buildWritingPrompt } from './prompt';
import { stripDisallowedImages, validateBrief } from './validate';

export { countWords, isGoogleUrl, stripDisallowedImages, validateBrief } from './validate';
export { buildCorrectionPrompt, buildResearchPrompt, buildWritingPrompt, viewingDirection } from './prompt';

/** Historian model (MASTER.md section 7). */
export const HISTORIAN_MODEL = 'claude-opus-5-5';
/** Most web searches in the research phase. Each costs $0.01. */
export const RESEARCH_MAX_SEARCHES = 8;
/** How many times a paused research turn is resumed before giving up. */
const MAX_PAUSE_RESUMES = 4;
/** Output ceilings. Streaming, so large values do not risk HTTP timeouts. */
const RESEARCH_MAX_TOKENS = 32_000;
const WRITING_MAX_TOKENS = 16_000;
/** Server-side refusal fallback (opt-in beta). */
const FALLBACK_BETA = 'server-side-fallback-2026-07-01';

/** The Historian could not produce a valid brief. The message says why. */
export class HistorianError extends Error {}

/** Options for writeEraBrief. Tests inject a client. */
export interface WriteEraBriefOptions {
  client?: AnthropicLike;
}

/**
 * Research a landmark in a given year and write its brief: title, summary, sourced fun facts,
 * the scene brief for the image models, and a fictional guide with a 105 to 120 word script.
 *
 * @param landmark - The landmark.
 * @param year - The year to describe.
 * @param options - Optional injected client.
 * @returns The brief. The guide has no headshot; the pipeline makes it.
 * @throws HistorianError when Claude declines, runs out of tokens, or the brief still fails the
 *   checks after one correction. Anthropic.AnthropicError for missing credentials and API failures
 *   (the SDK has already retried those twice).
 */
export async function writeEraBrief(landmark: Landmark, year: number, options: WriteEraBriefOptions = {}): Promise<EraBrief> {
  const client = options.client ?? getAnthropic();
  const notes = await research(client, landmark, year);
  return write(client, landmark, year, notes);
}

/**
 * Phase 1: research with web search, resuming paused turns.
 *
 * @param client - Anthropic client.
 * @param landmark - The landmark.
 * @param year - The year.
 * @returns The research notes as plain text.
 * @throws HistorianError on refusal, truncation, or too many pauses.
 */
async function research(client: AnthropicLike, landmark: Landmark, year: number): Promise<string> {
  const prompt = buildResearchPrompt(landmark, year);
  const messages: Anthropic.Beta.BetaMessageParam[] = [{ role: 'user', content: prompt.user }];

  for (let resumes = 0; ; resumes++) {
    const stream = client.beta.messages.stream({
      model: HISTORIAN_MODEL,
      max_tokens: RESEARCH_MAX_TOKENS,
      betas: [FALLBACK_BETA],
      fallbacks: 'default',
      output_config: { effort: 'high' },
      system: prompt.system,
      tools: [{ type: 'web_search_20260209', name: 'web_search', max_uses: RESEARCH_MAX_SEARCHES }],
      messages,
    });
    const final = await stream.finalMessage();

    if (final.stop_reason === 'pause_turn') {
      if (resumes >= MAX_PAUSE_RESUMES) throw new HistorianError(`Research for ${landmark.id} ${year} paused too many times`);
      // Send the paused turn back as is; the server sees the trailing tool use and resumes.
      messages.push({ role: 'assistant', content: final.content });
      continue;
    }
    if (final.stop_reason === 'refusal') throw new HistorianError(`Research for ${landmark.id} ${year} was declined`);
    if (final.stop_reason === 'max_tokens') throw new HistorianError(`Research for ${landmark.id} ${year} ran out of tokens`);

    // Earlier paused turns may hold text too, so collect from every assistant turn.
    const notes = [...messages.filter((m) => m.role === 'assistant').flatMap((m) => blocksOf(m.content)), ...final.content]
      .flatMap((block) => (block.type === 'text' ? [block.text] : []))
      .join('')
      .trim();
    if (!notes) throw new HistorianError(`Research for ${landmark.id} ${year} returned no notes`);
    return notes;
  }
}

/**
 * The content blocks of a message param, whatever its form.
 *
 * @param content - A string or block list.
 * @returns The blocks (a string becomes nothing; only assistant turns are read, which are lists).
 */
function blocksOf(content: Anthropic.Beta.BetaMessageParam['content']): Array<{ type: string; text?: string } & object> {
  return typeof content === 'string' ? [] : (content as Array<{ type: string; text?: string }>);
}

/**
 * Phase 2: write the brief as structured JSON, check it, and correct it once if needed.
 *
 * @param client - Anthropic client.
 * @param landmark - The landmark.
 * @param year - The year.
 * @param notes - Phase 1 notes.
 * @returns A brief that passes every check.
 * @throws HistorianError when it still fails after one correction.
 */
async function write(client: AnthropicLike, landmark: Landmark, year: number, notes: string): Promise<EraBrief> {
  const prompt = buildWritingPrompt(landmark, year, notes, VOICE_CATALOG);
  const voiceKeys = Object.keys(VOICE_CATALOG);
  const messages: Anthropic.Beta.BetaMessageParam[] = [{ role: 'user', content: prompt.user }];
  let problems: string[] = [];

  for (let attempt = 0; attempt < 2; attempt++) {
    const stream = client.beta.messages.stream({
      model: HISTORIAN_MODEL,
      max_tokens: WRITING_MAX_TOKENS,
      betas: [FALLBACK_BETA],
      fallbacks: 'default',
      output_config: { effort: 'medium', format: betaZodOutputFormat(EraBriefSchema) },
      system: prompt.system,
      messages,
    });
    const final = await stream.finalMessage();
    if (final.stop_reason === 'refusal') throw new HistorianError(`Writing for ${landmark.id} ${year} was declined`);
    if (final.stop_reason === 'max_tokens') throw new HistorianError(`Writing for ${landmark.id} ${year} ran out of tokens`);

    const parsed = EraBriefSchema.safeParse(final.parsed_output);
    if (!parsed.success) {
      problems = [`The JSON did not match the schema: ${parsed.error.issues[0]?.message ?? 'invalid'}.`];
    } else {
      const brief = stripDisallowedImages(parsed.data);
      problems = validateBrief(brief, voiceKeys);
      if (problems.length === 0) return brief;
    }
    messages.push({ role: 'assistant', content: final.content });
    messages.push({ role: 'user', content: buildCorrectionPrompt(problems) });
  }
  throw new HistorianError(`Brief for ${landmark.id} ${year} failed checks: ${problems.join(' ')}`);
}
