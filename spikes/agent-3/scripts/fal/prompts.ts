/**
 * Prompt builder for fal-generated landmark sprites (MASTER.md task A3-01, rule 8.4.4: prompts
 * are code). Owner: Agent 3.
 */
import type { Landmark } from '../../src/lib/contracts-copy';

/**
 * What each landmark looks like, in plain visual words a text-to-image model can draw.
 * Written from the real buildings; no names of games, studios or artists (assumption A1).
 */
export const SPRITE_SUBJECTS: Record<string, string> = {
  'huxley-building': 'a modern 1960s concrete university block with a regular grid of windows and a small gold flag on the roof',
  'queens-tower': 'a tall slim Victorian campanile of red brick with white stone bands, an open belfry and a green copper dome',
  'royal-albert-hall': 'a round Victorian concert hall of red brick with a terracotta frieze band and a shallow glass and iron dome',
  'exhibition-road': 'a Victorian street lamp post and a small tree standing on diagonal chequered granite paving',
  'v-and-a': 'a grand Edwardian museum front of red brick and pale stone with a central tower topped by an open crown-shaped lantern',
  'natural-history-museum': 'a long Romanesque museum front in buff terracotta with blue-grey bands and two tall spired towers',
};

/**
 * Build the text-to-image prompt for one landmark sprite.
 *
 * Intent: a single building, front-on, centred, on a flat plain background that background
 * removal can cut out cleanly, in a chunky pixel-art style that survives being shrunk to 32 px.
 *
 * Example output for queens-tower:
 * "Pixel art game sprite of a tall slim Victorian campanile of red brick with white stone bands,
 * an open belfry and a green copper dome. Front view, the whole building centred and filling the
 * frame, standing on a small patch of ground. Chunky pixels, a dark one-pixel outline, flat
 * colours with simple two-tone shading lit from the upper left, no gradients. Plain flat
 * light-grey background, nothing else in the picture, no text, no people."
 *
 * @param landmark - The landmark to draw.
 * @returns The prompt.
 * @throws Error when no visual description exists for the landmark id.
 */
export function buildSpritePrompt(landmark: Pick<Landmark, 'id'>): string {
  const subject = SPRITE_SUBJECTS[landmark.id];
  if (!subject) throw new Error(`No sprite description for landmark "${landmark.id}"`);
  return (
    `Pixel art game sprite of ${subject}. ` +
    'Front view, the whole building centred and filling the frame, standing on a small patch of ground. ' +
    'Chunky pixels, a dark one-pixel outline, flat colours with simple two-tone shading lit from the upper left, no gradients. ' +
    'Plain flat light-grey background, nothing else in the picture, no text, no people.'
  );
}
