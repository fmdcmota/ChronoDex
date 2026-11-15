/**
 * `scripts/demo/generate-demo.ts`: make every core asset of the demo eras once and keep the files in the repo.
 *
 * Owner: Agent 6 (demo assets). Implements the M4 gate for the demo set (MASTER.md sections 9 and 12): the eras
 * shown on stage must load with no generation, no fal CDN and no media store.
 *
 * Usage (repo root; FAL_KEY in .env.local; MONGODB_URI only for --reuse-db):
 *   npx tsx --env-file=.env.local scripts/demo/generate-demo.ts --dry-run      what would be made, spends nothing
 *   npx tsx --env-file=.env.local scripts/demo/generate-demo.ts                every demo era
 *   add --only <eraId> (repeatable), --redo <asset> (scene, panorama, headshot, narration; repeatable),
 *   --reuse-db to copy media an era in MONGODB_DB already has (same guide name) instead of paying again,
 *   --concurrency 3
 *
 * Per era it reads the reviewed brief (`briefs/<eraId>.json`, from `npm run brief`), the landmark (fixtures plus
 * `data/landmarks/<id>.json`) and its 1600x900 reference photo, then runs the pipeline's own stage functions
 * (src/lib/pipeline/stages): scene, then panorama from the scene; headshot and narration alongside. Each output is
 * downloaded at once to `public/demo/<eraId>/<asset>.<ext>`, and the finished Era (state `ready`, video `missing`,
 * URLs `/demo/<eraId>/...`) is written to `data/demo/eras/<eraId>.json` with a provenance block (model, fal URL,
 * seconds). `scripts/demo/load-demo.ts` puts those Eras into the database.
 *
 * Never pays twice: an asset whose file already exists is skipped unless named with --redo.
 * Cost and time: about $0.50 and 2 to 4 minutes an era (scene and panorama about $0.15 each with the critic,
 * headshot about $0.10, narration about $0.06). The guide video tier is not made here.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { applyLandmarkOverride, readLandmarkOverrides } from '@/lib/archive';
import { bearingDeg, EraBriefSchema, EraSchema, parseEraId, type Era, type EraBrief, type EraId, type Landmark } from '@/lib/contracts';
import { uploadToFal } from '@/lib/fal';
import { periodLook } from '@/lib/pipeline';
import { PANORAMA_VFOV_DEG, runHeadshot, runNarration, runPanorama, runScene } from '@/lib/pipeline/stages';
import { landmarks as fixtureLandmarks } from '@fixtures/index';
import { demoPeriodCues, demoSceneBrief } from './framing';
import { stampDemoUrls } from './stamp-urls';
import { DEMO_ERA_IDS, demoAssetPath, demoAssetUrl, demoEraFile, type DemoAsset, type DemoEraFile, type DemoProvenance } from './demo-set';

/** Jobs at once by default. Each mostly waits on fal. */
const DEFAULT_CONCURRENCY = 3;

/** Values of a repeatable flag. */
function flagValues(args: string[], flag: string): string[] {
  return args.flatMap((a, i) => (a === flag && args[i + 1] ? [args[i + 1]] : []));
}

/**
 * The landmark as the seed would write it: the fixture with the Archivist's file applied.
 *
 * @param id - Landmark id.
 * @returns The landmark and the absolute path of its reference photo.
 * @throws Error when the landmark or its photo is missing: the scene needs a real photo, never the mock SVG.
 */
function demoLandmark(id: string): { landmark: Landmark; photoPath: string } {
  const fixture = fixtureLandmarks.find((l) => l.id === id);
  if (!fixture) throw new Error(`No landmark "${id}" in fixtures/landmarks.ts`);
  const override = readLandmarkOverrides().get(id);
  if (!override?.referencePhotoPath) throw new Error(`No reference photo for "${id}": add data/landmarks/${id}.json and data/reference/${id}.jpg`);
  return { landmark: applyLandmarkOverride(fixture, override, `/reference/${id}.jpg`), photoPath: override.referencePhotoPath };
}

/**
 * The reviewed brief for an era.
 *
 * @param eraId - The era.
 * @returns The validated brief.
 * @throws Error when `briefs/<eraId>.json` is missing or invalid. Run `npm run brief -- <eraId>` first.
 */
function readBrief(eraId: EraId): EraBrief {
  const file = path.join(process.cwd(), 'briefs', `${eraId}.json`);
  if (!existsSync(file)) throw new Error(`No brief for ${eraId}. Run: npm run brief -- ${eraId}`);
  return EraBriefSchema.parse(JSON.parse(readFileSync(file, 'utf8')));
}

/**
 * Download a URL to a file.
 *
 * @param url - fal CDN URL (or any http URL).
 * @param file - Absolute destination path; folders are created.
 * @returns Bytes written.
 * @throws Error on an HTTP error.
 */
async function download(url: string, file: string): Promise<number> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`GET ${url}: HTTP ${response.status}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, bytes);
  return bytes.length;
}

/**
 * Copy one asset an era in the database already has, read from the media store (GridFS or folder).
 * Only used with --reuse-db, so a finished era is not paid for twice.
 *
 * @param url - The Era's `/api/media/<id>` URL, or an http URL.
 * @param file - Destination path.
 * @returns True when copied.
 */
async function copyFromStore(url: string | null | undefined, file: string): Promise<boolean> {
  if (!url) return false;
  if (/^https?:/.test(url)) return download(url, file).then(() => true, () => false);
  const id = url.match(/^\/api\/media\/([0-9a-f]{32})$/)?.[1];
  if (!id) return false;
  const { openMedia } = await import('@/lib/media');
  const chunks: Uint8Array[] = [];
  const reader = (await openMedia(id)).getReader();
  for (let r = await reader.read(); !r.done; r = await reader.read()) chunks.push(r.value);
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, Buffer.concat(chunks));
  return true;
}

/**
 * Make (or keep) every core asset of one era and write its Era file.
 *
 * @param eraId - The era.
 * @param options - Flags from the command line.
 * @param options.redo - Assets to make again even if their file exists.
 * @param options.reuseDb - Copy media from the database's Era when its guide is the same person.
 * @param options.dryRun - Only print what would happen.
 * @returns The Era written, or null on a dry run.
 */
async function makeEra(eraId: EraId, options: { redo: Set<string>; reuseDb: boolean; dryRun: boolean }): Promise<Era | null> {
  const { landmarkId, year } = parseEraId(eraId);
  const { landmark, photoPath } = demoLandmark(landmarkId);
  const brief = readBrief(eraId);
  const previous: DemoEraFile | null = existsSync(demoEraFile(eraId)) ? JSON.parse(readFileSync(demoEraFile(eraId), 'utf8')) : null;
  const provenance: Record<string, DemoProvenance> = { ...(previous?.provenance ?? {}) };
  const need = (asset: DemoAsset) => options.redo.has(asset) || !existsSync(demoAssetPath(eraId, asset));
  const log = (msg: string) => console.log(`${eraId}: ${msg}`);
  const todo = (['scene', 'panorama', 'headshot', 'narration'] as const).filter(need);
  log(todo.length ? `to make: ${todo.join(', ')}` : 'all files present');
  if (options.dryRun) return null;
  // The reference photo's own viewpoint, so the scene and the photo show the same place (see ./framing.ts).
  brief.sceneBrief = demoSceneBrief(eraId, brief.sceneBrief);

  if (options.reuseDb && todo.length) {
    const { getEra } = await import('@/lib/db');
    const dbEra = await getEra(eraId);
    if (dbEra?.guide?.name === brief.guide.name) {
      const sources: Record<DemoAsset, string | null | undefined> = {
        scene: dbEra.sceneImageUrl,
        panorama: dbEra.panorama?.url,
        headshot: dbEra.guide.headshotUrl,
        narration: dbEra.narrationAudioUrl,
      };
      for (const asset of todo) {
        if (await copyFromStore(sources[asset], demoAssetPath(eraId, asset))) {
          provenance[asset] = { model: 'copied from the database era', falUrl: sources[asset] ?? null, seconds: 0, ...(asset === 'panorama' && dbEra.panorama ? { widthPx: dbEra.panorama.widthPx, heightPx: dbEra.panorama.heightPx } : {}) };
          log(`${asset} copied from ${process.env.MONGODB_DB} (${sources[asset]})`);
        }
      }
    }
  }

  const ctx = {};
  // Scene first (the panorama grows from it); headshot and narration need only the brief.
  const scenePart = (async () => {
    if (need('scene')) {
      const referenceUrl = await uploadToFal(new Blob([new Uint8Array(readFileSync(photoPath))], { type: 'image/jpeg' }));
      const out = await runScene({ referencePhotoUrl: referenceUrl, brief: brief.sceneBrief, year, look: periodLook(), periodCues: demoPeriodCues(eraId) }, ctx);
      await download(out.url, demoAssetPath(eraId, 'scene'));
      provenance.scene = { model: out.model, falUrl: out.url, seconds: Math.round(out.elapsedMs / 1000), check: out.check ?? null };
      log(`scene done in ${Math.round(out.elapsedMs / 1000)} s (${out.model})`);
    }
    if (need('panorama')) {
      // Upload our saved scene (free): it works for a copied scene and after the fal URL has expired.
      const sceneFalUrl = await uploadToFal(new Blob([new Uint8Array(readFileSync(demoAssetPath(eraId, 'scene')))], { type: 'image/jpeg' }));
      const out = await runPanorama({ sceneUrl: sceneFalUrl, brief: brief.sceneBrief, year, look: periodLook(), periodCues: demoPeriodCues(eraId) }, ctx);
      await download(out.url, demoAssetPath(eraId, 'panorama'));
      provenance.panorama = { model: out.model, falUrl: out.url, seconds: Math.round(out.elapsedMs / 1000), widthPx: out.widthPx, heightPx: out.heightPx, check: out.check ?? null };
      log(`panorama done in ${Math.round(out.elapsedMs / 1000)} s, ${out.widthPx}x${out.heightPx}`);
    }
  })();
  const headshotPart = (async () => {
    if (!need('headshot')) return;
    const out = await runHeadshot({ guide: brief.guide, year }, ctx);
    await download(out.url, demoAssetPath(eraId, 'headshot'));
    provenance.headshot = { model: out.model, falUrl: out.url, seconds: Math.round(out.elapsedMs / 1000) };
    log(`headshot done in ${Math.round(out.elapsedMs / 1000)} s`);
  })();
  const narrationPart = (async () => {
    if (!need('narration')) return;
    const out = await runNarration({ guide: brief.guide }, ctx);
    await download(out.url, demoAssetPath(eraId, 'narration'));
    provenance.narration = { model: out.model, falUrl: out.url, seconds: Math.round(out.elapsedMs / 1000) };
    log(`narration done in ${Math.round(out.elapsedMs / 1000)} s`);
  })();
  const results = await Promise.allSettled([scenePart, headshotPart, narrationPart]);
  const failures = results.flatMap((r) => (r.status === 'rejected' ? [String(r.reason instanceof Error ? r.reason.message : r.reason)] : []));
  // Keep what landed even when a part failed, so the rerun only repeats the failed part.
  const pano = provenance.panorama;
  const era: Era = EraSchema.parse({
    id: eraId,
    landmarkId,
    year,
    state: failures.length ? 'failed' : 'ready',
    // A guide video made by generate-video.ts is kept when the core tier is remade.
    videoState: previous?.era.videoState === 'ready' ? 'ready' : 'missing',
    title: brief.title,
    summary: brief.summary,
    funFacts: brief.funFacts,
    sources: brief.sources,
    sceneBrief: brief.sceneBrief,
    guide: { ...brief.guide, headshotUrl: existsSync(demoAssetPath(eraId, 'headshot')) ? demoAssetUrl(eraId, 'headshot') : null },
    sceneImageUrl: existsSync(demoAssetPath(eraId, 'scene')) ? demoAssetUrl(eraId, 'scene') : null,
    panorama:
      existsSync(demoAssetPath(eraId, 'panorama')) && pano?.widthPx && pano.heightPx
        ? { url: demoAssetUrl(eraId, 'panorama'), widthPx: pano.widthPx, heightPx: pano.heightPx, vFovDeg: PANORAMA_VFOV_DEG, centreBearingDeg: bearingDeg(landmark.photoSpot, landmark.subject) }
        : null,
    narrationAudioUrl: existsSync(demoAssetPath(eraId, 'narration')) ? demoAssetUrl(eraId, 'narration') : null,
    guideVideo: previous?.era.videoState === 'ready' ? previous.era.guideVideo : null,
    updatedAt: new Date().toISOString(),
  });
  const file: DemoEraFile = { era, provenance };
  mkdirSync(path.dirname(demoEraFile(eraId)), { recursive: true });
  writeFileSync(demoEraFile(eraId), `${JSON.stringify(file, null, 2)}\n`);
  if (failures.length) throw new Error(`${eraId}: ${failures.join('; ')}`);
  return era;
}

/** Run the script. */
async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const only = flagValues(args, '--only');
  const redo = new Set(flagValues(args, '--redo'));
  const dryRun = args.includes('--dry-run');
  const reuseDb = args.includes('--reuse-db');
  const concurrency = Number(flagValues(args, '--concurrency')[0] ?? DEFAULT_CONCURRENCY) || DEFAULT_CONCURRENCY;
  if (process.env.NEXT_PUBLIC_USE_MOCKS === '1') throw new Error('NEXT_PUBLIC_USE_MOCKS=1 would return placeholder media. Set it empty.');
  if (!dryRun && !process.env.FAL_KEY) throw new Error('FAL_KEY is not set.');
  const unknown = only.filter((id) => !DEMO_ERA_IDS.includes(id));
  if (unknown.length) throw new Error(`Not a demo era: ${unknown.join(', ')}. Demo eras: ${DEMO_ERA_IDS.join(', ')}`);
  const ids = only.length ? only : [...DEMO_ERA_IDS];

  const queue = [...ids];
  const failed: string[] = [];
  const worker = async () => {
    for (let id = queue.shift(); id; id = queue.shift()) {
      try {
        await makeEra(id, { redo, reuseDb, dryRun });
      } catch (error) {
        failed.push(id);
        console.error(error instanceof Error ? error.message : String(error));
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(concurrency, ids.length) }, worker));
  if (!dryRun) stampDemoUrls(); // a remade file gets a new URL, so no browser keeps the old one
  if (reuseDb) await (await import('@/lib/db')).closeMongo();
  console.log(failed.length ? `\nFailed: ${failed.join(', ')}. Run again to repeat only what is missing.` : '\nAll demo eras complete.');
  if (failed.length) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
