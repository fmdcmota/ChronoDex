/**
 * Prototype prompt builders for the scene and headshot stages. Owner: Agent 2 (Studio).
 * Implements MASTER.md 8.4 rule 4 (prompts are code). These move to src/lib/pipeline/stages/ in A2-08.
 * Types are local copies of the MASTER.md 4.1 shapes, because spikes never import src/.
 */

/** Subset of the SceneBrief contract (MASTER.md 4.1) the scene prompt needs. */
export interface SceneBriefLike {
  description: string;
  changes: { persists: string[]; altered: string[]; notYetBuilt: string[]; gone: string[] };
}

/** Subset of the Guide contract (MASTER.md 4.1) the headshot prompt needs. */
export interface GuideLike {
  name: string;
  role: string;
  appearance: string;
}

/** Turn a list into "- a\n- b", or a fallback line when it is empty, so the model never sees a bare heading. */
function bullets(items: string[], whenEmpty: string): string {
  return items.length ? items.map((item) => `- ${item}`).join('\n') : `- ${whenEmpty}`;
}

/**
 * Prompt for stage `scene`: edit the present-day reference photo into the given year.
 *
 * Intent: the edit must keep the exact camera position, lens and horizon, because the panorama, guide frame
 * and walk-on clips are all grown from this image, and the then/now slider lays it over the reference photo.
 * The change list is grouped the way the Historian writes it, so each line maps to one visual instruction.
 * "Remove" lines go before "add" lines; in A2-01 the model was good at replacing whole buildings when told.
 *
 * Example output (abridged):
 *   "Edit this photograph so it shows the same place in the year 1880, as a real colour photograph ...
 *    KEEP UNCHANGED:\n- the white stucco terrace on the left ...\nREMOVE ...\n- modern cars ..."
 *
 * @param brief - Scene brief from the Historian.
 * @param year - Target year, for example 1880.
 * @returns The prompt string for an image-edit model.
 */
export function buildScenePrompt(brief: SceneBriefLike, year: number): string {
  return [
    `Edit this photograph so it shows the same place in the year ${year}, as a real colour photograph taken from exactly the same spot.`,
    'Keep the camera position, height, lens, perspective and horizon identical. Buildings that remain must stay in exactly the same place and size in the frame.',
    `What the camera sees in ${year}: ${brief.description}`,
    `KEEP UNCHANGED:\n${bullets(brief.changes.persists, 'the layout of the street')}`,
    `REMOVE, because they did not exist yet:\n${bullets(brief.changes.notYetBuilt, 'anything modern')}`,
    `CHANGE to how they looked in ${year}:\n${bullets(brief.changes.altered, 'surfaces and street furniture to period versions')}`,
    `ADD BACK, because they stood here then and are gone now:\n${bullets(brief.changes.gone, 'nothing')}`,
    `Fill the street with a few people, vehicles and details typical of ${year}, at a natural density. Overcast natural daylight.`,
    'No text, captions, borders, watermarks, sepia, film grain or vignette. Photorealistic, sharp, true colour.',
  ].join('\n\n');
}

/**
 * Prompt for stage `panorama` when the scene has been pasted into the centre of a grey canvas (routes b2 and c).
 *
 * Intent: the model only invents what is behind and beside the viewer; the centre must stay the scene, so the
 * viewer opens facing the landmark and the panorama agrees with the scene image and the guide video.
 * "Seamless left and right edges" is what lets the 360-degree viewer wrap without a visible join.
 *
 * Example output (abridged):
 *   "This is the centre of a 360 degree equirectangular panorama ... Replace all the flat grey with ...
 *    What surrounds the viewer: ..."
 *
 * @param surroundings - SceneBrief.surroundings: what is behind and beside the viewer in that year.
 * @param year - Target year.
 * @param fullSphere - True for a full 2:1 sphere (sky above, ground below); false for a 21:9 band.
 * @returns The prompt string for an image-edit model.
 */
export function buildPanoramaOutpaintPrompt(surroundings: string, year: number, fullSphere: boolean): string {
  return [
    fullSphere
      ? 'The photograph in the middle of this image is the forward view of a full 360 by 180 degree equirectangular panorama.'
      : 'The photograph in the middle of this image is the forward view of a 360 degree cylindrical panorama band.',
    `Replace all of the flat grey with the rest of the panorama, so the whole image is one continuous photograph of the same place in the year ${year}, seen from the same standing point.`,
    'Keep the photograph in the middle exactly as it is. Continue its buildings, street, pavement and sky outward with matching perspective, light and colour, and no visible borders.',
    `What surrounds the viewer: ${surroundings}`,
    fullSphere
      ? 'Use correct equirectangular projection: the horizon is a straight level line across the exact vertical middle, straight vertical lines stay vertical, sky fills the top and the ground fills the bottom.'
      : 'The horizon is a straight level line across the vertical middle.',
    'The left and right edges must join seamlessly, because they meet behind the viewer.',
    'No text, borders, watermarks, people looking at the camera, fisheye circle or vignette.',
  ].join('\n\n');
}

/**
 * Prompt for stage `panorama` route b1: an empty equirectangular grid as the first reference, the scene as the second.
 *
 * Intent: as MASTER.md 5.4 (b) describes. The grid fixes the output shape (2:1) through `aspect_ratio: "auto"`;
 * the scene gives the content. Kept for comparison with the outpaint route.
 *
 * Example output (abridged): "Image 1 is an empty equirectangular grid. Image 2 is a photograph ..."
 *
 * @param surroundings - SceneBrief.surroundings.
 * @param year - Target year.
 * @returns The prompt string for an image-edit model.
 */
export function buildPanoramaGridPrompt(surroundings: string, year: number): string {
  return [
    'Image 1 is an empty equirectangular grid that shows the exact shape and projection of the output. Image 2 is a photograph of a street.',
    `Create a seamless 360 by 180 degree equirectangular panorama photograph, the same shape as image 1, of the place in image 2 in the year ${year}, from the same standing point.`,
    'The view in image 2 must be in the exact horizontal centre of the panorama. The horizon is a straight level line across the vertical middle. The left and right edges join seamlessly.',
    `What surrounds the viewer: ${surroundings}`,
    'Do not draw any grid lines. No text, borders, watermarks or vignette.',
  ].join('\n\n');
}

/**
 * Prompt for stage `headshot`: the guide's chat profile picture.
 *
 * Intent: a clean, front-facing, evenly lit head-and-shoulders portrait. It doubles as the identity reference
 * for the guide_frame stage in A2-05, so the face must be unobstructed and the clothing clearly of the period.
 * Plain background so it reads at 40 px in a chat bubble.
 *
 * Example output (abridged):
 *   "Photorealistic colour portrait of Martha Hale, flower seller on Exhibition Road in 1880. A woman in her
 *    late thirties ... Head and shoulders, facing the camera ..."
 *
 * @param guide - The fictional guide.
 * @param year - The guide's year.
 * @returns The prompt string for a text-to-image model.
 */
export function buildHeadshotPrompt(guide: GuideLike, year: number): string {
  return [
    `Photorealistic colour portrait photograph of ${guide.name}, ${guide.role}, in the year ${year}.`,
    `Appearance: ${guide.appearance}`,
    'Head and shoulders, facing the camera, friendly natural expression, eyes to camera, face fully visible and unobstructed.',
    'Soft even daylight, plain softly blurred warm grey background. Period-accurate clothing and hair.',
    'No text, border, frame, sepia or vintage photo effects. Sharp, true colour, modern camera quality.',
  ].join('\n');
}
