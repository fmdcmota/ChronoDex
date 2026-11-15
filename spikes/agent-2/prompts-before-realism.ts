/**
 * FROZEN COPY of src/lib/pipeline/stages/prompts.ts as committed before the realism rework (A2-08 state),
 * kept only so the realism bake-off can show the baseline next to the new prompts. Do not edit; not used by src/.
 */
import type { Guide, SceneBrief } from '../../src/lib/contracts/index.js';

/** The part of a Guide the image and video prompts need. */
export type GuideLook = Pick<Guide, 'name' | 'role' | 'appearance'>;

/** The part of a SceneBrief the scene prompt needs. */
export type SceneChanges = Pick<SceneBrief, 'description' | 'changes'>;

/** Turn a list into "- a\n- b", or a fallback line when it is empty, so the model never sees a bare heading. */
function bullets(items: string[], whenEmpty: string): string {
  return items.length ? items.map((item) => `- ${item}`).join('\n') : `- ${whenEmpty}`;
}

/**
 * Prompt for stage `scene`: edit the present-day reference photo into the given year.
 *
 * Intent: keep the exact camera position, lens and horizon, because the panorama, guide frame and
 * walk clips are all grown from this image and the then/now slider overlays it on the reference
 * photo (A2-02: Nano Banana Pro kept the framing, 2.1 drifted). The change list keeps the shape the
 * Historian writes, so each line is one visual instruction.
 *
 * Example output (abridged):
 *   "Edit this photograph so it shows the same place in the year 1880, as a real colour photograph ...
 *    KEEP UNCHANGED:\n- the white stucco terrace on the left ...\nREMOVE, because ...\n- modern cars ..."
 *
 * @param brief - Scene brief from the Historian.
 * @param year - Target year, for example 1880.
 * @returns The prompt for an image-edit model that receives the reference photo.
 */
export function buildScenePrompt(brief: SceneChanges, year: number): string {
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
 * Prompt for stage `panorama`: fill the grey canvas around the scene into a full 360 by 180 degree view.
 *
 * Intent (A2-03, route b2): the model only invents what is behind and beside the viewer. The centre
 * must stay the scene, so the viewer opens facing the landmark. "Seamless left and right edges" lets
 * the viewer wrap without a join. The not-yet-built list is repeated here because the first run drew
 * modern road markings on a period street.
 *
 * Example output (abridged):
 *   "The photograph in the middle of this image is the forward view of a full 360 by 180 degree
 *    equirectangular panorama. Replace all of the flat grey ... Not yet built in 1880, so none of this appears: ..."
 *
 * @param surroundings - SceneBrief.surroundings: what is behind and beside the viewer in that year.
 * @param notYetBuilt - SceneBrief.changes.notYetBuilt: things that must not appear anywhere.
 * @param year - Target year.
 * @returns The prompt for an image-edit model that receives the grey canvas with the scene in the middle.
 */
export function buildPanoramaPrompt(surroundings: string, notYetBuilt: string[], year: number): string {
  return [
    'The photograph in the middle of this image is the forward view of a full 360 by 180 degree equirectangular panorama.',
    `Replace all of the flat grey with the rest of the panorama, so the whole image is one continuous photograph of the same place in the year ${year}, seen from the same standing point.`,
    'Keep the photograph in the middle exactly as it is. Continue its buildings, street, pavement and sky outward with matching perspective, light and colour, and no visible borders.',
    `What surrounds the viewer: ${surroundings}`,
    `Not yet built in ${year}, so none of this appears anywhere in the panorama:\n${bullets(notYetBuilt, 'anything modern')}`,
    'Use correct equirectangular projection: the horizon is a straight level line across the exact vertical middle, straight vertical lines stay vertical, sky fills the top and the ground fills the bottom.',
    'The left and right edges must join seamlessly, because they meet behind the viewer.',
    'No text, borders, watermarks, people looking at the camera, fisheye circle or vignette.',
  ].join('\n\n');
}

/**
 * Prompt for stage `headshot`: the guide's chat profile picture.
 *
 * Intent: a clean, front-facing, evenly lit head-and-shoulders portrait. It doubles as the identity
 * reference for `guide_frame`, so the face must be unobstructed and the clothing clearly of the
 * period. A2-02 note: the model ignored "plain grey background" and drew a blurred period street,
 * which looked good, so the prompt now asks for a softly blurred background.
 *
 * Example output (abridged):
 *   "Photorealistic colour portrait photograph of Martha Hale, flower seller on Exhibition Road, in the
 *    year 1880. Appearance: ... Head and shoulders, facing the camera ..."
 *
 * @param guide - The fictional guide.
 * @param year - The guide's year.
 * @returns The prompt for a text-to-image model.
 */
export function buildHeadshotPrompt(guide: GuideLook, year: number): string {
  return [
    `Photorealistic colour portrait photograph of ${guide.name}, ${guide.role}, in the year ${year}.`,
    `Appearance: ${guide.appearance}`,
    'Head and shoulders, facing the camera, friendly natural expression, eyes to camera, face fully visible and unobstructed.',
    'Soft even daylight, softly blurred neutral background. Period-accurate clothing and hair.',
    'No text, border, frame, sepia or vintage photo effects. Sharp, true colour, modern camera quality.',
  ].join('\n');
}

/**
 * Prompt for stage `guide_frame`: the guide standing in the scene. Image 1 is the scene, image 2 the headshot.
 *
 * Intent: this one frame is the end of walk_on, the whole of talk and the start of walk_off, so it
 * must keep the scene unchanged apart from the guide, and the guide must match the headshot. The
 * guide is a waist-up close-up: the first try said "two metres away, knees up" and got a full-length
 * figure eight metres away with a 40 px face, too small to lip-sync (A2-05).
 *
 * Example output (abridged):
 *   "Medium close-up: the person from image 2 (Martha Hale, ...) stands in the foreground of the street
 *    photograph in image 1 ... framed from the waist up ..."
 *
 * @param guide - The fictional guide.
 * @param year - The guide's year.
 * @returns The prompt for an image-edit model given [scene, headshot], in that order.
 */
export function buildGuideFramePrompt(guide: GuideLook, year: number): string {
  return [
    `Medium close-up: the person from image 2 (${guide.name}, ${guide.role}) stands in the foreground of the street photograph in image 1, very close to the camera, as if photographed there in ${year}.`,
    'They are large in the frame: framed from the waist up, the top of the head near the top quarter of the image, the body filling about a third of the image width, slightly left of centre. Their face is big and clearly visible.',
    `Same face, hair, hat and clothing as image 2. Appearance: ${guide.appearance}`,
    'Facing the camera, friendly closed-mouth smile, arms relaxed.',
    'Keep everything else in image 1 exactly as it is: same camera position, framing, buildings, street, light and colours. Do not crop or zoom.',
    'Match the lighting, colour and sharpness of image 1 so the person looks naturally part of the photograph, with a soft shadow on the ground.',
    'No text, borders or watermarks.',
  ].join('\n\n');
}

/**
 * Prompt for stages `walk_on` and `walk_off`: a first-and-last-frame video between the empty scene
 * and the guide frame.
 *
 * Intent: the camera must not move, because the clip has to cut cleanly into the talk clip (same
 * frame). The guide enters from the near pavement side so she grows into the close-up position
 * instead of popping in. Distant traffic may move a little.
 *
 * Example output (abridged): "Static camera, locked off, no zoom, no pan. Martha Hale, a woman in her
 * late thirties, ..., walks into the frame from the left along the pavement towards the camera ..."
 *
 * @param guide - The fictional guide.
 * @param direction - 'on': empty scene to guide frame. 'off': guide frame to empty scene.
 * @returns The prompt for an image-to-video model given a start and an end frame.
 */
export function buildWalkPrompt(guide: GuideLook, direction: 'on' | 'off'): string {
  // Appearance is written as a sentence; drop its final full stop so it reads as an apposition.
  const appearance = guide.appearance.replace(/\.\s*$/, '');
  const who = `${guide.name}, ${appearance.charAt(0).toLowerCase()}${appearance.slice(1)},`;
  return [
    'Static camera, locked off, no zoom, no pan.',
    direction === 'on'
      ? `${who} walks into the frame from the left along the pavement towards the camera, slows down and stops close to the camera, turns to face it and smiles.`
      : `${who} gives a small friendly nod, turns to the left and walks out of the frame to the left along the pavement.`,
    'Natural walking pace and realistic body motion. The street behind stays the same, with slight natural movement of distant carriages and people.',
  ].join(' ');
}

/**
 * Prompt for stage `talk`, for the avatar models that take one.
 *
 * Intent: keep the body calm and the camera still so the scene does not warp around the face while
 * the model lip-syncs the narration.
 *
 * Example output: "The person talks warmly to the camera with natural lip movement, small nods ..."
 *
 * @returns The prompt string.
 */
export function buildTalkPrompt(): string {
  return 'The person talks warmly to the camera with natural lip movement, small nods and gentle hand gestures. The camera is still. The street behind them stays still apart from slight natural movement.';
}
