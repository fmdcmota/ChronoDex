/**
 * Two pure helpers the overnight scripts share: every media URL an era holds, and what generating an era should cost.
 *
 * Owner: Agent 2 (Studio). Implements MASTER.md section 5.3 rules 4 and 8 and task A2-13 (scripts/pregenerate.ts
 * and scripts/backup-media.ts). Pure functions, unit tested, so the scripts stay thin.
 */
import type { Era, Landmark } from '@/lib/contracts';
import { MODELS, PANORAMA_UPSCALE_FACTOR } from '@/lib/fal';

/** One downloadable asset of an era. */
export interface EraAsset {
  /** A short, filesystem-safe name that says what it is, for example "panorama" or "walk_on". */
  name: string;
  /** The URL. Only http(s) URLs are returned; fixtures' relative paths are skipped. */
  url: string;
}

/**
 * Every media file an era holds, in a stable order.
 *
 * Why: fal keeps generated files on its CDN for at least 7 days (MASTER.md 5.3 rule 8), so before the demo every
 * URL must be downloaded. This is the list.
 *
 * @param era - The era as stored.
 * @returns The scene, panorama, narration, headshot and any video clips, those that exist and are http(s).
 */
export function eraAssets(era: Era): EraAsset[] {
  const found: EraAsset[] = [];
  const add = (name: string, url: string | null | undefined): void => {
    if (url && /^https?:\/\//i.test(url)) found.push({ name, url });
  };
  add('scene', era.sceneImageUrl);
  add('panorama', era.panorama?.url);
  add('narration', era.narrationAudioUrl);
  add('headshot', era.guide?.headshotUrl);
  for (const segment of era.guideVideo?.segments ?? []) add(segment.kind, segment.url);
  add('stitched', era.guideVideo?.stitchedUrl);
  return found;
}

/**
 * The landmark-level assets worth backing up: the present-day reference photo, when it is a real URL.
 *
 * @param landmark - The landmark.
 * @returns At most one asset, named "reference".
 */
export function landmarkAssets(landmark: Landmark): EraAsset[] {
  return /^https?:\/\//i.test(landmark.referencePhotoUrl) ? [{ name: 'reference', url: landmark.referencePhotoUrl }] : [];
}

/** Dollars a typical era costs, by tier. */
export interface EraCostEstimate {
  /** The core tier: scene, panorama (with its check and upscale), headshot, narration. */
  coreUsd: number;
  /** The video tier on top: guide frame, three clips. 0 when not requested. */
  videoUsd: number;
  /** Core plus video. */
  totalUsd: number;
}

/** Dollars one critic call costs. Measured at about $0.0125 for Sonnet on a panorama (A2-12). */
const CHECK_USD = 0.0125;
/** Dollars for the talk clip: Kling avatar is $0.0562 per second and a 45 s guide script is about that long. */
const TALK_USD = 0.0562 * 45;
/** Dollars for the brief: the Historian (DeepSeek) costs cents. A generous allowance. */
const BRIEF_USD = 0.05;

/**
 * Estimate what generating one era costs, from the model registry's typical prices.
 *
 * Why: the overnight run spends real money, so the script prints this before it starts and `--dry-run` prints it
 * and stops. It is an estimate (a retry after a failed check adds about $0.15 to a picture), not a measurement.
 *
 * @param includeVideo - Whether the video tier is included.
 * @param options - Tuning.
 * @param options.retryAllowance - Expected extra generations per checked picture, 0 to 1. Default 0.4: in live runs
 *   about two in five panoramas needed the corrective retry.
 * @returns The estimate in dollars, rounded to cents.
 */
export function estimateEraCostUsd(includeVideo: boolean, options: { retryAllowance?: number } = {}): EraCostEstimate {
  const retry = options.retryAllowance ?? 0.4;
  const checked = (stage: 'scene' | 'panorama' | 'guide_frame'): number => (MODELS[stage].typicalCostUsd ?? 0) * (1 + retry) + CHECK_USD * (1 + retry);
  const upscale = PANORAMA_UPSCALE_FACTOR > 1 ? (MODELS.panorama_upscale.typicalCostUsd ?? 0) : 0;
  const core =
    BRIEF_USD +
    checked('scene') +
    checked('panorama') +
    upscale +
    // The headshot is token priced with no list figure: about four cents at 1K (A2-02).
    (MODELS.headshot.typicalCostUsd ?? 0.04) +
    (MODELS.narration.typicalCostUsd ?? 0.05);
  const video = includeVideo ? checked('guide_frame') + (MODELS.walk_on.typicalCostUsd ?? 0) + (MODELS.walk_off.typicalCostUsd ?? 0) + TALK_USD : 0;
  const round = (n: number): number => Math.round(n * 100) / 100;
  return { coreUsd: round(core), videoUsd: round(video), totalUsd: round(core + video) };
}
