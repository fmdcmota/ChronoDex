/**
 * Era fixtures: one fully populated hero era with placeholder media, every other era `missing`.
 *
 * Owner: Agent 1 (Core). Task A1-04.
 *
 * The hero era's text is PLACEHOLDER copy written for UI work. It has not been through the
 * Historian or a human accuracy check (H7), so never show it to judges as researched content.
 */
import { eraIdOf, type Era, type EraBrief, type Landmark } from '@/lib/contracts';
import { landmarks } from './landmarks';
import {
  MOCK_AUDIO_URL,
  MOCK_HEADSHOT_URL,
  MOCK_PANORAMA,
  MOCK_SCENE_URL,
  MOCK_VIDEO_DURATION_S,
  MOCK_VIDEO_URL,
} from './media';

/** Timestamp all fixtures share, so tests are deterministic. */
export const FIXTURE_TIMESTAMP = '2026-11-14T15:00:00.000Z';

/** Id of the one fully populated era. */
export const HERO_ERA_ID = eraIdOf('queens-tower', 1893);

/** The hero era's text as the Historian would return it. Used by the writeEraBrief stub. */
export const heroBrief: EraBrief = {
  title: 'The Imperial Institute opens',
  summary:
    'In May 1893 Queen Victoria opened the Imperial Institute, built to mark her Golden Jubilee of 1887 and designed by Thomas Edward Collcutt. Its central tower rose about 87 metres over South Kensington. (Placeholder fixture text, not yet checked.)',
  funFacts: [
    'The Institute was conceived as a monument to Queen Victoria’s Golden Jubilee in 1887.',
    'The architect was Thomas Edward Collcutt.',
    'Most of the Institute was demolished between 1957 and 1967. Only the tower was kept.',
  ],
  sources: [
    { title: 'Queen’s Tower, Wikipedia', url: 'https://en.wikipedia.org/wiki/Queen%27s_Tower' },
    { title: 'Imperial Institute, Wikipedia', url: 'https://en.wikipedia.org/wiki/Imperial_Institute' },
  ],
  sceneBrief: {
    description:
      'A long brick and stone palace front with a tall central tower, a broad gravel forecourt, gas lamps and horse-drawn cabs at the kerb.',
    changes: {
      persists: ['The central tower'],
      altered: ['The ground in front is a gravel forecourt, not a lawn'],
      notYetBuilt: ['The modern college buildings on either side of the tower'],
      gone: ['Nothing that stands today is missing except later additions'],
    },
    surroundings:
      'The Institute’s long wings run left and right of the tower. Behind the viewer, open ground and the backs of terraced houses.',
    referenceImageUrls: [],
  },
  guide: {
    name: 'Albert Finch',
    role: 'Porter at the Imperial Institute',
    bio: 'I have carried crates and opened doors here since the first stone was laid. I know every corridor and every visitor’s favourite gallery.',
    appearance:
      'A man of about fifty, stocky, grey side whiskers, dark blue porter’s uniform with brass buttons and a peaked cap.',
    voiceKey: 'eleven-daniel',
    script:
      'Good day to you! My name is Albert Finch, and I am a porter here at the Imperial Institute. You have arrived in 1893, the very year Her Majesty Queen Victoria opened these halls, built to celebrate her Golden Jubilee. Look up at the great tower, nearly three hundred feet of stone and brick, designed by Mr Collcutt. Gentlemen raise their hats to the ladies on these steps, and nobody would dream of stepping out without one. Visitors come to see wonders from every corner of the world, from timber to tea. When the bells ring out, we know the Queen has something to celebrate. Now, do mind the carriages as you go!',
    greeting: 'Good day! Albert Finch, porter of the Imperial Institute, at your service. What would you like to know?',
  },
};

/**
 * A clearly fake brief for any landmark and year, used by mock jobs and the writeEraBrief stub.
 *
 * @param landmark - The landmark the brief is about.
 * @param year - The year.
 * @returns The hero brief for the hero era, otherwise a generic placeholder naming the landmark and year.
 */
export function placeholderBrief(landmark: Pick<Landmark, 'id' | 'name'>, year: number): EraBrief {
  if (eraIdOf(landmark.id, year) === HERO_ERA_ID) return structuredClone(heroBrief);
  return {
    ...structuredClone(heroBrief),
    title: `${landmark.name} in ${year}`,
    summary: `Placeholder summary for ${landmark.name} in ${year}. The Historian has not written this era yet.`,
    funFacts: [`Placeholder fact about ${landmark.name} in ${year}.`],
    guide: {
      ...structuredClone(heroBrief.guide),
      name: 'Edith Marsh',
      role: `Placeholder guide at ${landmark.name}`,
      voiceKey: 'eleven-charlotte',
      greeting: `Hello! I’m Edith, your placeholder guide to ${landmark.name} in ${year}. Ask me anything.`,
    },
  };
}

/**
 * Create an era with nothing generated yet.
 *
 * @param landmark - The landmark.
 * @param year - One of the landmark's eraYears.
 * @returns An era with state and videoState `missing` and every text and media field empty.
 */
export function missingEra(landmark: Pick<Landmark, 'id'>, year: number): Era {
  return {
    id: eraIdOf(landmark.id, year),
    landmarkId: landmark.id,
    year,
    state: 'missing',
    videoState: 'missing',
    title: null,
    summary: null,
    funFacts: [],
    sources: [],
    sceneBrief: null,
    guide: null,
    sceneImageUrl: null,
    panorama: null,
    narrationAudioUrl: null,
    guideVideo: null,
    updatedAt: FIXTURE_TIMESTAMP,
  };
}

/**
 * Fill an era with a brief and the placeholder media, as if the whole pipeline had run.
 *
 * Used for the hero fixture and by mock mode when a fake job finishes.
 *
 * @param era - The era to fill. Not modified.
 * @param brief - The text to use.
 * @param includeVideo - Whether to fill the video tier too.
 * @returns A new era with state `ready`, and videoState `ready` when includeVideo is true.
 */
export function populatedEra(era: Era, brief: EraBrief, includeVideo: boolean): Era {
  return {
    ...era,
    state: 'ready',
    videoState: includeVideo ? 'ready' : era.videoState,
    title: brief.title,
    summary: brief.summary,
    funFacts: [...brief.funFacts],
    sources: brief.sources.map((s) => ({ ...s })),
    sceneBrief: structuredClone(brief.sceneBrief),
    guide: { ...brief.guide, headshotUrl: MOCK_HEADSHOT_URL },
    sceneImageUrl: MOCK_SCENE_URL,
    panorama: { ...MOCK_PANORAMA },
    narrationAudioUrl: MOCK_AUDIO_URL,
    guideVideo: includeVideo
      ? {
          segments: [
            { kind: 'walk_on', url: MOCK_VIDEO_URL, durationS: MOCK_VIDEO_DURATION_S },
            { kind: 'talk', url: MOCK_VIDEO_URL, durationS: MOCK_VIDEO_DURATION_S },
            { kind: 'walk_off', url: MOCK_VIDEO_URL, durationS: MOCK_VIDEO_DURATION_S },
          ],
          stitchedUrl: null,
        }
      : era.guideVideo,
  };
}

/** One era per landmark per year. The hero era is fully populated, the rest are `missing`. */
export const eras: Era[] = landmarks.flatMap((landmark) =>
  landmark.eraYears.map((year) => {
    const era = missingEra(landmark, year);
    return era.id === HERO_ERA_ID ? populatedEra(era, heroBrief, true) : era;
  }),
);
