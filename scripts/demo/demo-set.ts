/**
 * The demo set: which eras are shown on stage, and where their kept files live.
 *
 * Owner: Agent 6 (demo assets). Used by scripts/demo/generate-demo.ts and scripts/demo/load-demo.ts.
 * Six landmarks: three in London, one each in Mexico City, Porto and Singapore (the human's choice of cities,
 * 15 Nov 2026). Every year of each landmark is included, so no year tab on stage can start a generation.
 */
import path from 'node:path';
import type { Era, EraId } from '@/lib/contracts';

/** Every demo era, by city. */
export const DEMO_ERA_IDS: readonly EraId[] = [
  // London
  'queens-tower_1893',
  'queens-tower_1962',
  'royal-albert-hall_1871',
  'natural-history-museum_1862',
  'natural-history-museum_1881',
  // Mexico City
  'zocalo-cathedral_1519',
  // Porto
  'dom-luis-bridge_1886',
  // Singapore
  'raffles-landing-site_1819',
  // East Berlin
  'brandenburg-gate-east_1987',
  // Lisbon
  'praca-do-comercio_1754',
  'praca-do-comercio_1775',
];

/** The core-tier files kept for each era. */
export type DemoAsset = 'scene' | 'panorama' | 'headshot' | 'narration';

/** File extension per asset: the image stages ask fal for JPEG, the TTS returns MP3. */
const EXTENSION: Record<DemoAsset, string> = { scene: 'jpg', panorama: 'jpg', headshot: 'jpg', narration: 'mp3' };

/**
 * Site URL of a kept file. Next serves `public/` at the root, so the app needs no media store for these.
 *
 * @param eraId - The era.
 * @param asset - Which file.
 * @returns For example `/demo/queens-tower_1893/panorama.jpg`.
 */
export function demoAssetUrl(eraId: EraId, asset: DemoAsset): string {
  return `/demo/${eraId}/${asset}.${EXTENSION[asset]}`;
}

/**
 * Absolute path of a kept file under `public/demo/`.
 *
 * @param eraId - The era.
 * @param asset - Which file.
 * @returns The path on disk.
 */
export function demoAssetPath(eraId: EraId, asset: DemoAsset): string {
  return path.join(process.cwd(), 'public', demoAssetUrl(eraId, asset));
}

/**
 * Absolute path of an era's finished Era file.
 *
 * @param eraId - The era.
 * @returns `data/demo/eras/<eraId>.json`.
 */
export function demoEraFile(eraId: EraId): string {
  return path.join(process.cwd(), 'data', 'demo', 'eras', `${eraId}.json`);
}

/** How one kept file was made, for the notebook and the judges' "made with fal" story. */
export interface DemoProvenance {
  /** fal endpoint that made it, or where it was copied from. */
  model: string;
  /** The fal CDN URL it was downloaded from (expires after about a week; the kept file does not). */
  falUrl: string | null;
  /** Wall-clock seconds the stage took. */
  seconds: number;
  /** Panorama only: picture size. */
  widthPx?: number;
  /** Panorama only: picture size. */
  heightPx?: number;
  /** Checked stages: what the critic said, as the pipeline reports it. */
  check?: unknown;
}

/** What `data/demo/eras/<eraId>.json` holds. */
export interface DemoEraFile {
  /** The finished Era, ready for the database, with `/demo/...` URLs. */
  era: Era;
  /** How each file was made. */
  provenance: Record<string, DemoProvenance>;
}
