/**
 * "Check, then keep": generate a picture, have the critic judge it, retry once with the critic's advice, keep the
 * better of the two.
 *
 * Owner: Agent 2 (Studio). Implements MASTER.md section 5.3 rule 5 and task A2-12.
 *
 * Why only one retry: each retry repeats a paid generation ($0.15) and the critic is a judge, not an oracle. The
 * retry gets the critic's own one-line fix appended to the prompt; if it is no better, the first result stays.
 * A critic that cannot answer counts as a pass, so a flaky checker never blocks or doubles generation.
 */
import { MAX_CHECK_ATTEMPTS } from '@/lib/fal';
import type { CheckVerdict } from './critic';
import type { StageContext, StageOutput } from './types';

/** What a checked generation reports, attached to the stage output so the log and the job can show it. */
export interface CheckReport {
  /** True when the kept picture passed the critic (or the critic could not be reached). */
  passed: boolean;
  /** False when the critic never gave a usable answer, so `passed` is only a default. */
  checked: boolean;
  /** How many generations it took, 1 or 2. */
  attempts: number;
  /** The kept picture's problems (hard failures first), empty when it passed. Soft notes are dropped on a pass. */
  problems: string[];
  /** Dollars spent on the critic across all attempts, from fal's usage reports. */
  checkCostUsd: number;
}

/**
 * The runFal context for a critic call. It must NOT carry the stage's resume id or its request-id callback:
 * the critic is a separate request, and saving its id would overwrite the picture's id on the job stage.
 *
 * @param ctx - The stage context.
 * @returns A context with only the queue and the poll interval.
 */
export function criticContext(ctx: StageContext): StageContext {
  return { queue: ctx.queue, pollIntervalMs: ctx.pollIntervalMs, timeoutMs: CRITIC_TIMEOUT_MS };
}

/** Give up on a critic call after this long. It normally takes a few seconds. */
const CRITIC_TIMEOUT_MS = 2 * 60 * 1000;

/** Whether the critic runs: on unless IMAGE_CHECKS is "off" or the stage context says so. */
export function checksEnabled(ctx: StageContext | undefined): boolean {
  if (ctx?.checks) return ctx.checks === 'on';
  return process.env.IMAGE_CHECKS !== 'off';
}

/**
 * A number that is lower for a better picture: a pass beats any fail, then fewer hard failures beat more.
 *
 * @param verdict - The critic's verdict.
 * @param extraProblems - Problems found by cheaper local checks (for example an unpainted canvas).
 * @returns 0 for a pass, otherwise the number of problems (at least 1).
 */
export function badness(verdict: CheckVerdict, extraProblems = 0): number {
  if (verdict.passed && extraProblems === 0) return 0;
  return Math.max(1, verdict.hard.length + extraProblems);
}

/**
 * Generate with at most `maxAttempts` tries (default MAX_CHECK_ATTEMPTS), judging each, and return the best.
 *
 * @param options - How to generate, how to judge, and the stage context.
 * @param options.generate - Makes one picture. Receives an extra instruction (the critic's fix) on the retry and
 *   a context whose resume id is cleared on the retry, because a saved request belongs to the first attempt.
 * @param options.judge - Judges one picture. Returns the critic's verdict and any extra problems already known.
 * @param options.ctx - The stage context.
 * @param options.maxAttempts - Most generations, first included. Default MAX_CHECK_ATTEMPTS.
 * @returns The best output and a report.
 */
export async function generateChecked<T extends StageOutput>(options: {
  generate: (extraInstruction: string | null, ctx: StageContext) => Promise<T>;
  judge: (output: T) => Promise<{ verdict: CheckVerdict; extraProblems?: string[] }>;
  ctx: StageContext;
  /** Most generations, first included. Default MAX_CHECK_ATTEMPTS (2). The panorama passes 3 (HUMAN_TASKS 2.4). */
  maxAttempts?: number;
}): Promise<{ output: T; report: CheckReport }> {
  const { generate, judge, ctx } = options;
  const maxAttempts = Math.max(1, options.maxAttempts ?? MAX_CHECK_ATTEMPTS);
  let best = await generate(null, ctx);
  if (!checksEnabled(ctx)) return { output: best, report: { passed: true, checked: false, attempts: 1, problems: ['checks are off'], checkCostUsd: 0 } };

  const judged = await judge(best);
  let cost = judged.verdict.costUsd ?? 0;
  let attempts = 1;
  let bestScore = badness(judged.verdict, judged.extraProblems?.length ?? 0);
  let bestProblems = [...judged.verdict.problems, ...(judged.extraProblems ?? [])];
  let bestChecked = judged.verdict.checked;
  // Each retry is told what was wrong with the attempt just before it, which may differ from the best one's problem.
  let advice = judged.verdict.fix || bestProblems[0] || null;

  while (bestScore > 0 && attempts < maxAttempts) {
    attempts++;
    const retry = await generate(advice, { ...ctx, resumeRequestId: null });
    const retryJudged = await judge(retry);
    cost += retryJudged.verdict.costUsd ?? 0;
    const retryScore = badness(retryJudged.verdict, retryJudged.extraProblems?.length ?? 0);
    const retryProblems = [...retryJudged.verdict.problems, ...(retryJudged.extraProblems ?? [])];
    advice = retryJudged.verdict.fix || retryProblems[0] || advice;
    if (retryScore < bestScore) {
      best = retry;
      bestScore = retryScore;
      bestProblems = retryProblems;
      bestChecked = retryJudged.verdict.checked;
    }
  }
  return { output: best, report: { passed: bestScore === 0, checked: bestChecked, attempts, problems: bestScore === 0 ? [] : bestProblems, checkCostUsd: cost } };
}
