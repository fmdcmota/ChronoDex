/**
 * The Historian: researches a landmark in one year and writes the text half of an Era.
 *
 * Owner: Agent 1 (Core). Implements MASTER.md sections 4.4 and 7, task A1-11. The team replaced
 * Claude with DeepSeek (decision D-026), so MASTER.md section 7 is out of date until a human edits it.
 *
 * Two DeepSeek calls, both streamed, through ../chat/deepseek.ts:
 * 1. Research: thinking on (`reasoning_effort: "high"`), with DeepSeek's server-side tools
 *    `deepseek_web_search` and `deepseek_read_url`. The server runs the searches inside the one
 *    request. Returns free-text notes, and the URLs the tools reported searching, reading or citing.
 * 2. Writing: JSON mode, thinking off, no tools (JSON mode cannot be combined with the web tools).
 *    The reply is parsed, checked against EraBriefSchema, reduced to sources the research really
 *    found (a model writing from memory can invent a plausible URL), and checked against the
 *    script rules in ./validate.ts. One corrective retry if a check fails.
 *
 * Cost and time: measured figures are in notebook/agent-1.md. Web tool prices are on DeepSeek's
 * pricing page, not on the API reference. Without DEEPSEEK_API_KEY it throws; there is no
 * placeholder fallback, so placeholder text can never be stored as a real era.
 * Side effects: DeepSeek requests only. Writes nothing; the pipeline stores the result.
 */
import { EraBriefSchema, type EraBrief, type Landmark } from '@/lib/contracts';
import { VOICE_CATALOG } from '@/lib/fal/voices';
import {
  DeepSeekError,
  completeDeepSeek,
  type DeepSeekCompletion,
  type DeepSeekMessage,
  type DeepSeekRequest,
} from '@/lib/chat/deepseek';
import { buildCorrectionPrompt, buildResearchPrompt, buildWritingPrompt } from './prompt';
import { keepFoundUrls, stripDisallowedImages, validateBrief } from './validate';

export { countWords, isGoogleUrl, keepFoundUrls, normalizeUrl, stripDisallowedImages, validateBrief } from './validate';
export { briefJsonExample, buildCorrectionPrompt, buildResearchPrompt, buildWritingPrompt, viewingDirection } from './prompt';

/**
 * Historian model. Override with HISTORIAN_MODEL (any `deepseek-` model).
 *
 * `deepseek-flash`, not `deepseek-v4-pro`: on 14 Nov 2026 the same research request finished on
 * flash in 140 s, and failed twice out of two on pro with "The model failed to generate a complete
 * response" once the web tools were involved (F-031).
 */
export const DEFAULT_HISTORIAN_MODEL = 'deepseek-flash';
/** Output ceilings. In thinking mode DeepSeek limits each inference step, not the whole round. */
const RESEARCH_MAX_TOKENS = 32_000;
const WRITING_MAX_TOKENS = 8_000;
/** Research can take minutes (it reads pages); writing from notes takes seconds. */
const RESEARCH_TIMEOUT_MS = 8 * 60 * 1000;
const WRITING_TIMEOUT_MS = 3 * 60 * 1000;
/** Retries for a DeepSeek 429, 5xx or dropped connection, and the pause before the first. */
const MAX_TRANSIENT_RETRIES = 2;
const DEFAULT_RETRY_DELAY_MS = 3000;
/** How many characters of a bad reply to show in a log or an error. */
const SNIPPET_CHARS = 200;

/** The Historian could not produce a valid brief. The message says why. */
export class HistorianError extends Error {}

/** Options for writeEraBrief. Tests inject the fetch and zero the delay. */
export interface WriteEraBriefOptions {
  fetchImpl?: typeof fetch;
  /** Pause before the first transient retry, doubled for the next. Defaults to 3000. */
  retryDelayMs?: number;
  /** Abort to stop early, for example on worker shutdown. */
  signal?: AbortSignal;
}

/**
 * Pick the Historian model. HISTORIAN_MODEL is honoured only if it names a DeepSeek model, so a
 * leftover value such as `claude-opus-5-5` can never be sent to DeepSeek.
 *
 * @returns A model id that starts with `deepseek-`.
 */
export function historianModel(): string {
  const requested = process.env.HISTORIAN_MODEL;
  if (!requested) return DEFAULT_HISTORIAN_MODEL;
  if (requested.startsWith('deepseek-')) return requested;
  console.warn(`HISTORIAN_MODEL "${requested}" is not a DeepSeek model: using ${DEFAULT_HISTORIAN_MODEL}`);
  return DEFAULT_HISTORIAN_MODEL;
}

/**
 * Research a landmark in a given year and write its brief: title, summary, sourced fun facts,
 * the scene brief for the image models, and a fictional guide with a 105 to 120 word script.
 *
 * @param landmark - The landmark.
 * @param year - The year to describe.
 * @param options - Optional injected fetch, retry delay and signal.
 * @returns The brief. The guide has no headshot; the pipeline makes it.
 * @throws HistorianError when DEEPSEEK_API_KEY is missing, research finds no sources, DeepSeek
 *   declines or runs out of tokens, or the brief still fails the checks after one correction.
 *   DeepSeekError for API failures that survived the retries.
 */
export async function writeEraBrief(landmark: Landmark, year: number, options: WriteEraBriefOptions = {}): Promise<EraBrief> {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) throw new HistorianError('DEEPSEEK_API_KEY is not set');
  const base = { apiKey, fetchImpl: options.fetchImpl };
  const retryDelayMs = options.retryDelayMs ?? DEFAULT_RETRY_DELAY_MS;
  const model = historianModel();

  const research = await runResearch({ landmark, year, model, base, retryDelayMs, signal: options.signal });
  return runWriting({ landmark, year, model, base, retryDelayMs, signal: options.signal, ...research });
}

/** The parts of a request every Historian call shares. */
interface CallContext {
  landmark: Landmark;
  year: number;
  model: string;
  base: Pick<DeepSeekRequest, 'apiKey' | 'fetchImpl'>;
  retryDelayMs: number;
  signal?: AbortSignal;
}

/**
 * Phase 1: research with DeepSeek's web tools.
 *
 * @param ctx - Landmark, year, model and call settings.
 * @returns The notes and every URL the tools reported.
 * @throws HistorianError on refusal, truncation, empty notes, or no sources found.
 */
async function runResearch(ctx: CallContext): Promise<{ notes: string; foundUrls: string[] }> {
  const prompt = buildResearchPrompt(ctx.landmark, ctx.year);
  const where = `${ctx.landmark.id} ${ctx.year}`;
  const done = await withRetry(
    () =>
      completeDeepSeek({
        ...ctx.base,
        model: ctx.model,
        messages: [
          { role: 'system', content: prompt.system },
          { role: 'user', content: prompt.user },
        ],
        maxTokens: RESEARCH_MAX_TOKENS,
        reasoningEffort: 'high',
        tools: [{ type: 'deepseek_web_search' }, { type: 'deepseek_read_url' }],
        signal: withTimeout(ctx.signal, RESEARCH_TIMEOUT_MS),
      }),
    ctx.retryDelayMs,
  );
  assertFinished(done, `Research for ${where}`);
  const notes = done.text.trim();
  if (!notes) throw new HistorianError(`Research for ${where} returned no notes`);
  // Only URLs the tools themselves reported count as found: a URL typed into the notes from
  // memory proves nothing.
  if (done.urls.length === 0) throw new HistorianError(`Research for ${where} found no sources, so no claim could be cited`);
  return { notes, foundUrls: done.urls };
}

/**
 * Phase 2: write the brief as JSON, check it, and correct it once if needed.
 *
 * @param ctx - Landmark, year, model, call settings, and the phase 1 results.
 * @returns A brief that passes every check.
 * @throws HistorianError when it still fails after one correction.
 */
async function runWriting(ctx: CallContext & { notes: string; foundUrls: string[] }): Promise<EraBrief> {
  const prompt = buildWritingPrompt(ctx.landmark, ctx.year, ctx.notes, VOICE_CATALOG, ctx.foundUrls);
  const voiceKeys = Object.keys(VOICE_CATALOG);
  const where = `${ctx.landmark.id} ${ctx.year}`;
  const messages: DeepSeekMessage[] = [
    { role: 'system', content: prompt.system },
    { role: 'user', content: prompt.user },
  ];
  let problems: string[] = [];

  for (let attempt = 0; attempt < 2; attempt++) {
    const done = await withRetry(
      () =>
        completeDeepSeek({
          ...ctx.base,
          model: ctx.model,
          messages,
          maxTokens: WRITING_MAX_TOKENS,
          reasoningEffort: 'none',
          json: true,
          signal: withTimeout(ctx.signal, WRITING_TIMEOUT_MS),
        }),
      ctx.retryDelayMs,
    );
    assertFinished(done, `Writing for ${where}`);

    const text = done.text.trim();
    const parsed = parseBrief(text);
    if (!parsed.ok) {
      problems = [parsed.problem];
    } else {
      // Sources must be pages the research found; reference images likewise.
      const { brief: found, dropped } = keepFoundUrls(stripDisallowedImages(parsed.brief), ctx.foundUrls);
      problems = validateBrief(found, voiceKeys);
      if (problems.length === 0) {
        if (dropped.length > 0) console.warn(`Historian ${where}: dropped ${dropped.length} URL(s) the research never found`);
        return found;
      }
      if (dropped.length > 0) problems.push(`These URLs were not found by the research and were removed: ${dropped.join(', ')}. Cite only URLs from the list.`);
    }
    // Show the model its own reply (when it wrote one) and what was wrong with it.
    if (text) messages.push({ role: 'assistant', content: text });
    messages.push({ role: 'user', content: buildCorrectionPrompt(problems) });
  }
  throw new HistorianError(`Brief for ${where} failed checks: ${problems.join(' ')}`);
}

/**
 * Turn the writing model's reply into a brief.
 *
 * DeepSeek's JSON mode blanks a reply that is not valid JSON, so an empty reply is a failure to
 * report, not a brief. Code fences and text around the object are tolerated.
 *
 * @param text - The reply text.
 * @returns The brief, or a problem in plain words to send back to the model.
 */
export function parseBrief(text: string): { ok: true; brief: EraBrief } | { ok: false; problem: string } {
  if (!text) return { ok: false, problem: 'The reply was empty. Return the complete brief as one json object.' };
  const unfenced = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  const start = unfenced.indexOf('{');
  const end = unfenced.lastIndexOf('}');
  let raw: unknown;
  try {
    raw = JSON.parse(start >= 0 && end > start ? unfenced.slice(start, end + 1) : unfenced);
  } catch {
    return { ok: false, problem: `The reply was not valid json (it began: ${unfenced.slice(0, SNIPPET_CHARS)}).` };
  }
  const result = EraBriefSchema.safeParse(raw);
  if (result.success) return { ok: true, brief: result.data };
  const issue = result.error.issues[0];
  const field = issue?.path.length ? issue.path.join('.') : 'the object';
  return { ok: false, problem: `The json did not match the required shape at ${field}: ${issue?.message ?? 'invalid'}.` };
}

/**
 * Stop on a finish reason that means the reply cannot be used.
 *
 * @param done - The collected completion.
 * @param what - What was being done, for the message.
 * @throws HistorianError on `length` (out of tokens) and `content_filter` (declined).
 */
function assertFinished(done: DeepSeekCompletion, what: string): void {
  if (done.finishReason === 'length') throw new HistorianError(`${what} ran out of tokens`);
  if (done.finishReason === 'content_filter') throw new HistorianError(`${what} was declined by DeepSeek's content filter`);
}

/**
 * A signal that aborts after a timeout, and also when the caller's signal aborts.
 *
 * @param signal - The caller's signal, if any.
 * @param timeoutMs - Time limit in milliseconds.
 * @returns A combined signal.
 */
function withTimeout(signal: AbortSignal | undefined, timeoutMs: number): AbortSignal {
  const timeout = AbortSignal.timeout(timeoutMs);
  return signal ? AbortSignal.any([signal, timeout]) : timeout;
}

/**
 * Run a DeepSeek call, retrying a rate limit (429), a server error (5xx), a mid-stream "please
 * retry" or a dropped connection. Other errors, aborts and timeouts are not retried.
 *
 * @param call - The call to run.
 * @param delayMs - Pause before the first retry; doubled for the second.
 * @returns The call's result.
 * @throws The last error when retries run out, or at once for a non-transient error.
 */
async function withRetry<T>(call: () => Promise<T>, delayMs: number): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await call();
    } catch (err) {
      const transient =
        (err instanceof DeepSeekError && err.retryable) ||
        (err instanceof TypeError && /fetch failed|network/i.test(err.message));
      if (!transient || attempt >= MAX_TRANSIENT_RETRIES) throw err;
      await new Promise((resolve) => setTimeout(resolve, delayMs * 2 ** attempt));
    }
  }
}
