/**
 * The pipeline's stage list, tiers and player-facing labels, plus the rule for what is missing.
 *
 * Owner: Agent 1 (Core). Implements MASTER.md section 5.1 (the stage graph) as data, so that
 * src/lib/jobs (which creates job documents), mock mode (which fakes them) and the Time Machine's
 * progress sheet all agree. The dependency graph itself lives in Agent 2's src/lib/pipeline.
 */
import type { Era, JobStage, StageKey } from './types';

/** Core-tier stages, in the order the progress sheet lists them. */
export const CORE_STAGES = ['brief', 'scene', 'panorama', 'headshot', 'narration'] as const satisfies readonly StageKey[];

/** Video-tier stages, in the order the progress sheet lists them. */
export const VIDEO_STAGES = ['guide_frame', 'walk_on', 'talk', 'walk_off', 'stitch'] as const satisfies readonly StageKey[];

/**
 * Player-facing label for a stage, shown in the progress sheet.
 *
 * @param key - The stage.
 * @param year - The era's year, woven into some labels.
 * @returns A short sentence, for example "Painting the street as it was in 1893".
 */
export function stageLabel(key: StageKey, year: number): string {
  switch (key) {
    case 'brief':
      return `Researching ${year} in the archives`;
    case 'scene':
      return `Painting the street as it was in ${year}`;
    case 'panorama':
      return 'Building the view all around you';
    case 'headshot':
      return 'Taking your guide’s portrait';
    case 'narration':
      return 'Recording your guide’s voice';
    case 'guide_frame':
      return 'Placing your guide in the scene';
    case 'walk_on':
      return 'Filming your guide walking up';
    case 'talk':
      return 'Filming your guide’s story';
    case 'walk_off':
      return 'Filming your guide walking away';
    case 'stitch':
      return 'Joining the clips together';
  }
}

/**
 * Create the pending stage list for a new job.
 *
 * @param year - The era's year, for the labels.
 * @param includeVideo - False lists the core tier only.
 * @returns Fresh stages, all `pending`, in display order.
 */
export function buildStages(year: number, includeVideo: boolean): JobStage[] {
  const keys: StageKey[] = includeVideo ? [...CORE_STAGES, ...VIDEO_STAGES] : [...CORE_STAGES];
  return keys.map((key) => ({
    key,
    label: stageLabel(key, year),
    state: 'pending',
    model: null,
    falRequestId: null,
    startedAt: null,
    finishedAt: null,
    error: null,
  }));
}

/**
 * Tell whether an era needs a generation job.
 *
 * The core tier is needed unless it is `ready`. The video tier is needed only when asked for and
 * not `ready`. A `failed` tier counts as needed, so asking again retries it.
 *
 * @param era - The era as stored.
 * @param includeVideo - Whether the caller wants the video tier too.
 * @returns True when POST /api/eras/[eraId]/generate should create a job.
 */
export function eraNeedsGeneration(era: Pick<Era, 'state' | 'videoState'>, includeVideo: boolean): boolean {
  return era.state !== 'ready' || (includeVideo && era.videoState !== 'ready');
}
