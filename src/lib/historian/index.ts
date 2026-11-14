/**
 * The Historian: researches a landmark in one year and writes the text half of an Era.
 *
 * Owner: Agent 1 (Core). Implements MASTER.md sections 4.4 and 7.
 *
 * M0 STUB: returns a placeholder brief from fixtures. TODO(agent-1): A1-11 replaces the body with
 * a Claude call (claude-opus-5-5, web search on, structured JSON validated with EraBriefSchema),
 * following the Historian rules in MASTER.md section 7. The signature will not change.
 */
import type { EraBrief, Landmark } from '@/lib/contracts';
import { placeholderBrief } from '@fixtures/index';

/**
 * Research a landmark in a given year and write its brief: title, summary, sourced fun facts,
 * the scene brief for the image models, and a fictional guide with a 105 to 120 word script.
 *
 * Cost and time (once real): one Claude Opus call with up to a few web searches, about a minute.
 * The stub costs nothing and returns at once.
 *
 * @param landmark - The landmark.
 * @param year - The year to describe.
 * @returns The brief. The guide has no headshot; the pipeline makes it.
 * @throws Error when the model's answer does not validate (real implementation only).
 */
export async function writeEraBrief(landmark: Landmark, year: number): Promise<EraBrief> {
  return placeholderBrief(landmark, year);
}
