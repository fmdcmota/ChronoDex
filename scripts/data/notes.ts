/**
 * Render an era dossier as plain-text research notes in the Historian's own format.
 *
 * Owner: Agent 5 (Archivist). Implements AGENT5.md section 5.4, task A5-01.
 * The six headings are the ones `buildResearchPrompt` in src/lib/historian/prompt.ts asks its
 * research phase for, so Agent 1 can pass this text to the writing phase (`buildWritingPrompt`)
 * in place of a live web search. `data/eras/<eraId>.notes.txt` is always this function's output:
 * ./build.ts writes it and ./validate.ts regenerates and compares, so notes and JSON cannot drift.
 */
import type { DataSource, EraFile, ReferenceImage } from './schema';

/** The headings, in the order the Historian's research notes use. */
export const NOTES_HEADINGS = ['FACTS:', 'DAILY LIFE:', 'SCENE FROM THE PHOTO SPOT:', 'ALL AROUND:', 'IMAGES:', 'GAPS:'] as const;

/** Written under a heading that has nothing to list, so the heading is never left bare. */
export const NOTES_NONE = '- None.';

/**
 * Citations as the Historian writes them: each URL in square brackets.
 *
 * @param sources - The citations of one claim.
 * @returns For example " [https://a] [https://b]", or an empty string.
 */
function cite(sources: readonly DataSource[]): string {
  return sources.map((s) => ` [${s.url}]`).join('');
}

/**
 * One bullet for a list in the scene block.
 *
 * @param label - For example "Still there today".
 * @param items - The list. An empty list renders as "none".
 * @returns The bullet line.
 */
function sceneList(label: string, items: readonly string[]): string {
  return `- ${label}: ${items.length > 0 ? items.join('; ') : 'none'}.`;
}

/**
 * One line for a period image the image model may be given.
 *
 * @param image - A `same_view` or `nearby` image.
 * @returns The direct URL followed by its receipt in brackets.
 */
function imageLine(image: ReferenceImage): string {
  const match = image.match.replace('_', ' ');
  return `- ${image.url} (page: ${image.pageUrl}, ${image.licence}, ${image.author}, ${image.date}, ${match}: ${image.title})`;
}

/**
 * Render a dossier as research notes.
 *
 * Guide grounding (roles, dress, speech, prices, transport) goes under DAILY LIFE, because the
 * Historian's format has no heading of its own for it and that is where the writing phase looks
 * for the guide's world. Only `same_view` and `nearby` images are listed: `context` images must
 * not reach the image model (AGENT5.md 5.3).
 *
 * @param era - A dossier that passed the schema.
 * @returns The notes text, ending with a newline.
 */
export function renderNotes(era: EraFile): string {
  const lines: string[] = [];
  const section = (heading: string, body: string[]) => {
    lines.push(heading, ...(body.length > 0 ? body : [NOTES_NONE]));
  };

  section(
    NOTES_HEADINGS[0],
    era.facts.map((f) => `- ${f.claim}${f.funFact ? ' (fun fact)' : ''}${f.confidence === 'medium' ? ' (single source: treat as likely, not certain)' : ''}${cite(f.sources)}`),
  );

  const grounding = era.guideGrounding;
  const groundingLines = [
    ...grounding.roles.map((r) => `- Plausible job for a fictional guide here in ${era.year}: ${r.role}.${cite(r.sources)}`),
    ...(['dress', 'speech', 'prices', 'transport'] as const)
      .filter((key) => grounding[key].trim())
      .map((key) => `- ${key[0].toUpperCase()}${key.slice(1)} in ${era.year}: ${grounding[key].trim()}`),
  ];
  section(NOTES_HEADINGS[1], [...era.dailyLife.map((d) => `- ${d.claim}${cite(d.sources)}`), ...groundingLines]);

  section(NOTES_HEADINGS[2], [
    `- ${era.scene.description}`,
    sceneList('Still there today, unchanged', era.scene.persists),
    sceneList(`There in ${era.year} but different today`, era.scene.altered),
    sceneList(`Exists today but not yet built in ${era.year}`, era.scene.notYetBuilt),
    sceneList(`There in ${era.year} and gone today`, era.scene.gone),
  ]);
  section(NOTES_HEADINGS[3], [`- ${era.scene.surroundings}`]);
  section(NOTES_HEADINGS[4], era.referenceImages.filter((image) => image.match !== 'context').map(imageLine));
  section(NOTES_HEADINGS[5], era.gaps.map((gap) => `- ${gap}`));
  return `${lines.join('\n')}\n`;
}
