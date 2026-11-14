/**
 * What runEraJob depends on, as one swappable object: the Historian and the eight stage functions.
 *
 * Owner: Agent 2 (Studio). Implements MASTER.md section 5.1, task A2-09. Two sets exist: the real one
 * (the Historian and fal, which spend money) and a dry-run set that returns fixture media and spends
 * nothing, used by tests and by `NEXT_PUBLIC_USE_MOCKS=1`. runEraJob takes the set as an argument so
 * its tests can also inject fakes that fail on purpose.
 */
import { writeEraBrief } from '@/lib/historian';
import type { EraBrief, Landmark } from '@/lib/contracts';
import {
  MOCK_AUDIO_URL,
  MOCK_HEADSHOT_URL,
  MOCK_REFERENCE_URL,
  MOCK_SCENE_URL,
  MOCK_VIDEO_DURATION_S,
  MOCK_VIDEO_URL,
  placeholderBrief,
} from '@fixtures/index';
import {
  PANORAMA_VFOV_DEG,
  runGuideFrame,
  runHeadshot,
  runNarration,
  runPanorama,
  runScene,
  runTalk,
  runWalkOff,
  runWalkOn,
} from './stages';
import type { PanoramaOutput, StageOutput } from './stages';

/** The Historian and every stage function. Each is replaceable in tests. */
export interface PipelineDeps {
  /** Writes the text half of an era. Real: the Historian in src/lib/historian. */
  writeBrief(landmark: Landmark, year: number): Promise<EraBrief>;
  /** The stage functions, with the same signatures as in ./stages. */
  stages: {
    scene: typeof runScene;
    panorama: typeof runPanorama;
    headshot: typeof runHeadshot;
    narration: typeof runNarration;
    guideFrame: typeof runGuideFrame;
    walkOn: typeof runWalkOn;
    walkOff: typeof runWalkOff;
    talk: typeof runTalk;
  };
}

/**
 * The real brief writer: the Historian (DeepSeek, per Agent 1). See src/lib/historian for its time and cost.
 *
 * @param landmark - The landmark.
 * @param year - The era's year.
 * @returns The brief, as validated by the Historian.
 */
function realWriteBrief(landmark: Landmark, year: number): Promise<EraBrief> {
  return writeEraBrief(landmark, year);
}

/** The real dependencies: the Historian for the brief and fal for every stage. Spends money. */
export const realDeps: PipelineDeps = {
  writeBrief: realWriteBrief,
  stages: {
    scene: runScene,
    panorama: runPanorama,
    headshot: runHeadshot,
    narration: runNarration,
    guideFrame: runGuideFrame,
    walkOn: runWalkOn,
    walkOff: runWalkOff,
    talk: runTalk,
  },
};

/** Build a fake stage output: a fixture URL, model "dry-run" and no request id. */
function fake(url: string, durationS: number | null = null): StageOutput {
  return { url, model: 'dry-run', requestId: null, elapsedMs: 0, durationS };
}

/** Dry-run panorama output: the fixture size, so the Era gets a valid Panorama. */
function fakePanorama(): PanoramaOutput {
  return { ...fake(MOCK_SCENE_URL), widthPx: 2880, heightPx: 1440, attempts: 1, unpaintedFraction: 0 };
}

/**
 * Make a stage function that returns one fixture URL immediately, for the dry run.
 *
 * @param url - The fixture URL to return.
 * @param durationS - Clip length to report for video stages.
 * @returns A function with the shape of a stage.
 */
function dryStage(url: string, durationS: number | null = null): () => Promise<StageOutput> {
  return async () => fake(url, durationS);
}

/**
 * The dry-run brief writer: the placeholder text from the fixtures, which says "Placeholder" on purpose.
 *
 * @param landmark - The landmark.
 * @param year - The era's year.
 * @returns A placeholder brief.
 */
async function dryWriteBrief(landmark: Landmark, year: number): Promise<EraBrief> {
  return placeholderBrief(landmark, year);
}

/**
 * Dry-run panorama stage: the fixture size, so the Era gets a valid Panorama.
 *
 * @returns A panorama output with the fixture scene as its image.
 */
async function dryPanorama(): Promise<PanoramaOutput> {
  return fakePanorama();
}

/**
 * Dependencies that return fixtures and spend nothing: placeholder brief text, placeholder pictures,
 * a sample clip. The worker uses them when NEXT_PUBLIC_USE_MOCKS=1 so the queue, the progress sheet
 * and the screens can be exercised with no keys. Never use them for a real era: the text says
 * "Placeholder" on purpose.
 */
export const dryRunDeps: PipelineDeps = {
  writeBrief: dryWriteBrief,
  stages: {
    scene: dryStage(MOCK_SCENE_URL),
    panorama: dryPanorama,
    headshot: dryStage(MOCK_HEADSHOT_URL),
    narration: dryStage(MOCK_AUDIO_URL),
    guideFrame: dryStage(MOCK_REFERENCE_URL),
    walkOn: dryStage(MOCK_VIDEO_URL, MOCK_VIDEO_DURATION_S),
    walkOff: dryStage(MOCK_VIDEO_URL, MOCK_VIDEO_DURATION_S),
    talk: dryStage(MOCK_VIDEO_URL, MOCK_VIDEO_DURATION_S),
  },
};

/**
 * Pick the dependencies for this process: the dry run when mocks are on, otherwise the real ones.
 *
 * @returns dryRunDeps when NEXT_PUBLIC_USE_MOCKS is "1", else realDeps.
 */
export function defaultDeps(): PipelineDeps {
  return process.env.NEXT_PUBLIC_USE_MOCKS === '1' ? dryRunDeps : realDeps;
}

export { PANORAMA_VFOV_DEG };
