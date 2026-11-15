/**
 * Free checks on a generated picture, run before the paid critic (A2-i).
 *
 * Owner: Agent 2 (Studio). Implements notebook/agent-4-panorama-plan.md section 2 item 4: "free checks before paid
 * ones". A picture of the wrong shape or a nearly empty file is obviously broken; spending $0.0125 on the critic to
 * be told so is waste, so these return the problems and the stage skips the critic and goes straight to its retry.
 */
import type { CheckVerdict } from './critic';

/** How far a picture's width-to-height ratio may be from the one asked for, as a fraction (5 %). */
export const ASPECT_TOLERANCE = 0.05;
/** Width over height of every scene and guide frame (MASTER.md assumption A7). 1K 16:9 comes back 1376x768 (1.79). */
export const WIDESCREEN_RATIO = 16 / 9;
/** Smallest believable size of a finished picture, in bytes. A real 1K JPEG is 150 KB or more. */
export const MIN_IMAGE_BYTES = 30 * 1024;

/** What is known about a picture without looking at its content. Any field may be unknown. */
export interface PictureFacts {
  /** Width in pixels, when fal reported it or the file was read. */
  widthPx?: number | null;
  /** Height in pixels. */
  heightPx?: number | null;
  /** File size in bytes, when the file was downloaded. */
  bytes?: number | null;
}

/**
 * List what is obviously wrong with a picture's shape and size. Unknown facts are not held against it.
 *
 * @param facts - Width, height and size, as far as they are known.
 * @param expectedRatio - Width divided by height asked for, for example 16 / 9 or 2.
 * @returns Problems, empty when nothing is wrong.
 */
export function pictureProblems(facts: PictureFacts, expectedRatio: number): string[] {
  const problems: string[] = [];
  if (facts.widthPx && facts.heightPx) {
    const ratio = facts.widthPx / facts.heightPx;
    if (Math.abs(ratio - expectedRatio) / expectedRatio > ASPECT_TOLERANCE) {
      problems.push(`wrong shape: ${facts.widthPx}x${facts.heightPx} is ${ratio.toFixed(2)}:1, not ${expectedRatio.toFixed(2)}:1`);
    }
  }
  if (typeof facts.bytes === 'number' && facts.bytes < MIN_IMAGE_BYTES) {
    problems.push(`file is only ${facts.bytes} bytes, too small to be a finished picture`);
  }
  return problems;
}

/**
 * A verdict built from free problems, in the shape the retry logic expects. Costs nothing.
 *
 * @param problems - From pictureProblems or another local check. Must not be empty.
 * @param fix - The sentence to add to the prompt on the retry.
 * @returns A failed, checked verdict with no critic cost.
 */
export function localVerdict(problems: string[], fix: string): CheckVerdict {
  return { passed: false, checked: true, problems, hard: problems, fix, raw: null, costUsd: 0 };
}
