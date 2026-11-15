/**
 * The image critic: a vision model, reached through fal, that judges a generated picture and says what is wrong
 * with it in a form the pipeline can act on.
 *
 * Owner: Agent 2 (Studio). Implements MASTER.md section 5.3 rule 5 ("check, then keep"), task A2-12.
 *
 * Model: MODELS.image_check (fal's OpenRouter vision endpoint) with the vision model named by CRITIC_MODEL_ID,
 * Claude Haiku by default, overridable with IMAGE_CHECK_MODEL. Going through fal means the check needs only the
 * fal key, not a separate Anthropic key.
 * Cost and time: token priced, about a cent and a few seconds per picture.
 * A critic that cannot answer must never block generation: every failure here becomes an "unchecked" verdict,
 * which the caller treats as a pass and notes.
 */
import { CRITIC_MODEL_ID, MODELS, runFal, type FalRunContext } from '@/lib/fal';

/** What a check concluded. */
export interface CheckVerdict {
  /** True when the picture is good enough to keep. Also true when the critic could not answer. */
  passed: boolean;
  /** False when the critic failed or its answer could not be read, so `passed` is only a default. */
  checked: boolean;
  /** Everything the critic disliked, hard failures first, then softer notes. Empty when nothing. */
  problems: string[];
  /**
   * The subset of `problems` that justifies a paid retry: a wrong projection, a visible seam, an anachronism, a
   * computer-generated look on a scene, a wrong guide frame. Soft opinions (a glossy sky, edges that "do not quite
   * match") are noisy: on eight labelled panoramas Sonnet raised them on all of them, including ones that look
   * right to a human, so acting on them would regenerate every picture for little gain.
   */
  hard: string[];
  /** One sentence to add to the generation prompt on the retry, or an empty string. */
  fix: string;
  /** The critic's parsed answer, for the log. Null when unchecked. */
  raw: Record<string, unknown> | null;
  /** Dollars the check cost, from fal's usage report, or null. */
  costUsd: number | null;
}

/** The verdict returned when the critic could not be used: keep the picture and say it was not checked. */
function unchecked(problem: string): CheckVerdict {
  return { passed: true, checked: false, problems: [problem], hard: [], fix: '', raw: null, costUsd: null };
}

/**
 * Pull the JSON object out of a model's answer. Models sometimes wrap it in a code fence or add a sentence.
 *
 * @param text - The model's raw answer.
 * @returns The parsed object, or null when there is none.
 */
export function parseJsonAnswer(text: string): Record<string, unknown> | null {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start < 0 || end <= start) return null;
  try {
    const parsed: unknown = JSON.parse(text.slice(start, end + 1));
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? (parsed as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

/** Read a value as a list of non-empty strings, or an empty list. */
function stringList(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string' && item.trim() !== '').map((s) => s.trim()) : [];
}

/**
 * Turn the critic's answer into a verdict. The picture passes when no HARD failure was found; the critic's own
 * `verdict` word is not used on its own, because it also fails a picture for soft reasons and it sometimes says
 * "pass" while listing a real problem.
 *
 * @param answer - The parsed JSON.
 * @param hard - Hard failures the caller worked out from the answer's specific keys.
 * @param anachronismsAreHard - True when any listed anachronism is a hard failure (it is, for scenes and panoramas).
 * @returns The verdict.
 */
function toVerdict(answer: Record<string, unknown>, hard: string[], anachronismsAreHard = true): CheckVerdict {
  const anachronisms = stringList(answer.anachronisms).map((item) => `anachronism: ${item}`);
  const hardAll = [...new Set([...hard, ...(anachronismsAreHard ? anachronisms : [])])];
  const soft = [...new Set([...stringList(answer.problems), ...(anachronismsAreHard ? [] : anachronisms)])].filter((p) => !hardAll.includes(p));
  const fix = typeof answer.fix === 'string' ? answer.fix.trim() : '';
  return { passed: hardAll.length === 0, checked: true, problems: [...hardAll, ...soft], hard: hardAll, fix, raw: answer, costUsd: null };
}

/**
 * Ask the vision model one question about some images.
 *
 * @param prompt - From one of the buildXxxCheckPrompt functions.
 * @param imageUrls - The pictures, in the order the prompt refers to them.
 * @param ctx - Optional runFal context (queue for tests).
 * @returns The parsed answer and the cost, or null when the call or the parse failed (logged, never thrown).
 */
async function askCritic(prompt: string, imageUrls: string[], ctx: FalRunContext = {}): Promise<{ answer: Record<string, unknown>; costUsd: number | null } | null> {
  const model = process.env.IMAGE_CHECK_MODEL || CRITIC_MODEL_ID;
  try {
    const { data } = await runFal<{ output?: string; usage?: { cost?: number } }>(
      MODELS.image_check.endpoint,
      { prompt, image_urls: imageUrls, model, temperature: 0, max_tokens: 700 },
      ctx,
    );
    const answer = parseJsonAnswer(data.output ?? '');
    if (!answer) {
      console.warn(`image check: the critic's answer was not JSON: ${(data.output ?? '').slice(0, 120)}`);
      return null;
    }
    return { answer, costUsd: typeof data.usage?.cost === 'number' ? data.usage.cost : null };
  } catch (error) {
    console.warn(`image check failed, keeping the picture unchecked: ${error instanceof Error ? error.message : String(error)}`);
    return null;
  }
}

/**
 * Judge a panorama. Hard failures (they trigger a retry): not a 360 projection, a visible seam or repeated panel,
 * an anachronism. Soft notes (recorded only): horizon height, edge continuity, a computer-generated look.
 *
 * @param imageUrl - The panorama.
 * @param prompt - From buildPanoramaCheckPrompt.
 * @param ctx - Optional runFal context.
 * @returns The verdict. Never throws.
 */
export async function checkPanorama(imageUrl: string, prompt: string, ctx: FalRunContext = {}): Promise<CheckVerdict> {
  const result = await askCritic(prompt, [imageUrl], ctx);
  if (!result) return unchecked('the critic could not be reached');
  const { answer } = result;
  const failures: string[] = [];
  if (answer.projection !== 'equirectangular_360') failures.push(`not a 360 panorama (the critic saw: ${String(answer.projection)})`);
  if (answer.visible_seams === true) failures.push('visible seam or repeated panel');
  // Horizon height, edge continuity and a "glossy" look stay in `problems` as notes but do not force a retry.
  const verdict = toVerdict(answer, failures);
  verdict.costUsd = result.costUsd;
  return verdict;
}

/**
 * Judge a scene: right year, nothing that did not exist yet, a photograph and not a render.
 *
 * @param imageUrl - The edited scene.
 * @param prompt - From buildSceneCheckPrompt (with `withReference` when a reference is given).
 * @param ctx - Optional runFal context.
 * @param referenceUrl - The present-day photo the scene was edited from; when given, a changed viewpoint is a hard failure.
 * @returns The verdict. Never throws.
 */
export async function checkScene(imageUrl: string, prompt: string, ctx: FalRunContext = {}, referenceUrl?: string): Promise<CheckVerdict> {
  const result = await askCritic(prompt, referenceUrl ? [imageUrl, referenceUrl] : [imageUrl], ctx);
  if (!result) return unchecked('the critic could not be reached');
  const failures = result.answer.looks_computer_generated === true ? ['looks computer generated, not like a real photograph'] : [];
  if (referenceUrl && result.answer.same_viewpoint === false) failures.push('not the same viewpoint as the reference photo, so Then/Now would not line up');
  const verdict = toVerdict(result.answer, failures);
  verdict.costUsd = result.costUsd;
  return verdict;
}

/**
 * Judge a guide frame against the portrait it should match.
 *
 * @param frameUrl - The guide standing in the scene.
 * @param portraitUrl - The headshot.
 * @param prompt - From buildGuideFrameCheckPrompt.
 * @param ctx - Optional runFal context.
 * @returns The verdict. Never throws.
 */
export async function checkGuideFrame(frameUrl: string, portraitUrl: string, prompt: string, ctx: FalRunContext = {}): Promise<CheckVerdict> {
  const result = await askCritic(prompt, [frameUrl, portraitUrl], ctx);
  if (!result) return unchecked('the critic could not be reached');
  const { answer } = result;
  const failures: string[] = [];
  if (answer.face_visible_and_large === false) failures.push('the face is not large and clear');
  if (answer.same_person_as_portrait === false) failures.push('not the same person as the portrait');
  if (answer.scene_unchanged === false) failures.push('the street behind is distorted');
  const verdict = toVerdict(answer, failures);
  verdict.costUsd = result.costUsd;
  return verdict;
}
