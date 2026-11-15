/**
 * Period music and street ambience: which loop belongs to which year, and the prompts that make them.
 *
 * Owner: Agent 2 (Studio). Human-assigned after phone test round 1 ("period music and ambience playing in the
 * chat"). scripts/ambience.ts generates the files; Agent 4 plays them.
 *
 * Two layers per period bucket, so the player can mix them: a quiet instrumental music loop, and a street-sound
 * loop. Both are original and instrumental by construction: the prompts name no real song, artist or band, and ask
 * for no vocals. The music model is chosen for being licensed as commercial-use-safe.
 */

/** The four period buckets the human asked for, as the folder and file stem used under public/audio/ambience/. */
export const AMBIENCE_BUCKETS = ['1850-1899', '1900-1945', '1946-1979', '1980-now'] as const;

/** One bucket's name. */
export type AmbienceBucket = (typeof AMBIENCE_BUCKETS)[number];

/**
 * The bucket an era's year falls into.
 *
 * @param year - The era's year.
 * @returns The bucket. Years before 1850 use the earliest bucket.
 */
export function ambienceBucketFor(year: number): AmbienceBucket {
  if (year < 1900) return '1850-1899';
  if (year < 1946) return '1900-1945';
  if (year < 1980) return '1946-1979';
  return '1980-now';
}

/** Length of each music loop in seconds. Sonilo bills per second, so 45 s is about $0.11. */
export const MUSIC_LOOP_SECONDS = 45;
/** Length of each street-sound loop in seconds. The sound-effects model allows 0.5 to 30. */
export const STREET_LOOP_SECONDS = 30;

/** The words every music prompt ends with: the safety rails the human asked for. */
const MUSIC_RAILS =
  'Instrumental only, no vocals and no lyrics. An original composition, not based on any existing song, tune or artist. Quiet, soft and distant, like background music heard from down the street. Steady and easy to loop, with no big ending.';

/** What the music in each bucket is, in plain musical terms. No real songs, bands or artists are named. */
const MUSIC_STYLE: Record<AmbienceBucket, string> = {
  '1850-1899': 'A Victorian street scene in the 1890s: a solo upright music-hall piano playing a gentle, cheerful waltz, with a faint brass band marching far away.',
  '1900-1945': 'A 1940s dance band heard through an old wireless radio in a nearby window: warm, slightly muffled swing with clarinet, muted brass and brushed drums.',
  '1946-1979': 'A 1960s street: a light instrumental pop-beat with jangly electric guitar, bass and soft drums, as if from a transistor radio down the road.',
  '1980-now': 'A present-day city street outside a cafe: a gentle instrumental with a soft synthesiser pad, a light electronic beat and a little warm piano.',
};

/** What the street sounds like in each bucket. No music and no clear speech, so it layers under the music. */
const STREET_STYLE: Record<AmbienceBucket, string> = {
  '1850-1899': 'Victorian London street ambience: horse hooves and iron-rimmed carriage wheels on granite setts, a distant murmur of a crowd, an occasional cab driver calling out, a few sparrows.',
  '1900-1945': 'London street ambience of the 1930s and 1940s: a few early motor cars and the odd horse cart, bicycle bells, footsteps on paving, a distant crowd murmur, pigeons.',
  '1946-1979': 'London street ambience of the 1950s to 1970s: passing post-war cars and buses, footsteps on pavement, a distant crowd murmur, a bicycle bell, pigeons.',
  '1980-now': 'Present-day London street ambience: steady traffic and a bus pulling away, footsteps, a distant crowd murmur and chatter, a bird or two.',
};

/**
 * Prompt for a period music loop.
 *
 * Intent: instrumental, quiet and loop-friendly, so it can sit under a chat without taking over. The closing safety
 * sentence is part of every prompt and is covered by a test, because the human's rule is "original, instrumental,
 * nothing that imitates a real song".
 *
 * Example output (abridged): "A Victorian street scene in the 1890s: a solo upright music-hall piano ...
 * Instrumental only, no vocals and no lyrics. An original composition ..."
 *
 * @param bucket - The period bucket.
 * @returns The prompt for the music model.
 */
export function buildMusicPrompt(bucket: AmbienceBucket): string {
  return `${MUSIC_STYLE[bucket]} ${MUSIC_RAILS}`;
}

/**
 * Prompt for a street-sound loop. No music and no clear speech, so it layers under the music loop.
 *
 * Example output (abridged): "Victorian London street ambience: horse hooves and iron-rimmed carriage wheels ...
 * No music. No clear speech. Quiet and even, with nothing sudden, so it loops without a bump."
 *
 * @param bucket - The period bucket.
 * @returns The prompt for the sound-effects model.
 */
export function buildStreetPrompt(bucket: AmbienceBucket): string {
  return `${STREET_STYLE[bucket]} No music. No clear speech. Quiet and even, with nothing sudden, so it loops without a bump.`;
}
