/**
 * Every prompt the pipeline sends to a fal model, as named, exported builder functions.
 *
 * Owner: Agent 2 (Studio). Implements MASTER.md section 8.4 rule 4 ("prompts are code") and task
 * A2-08. Each prompt was tried in a spike (spikes/agent-2/, notebook/agent-2.md) and the lessons
 * are written into the comments: change a prompt only with a new test image in hand.
 */
import type { Guide, SceneBrief } from '@/lib/contracts';

/** The part of a Guide the image and video prompts need. */
export type GuideLook = Pick<Guide, 'name' | 'role' | 'appearance'>;

/** The part of a SceneBrief the scene prompt needs. */
export type SceneChanges = Pick<SceneBrief, 'description' | 'changes'>;

/** Turn a list into "- a\n- b", or a fallback line when it is empty, so the model never sees a bare heading. */
function bullets(items: string[], whenEmpty: string): string {
  return items.length ? items.map((item) => `- ${item}`).join('\n') : `- ${whenEmpty}`;
}

/**
 * How a period picture should look, and what real photographs it can copy from.
 *
 * Added in the phone-test realism rework: the first panoramas looked "very unrealistic" to the human.
 */
export interface PromptStyle {
  /**
   * `colour`: a restrained, museum-style colourised archive photograph. `monochrome`: a real sepia or
   * black and white photograph of the time. Default `colour`. Which one the product uses is a human
   * decision (asked on the board).
   */
  look?: 'colour' | 'monochrome';
  /**
   * How many real period photographs follow the main picture in the model's image list. When above 0
   * the prompt tells the model to copy their architecture and street detail. Default 0.
   */
  referenceCount?: number;
}

/**
 * Concrete visual cues for a year: lighting, traffic, clothes, street surface. They are the generic
 * fallback; the Historian's own scene brief is more specific and always comes first in the prompt.
 *
 * Why: "make it look like 1893" is too vague for an image model, which falls back on a polished,
 * film-set look. Naming gas lamps, hansom cabs and frock coats pulls it towards real photographs.
 *
 * Example: periodCues(1893) gives "gas street lamps on cast-iron posts, horse-drawn hansom cabs ...".
 *
 * @param year - The era's year.
 * @returns A comma-separated list of cues for that period.
 */
export function periodCues(year: number): string {
  if (year < 1900) {
    return 'gas street lamps on cast-iron posts, horse-drawn hansom cabs, omnibuses and carts, granite setts and packed gravel roads with horse droppings, men in top hats, bowlers and frock coats, women in long skirts, bonnets and shawls, paper handbills and painted shop signs, soot-darkened stonework, a smoky overcast sky';
  }
  if (year < 1946) {
    return 'electric and gas street lamps, a mix of horse-drawn carts and early motor cars, motor buses with open tops, tarmac and setts, men in flat caps and suits, women in long coats and hats, enamel shop signs, sandbags and blackout paint if it is wartime';
  }
  if (year < 1980) {
    return 'sodium street lamps, post-war cars and red double-decker buses, tarmac with painted lines, men in suits and wide ties or duffel coats, women in mini-skirts or headscarves, plastic and neon shop signs, concrete and prefabricated buildings';
  }
  return 'modern street furniture, current cars and buses, current clothing and shop fronts';
}

/**
 * The shared "this is a real photograph" instruction block: the look of the period, and a hard ban on the
 * glossy computer-generated look.
 *
 * @param year - The era's year.
 * @param look - `colour` or `monochrome`.
 * @returns Two paragraphs of style instructions.
 */
function realismBlock(year: number, look: 'colour' | 'monochrome'): string {
  const lookLine =
    look === 'monochrome'
      ? `It is a genuine monochrome photograph taken in ${year} on a large-format plate camera: warm sepia albumen-print tones, soft fine detail, visible film grain, gentle vignetting at the corners, a few faint scratches. No colour at all.`
      : `It is a genuine archive photograph from ${year}, colourised the way museum restorers do it: muted, natural, slightly desaturated colours, soft contrast, the uneven tones and fine grain of a period plate. Documentary, not cinematic.`;
  const banLine =
    'It must read as a real photograph and never as a render: no gloss, no oversaturation, no HDR, no cinematic colour grading, no lens flare, no digital over-sharpness, no illustration, no painting, no fantasy or exaggerated architecture, no text, captions or watermarks, and nothing modern.';
  return `${lookLine}\n\n${banLine}`;
}

/**
 * The paragraph that tells the model how to use the real period photographs it is given.
 *
 * @param firstIndex - The 1-based position of the first reference in the image list ("image 2").
 * @param count - How many references there are.
 * @returns The instruction, or an empty string when there are none.
 */
function referenceBlock(firstIndex: number, count: number): string {
  if (count <= 0) return '';
  const range = count === 1 ? `image ${firstIndex}` : `images ${firstIndex} to ${firstIndex + count - 1}`;
  return `${range} ${count === 1 ? 'is a real photograph' : 'are real photographs'} of this place from the period. Copy their architecture, stone and brick colours, window and roof shapes, ironwork, lamp design, street surface and clothing exactly. Do not copy their composition or the people in them.`;
}

/**
 * Prompt for stage `scene`: edit the present-day reference photo into the given year.
 *
 * Intent: keep the exact camera position, lens and horizon, because the panorama, guide frame and
 * walk clips are all grown from this image and the then/now slider overlays it on the reference
 * photo (A2-02: Nano Banana Pro kept the framing, 2.1 drifted). The change list keeps the shape the
 * Historian writes, so each line is one visual instruction. The realism block and the period cues stop
 * the model drifting to a polished film-set look (phone test round 1: "very unrealistic"), and real
 * period photographs, when supplied as further images, give it the true look of a vanished building.
 *
 * Example output (abridged):
 *   "Edit this photograph so it shows the same place in the year 1893 ... It is a genuine archive photograph
 *    from 1893, colourised ... KEEP UNCHANGED:\n- the central tower ...\nREMOVE ...\n- modern buildings ..."
 *
 * @param brief - Scene brief from the Historian.
 * @param year - Target year, for example 1893.
 * @param style - Look and the number of real period photographs supplied after the main image.
 * @returns The prompt for an image-edit model that receives the reference photo (and the references).
 */
export function buildScenePrompt(brief: SceneChanges, year: number, style: PromptStyle = {}): string {
  const look = style.look ?? 'colour';
  return [
    `Edit this photograph so it shows the same place in the year ${year}, as a real photograph taken from exactly the same spot.`,
    'Keep the camera position, height, lens, perspective and horizon identical. Buildings that remain must stay in exactly the same place and size in the frame.',
    referenceBlock(2, style.referenceCount ?? 0),
    `What the camera sees in ${year}: ${brief.description}`,
    `KEEP UNCHANGED:\n${bullets(brief.changes.persists, 'the layout of the street')}`,
    `REMOVE, because they did not exist yet:\n${bullets(brief.changes.notYetBuilt, 'anything modern')}`,
    `CHANGE to how they looked in ${year}:\n${bullets(brief.changes.altered, 'surfaces and street furniture to period versions')}`,
    `ADD BACK, because they stood here then and are gone now:\n${bullets(brief.changes.gone, 'nothing')}`,
    `Period detail to include, at a natural density: ${periodCues(year)}.`,
    realismBlock(year, look),
  ]
    .filter(Boolean)
    .join('\n\n');
}

/**
 * Prompt for stage `panorama`: fill the grey canvas around the scene into a full 360 by 180 degree view.
 *
 * Intent (A2-03, route b2): the model only invents what is behind and beside the viewer. The centre
 * must stay the scene, so the viewer opens facing the landmark. "Seamless left and right edges" lets
 * the viewer wrap without a join. The not-yet-built list is repeated here because the first run drew
 * modern road markings on a period street. The realism block, period cues and real period photographs
 * (further images after the canvas) are the phone-test realism rework.
 *
 * Example output (abridged):
 *   "The photograph in the middle of this image is the forward view of a full 360 by 180 degree
 *    equirectangular panorama. Replace all of the flat grey ... Not yet built in 1893, so none of this appears: ..."
 *
 * @param surroundings - SceneBrief.surroundings: what is behind and beside the viewer in that year.
 * @param notYetBuilt - SceneBrief.changes.notYetBuilt: things that must not appear anywhere.
 * @param year - Target year.
 * @param style - Look and the number of real period photographs supplied after the canvas.
 * @returns The prompt for an image-edit model that receives the grey canvas with the scene in the middle.
 */
export function buildPanoramaPrompt(surroundings: string, notYetBuilt: string[], year: number, style: PromptStyle = {}): string {
  const look = style.look ?? 'colour';
  return [
    'The photograph in the middle of this image is the forward view of a full 360 by 180 degree equirectangular panorama.',
    `Replace all of the flat grey with the rest of the panorama, so the whole image is one continuous photograph of the same place in the year ${year}, seen from the same standing point.`,
    'Keep the photograph in the middle exactly as it is. Continue its buildings, street, pavement and sky outward with matching perspective, light and colour, and no visible borders.',
    referenceBlock(2, style.referenceCount ?? 0),
    `What surrounds the viewer: ${surroundings}`,
    `Period detail to include, at a natural density: ${periodCues(year)}.`,
    `Not yet built in ${year}, so none of this appears anywhere in the panorama:\n${bullets(notYetBuilt, 'anything modern')}`,
    'Use correct equirectangular projection: the horizon is a straight level line across the exact vertical middle, straight vertical lines stay vertical, sky fills the top and the ground fills the bottom.',
    'The left and right edges must join seamlessly, because they meet behind the viewer.',
    realismBlock(year, look),
    'No people looking at the camera, and no fisheye circle.',
  ]
    .filter(Boolean)
    .join('\n\n');
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

/**
 * Add the critic's advice to a prompt for the corrective retry.
 *
 * @param prompt - The prompt that produced a rejected picture.
 * @param fix - The critic's one-sentence fix, or null on the first attempt.
 * @returns The prompt unchanged on the first attempt, otherwise with the correction appended.
 */
export function withCorrection(prompt: string, fix: string | null): string {
  return fix ? `${prompt}

IMPORTANT, a previous attempt at this picture was rejected for a reason. Make sure of this: ${fix}` : prompt;
}

/**
 * Prompt for the panorama critic: is this a real 360 degree panorama of the right year, free of seams and
 * anachronisms? The answer is JSON that ./critic.ts parses.
 *
 * Intent: the panorama model fails in ways a pixel check cannot see. In live runs it returned a flat wide
 * photograph stretched to 2:1, three tiled panels, and a view with a hard vertical line where the pasted scene
 * ended. This asks a vision model to name which of those it is, plus the horizon, the wrap-around edges and
 * anything that did not exist in the year, and to give one sentence that would fix the worst problem so the
 * retry can use it.
 *
 * Example answer: {"projection":"equirectangular_360","horizon_level_and_central":true,"visible_seams":false,
 *   "edges_match":true,"anachronisms":[],"looks_computer_generated":false,"verdict":"pass","problems":[],"fix":""}
 *
 * @param year - The era's year, for the anachronism check.
 * @returns The prompt for a vision model that receives the panorama as its only image.
 */
export function buildPanoramaCheckPrompt(year: number): string {
  return [
    `You are a strict quality checker for generated panoramic images. The image is meant to be a full equirectangular 360 by 180 degree panorama of a street in London in the year ${year}, for a phone viewer where the user looks around inside a sphere.`,
    'Answer with one JSON object and nothing else (no markdown, no prose), with exactly these keys:',
    '"projection": one of "equirectangular_360", "flat_photo", "tiled" or "other". Judge it like this. "equirectangular_360": the picture shows the surroundings in MORE THAN ONE direction, for example the street running away both to the left and to the right, or buildings both ahead and behind the camera, with the ground sweeping round the camera and kerbs or road edges bending away towards the left and right edges. The bending is often only gentle in a street scene, and gentle bending still counts; the ground usually fills the lower half and the sky the upper half. "flat_photo": the picture shows ONE direction only, like an ordinary wide-angle photograph with a single vanishing point, straight kerbs and no sign of looking sideways or behind. "tiled": several separate panels or repeated copies side by side. "other": anything else.',
    '"horizon_level_and_central": true if the horizon is a straight level line near the vertical middle of the image.',
    '"visible_seams": true if there is a hard vertical line, a repeated panel or an obvious pasted rectangle anywhere.',
    '"edges_match": true if the far left edge and the far right edge look like one continuous place.',
    `"anachronisms": a list of things that did not exist in ${year} (cars, modern lamps, road markings, signs, glass buildings, modern clothes...). An empty list if none.`,
    '"looks_computer_generated": true if it looks like a glossy render, a painting or CGI instead of a real photograph.',
    '"verdict": "pass" or "fail". Fail if projection is not "equirectangular_360", or there are visible seams, or the edges do not match, or there is any anachronism.',
    '"problems": a list of short strings, empty if none.',
    '"fix": one sentence that could be added to the image generation prompt to fix the worst problem, or an empty string.',
  ].join('\n');
}

/**
 * Prompt for the scene critic: does the edited picture show the right year, with the right things removed?
 *
 * Intent: the scene is what every later stage grows from, so a modern object or a CGI look here spreads to the
 * panorama and the video. The checks are the ones that failed in testing: leftover modern things, a polished
 * film-set look, and the picture not being a photograph of that year at all.
 *
 * Example answer: {"anachronisms":["a modern street lamp"],"looks_computer_generated":false,
 *   "matches_brief":true,"verdict":"fail","problems":["a modern lamp post is still standing"],"fix":"..."}
 *
 * @param year - The era's year.
 * @param mustBeAbsent - SceneBrief.changes.notYetBuilt: things that must not appear.
 * @returns The prompt for a vision model that receives the edited scene as its only image.
 */
export function buildSceneCheckPrompt(year: number, mustBeAbsent: string[]): string {
  return [
    `You are a strict quality checker for generated historical photographs. The image is meant to be a real photograph of a street in London in the year ${year}.`,
    `These things did not exist yet and must not appear anywhere: ${mustBeAbsent.length ? mustBeAbsent.join('; ') : 'anything modern'}.`,
    'Answer with one JSON object and nothing else (no markdown, no prose), with exactly these keys:',
    `"anachronisms": a list of things in the picture that did not exist in ${year}. Empty if none.`,
    '"looks_computer_generated": true if it looks like a glossy render, a painting or CGI instead of a real photograph of the time.',
    '"verdict": "pass" or "fail". Fail if there is any anachronism or it looks computer generated.',
    '"problems": a list of short strings, empty if none.',
    '"fix": one sentence that could be added to the image generation prompt to fix the worst problem, or an empty string.',
  ].join('\n');
}

/**
 * Prompt for the guide frame critic. Image 1 is the guide frame, image 2 the portrait it should match.
 *
 * Intent: the talk video lip-syncs this one frame, so the face must be large, clear and the same person as the
 * portrait (A2-05: the first try put the guide far away with a 40 px face).
 *
 * Example answer: {"face_visible_and_large":true,"same_person_as_portrait":true,"scene_unchanged":true,
 *   "verdict":"pass","problems":[],"fix":""}
 *
 * @returns The prompt for a vision model that receives [guide frame, portrait].
 */
export function buildGuideFrameCheckPrompt(): string {
  return [
    'You are a strict quality checker for a generated video frame. Image 1 should show a person standing close to the camera in a street, framed from the waist up. Image 2 is a portrait of the person who should appear in image 1.',
    'Answer with one JSON object and nothing else (no markdown, no prose), with exactly these keys:',
    '"face_visible_and_large": true if the face is clearly visible, facing the camera, and fills a sixth of the image height or more.',
    '"same_person_as_portrait": true if the person in image 1 clearly has the same face, hair and clothing as image 2.',
    '"scene_unchanged": true if the street behind looks like a normal photograph with no distortion or duplication.',
    '"verdict": "pass" or "fail". Fail if any of the three is false.',
    '"problems": a list of short strings, empty if none.',
    '"fix": one sentence that could be added to the image generation prompt to fix the worst problem, or an empty string.',
  ].join('\n');
}
