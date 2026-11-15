/**
 * `scripts/demo/load-demo.ts`: put the kept demo Eras into the database the app reads.
 *
 * Owner: Agent 6 (demo assets). Companion of scripts/demo/generate-demo.ts.
 *
 * Usage (repo root; MONGODB_URI and MONGODB_DB in .env.local, the database the app server uses):
 *   npm run seed                                                           first: landmarks, empty eras, reference photos
 *   npx tsx --env-file=.env.local scripts/demo/load-demo.ts --dry-run      list what would change
 *   npx tsx --env-file=.env.local scripts/demo/load-demo.ts                write every finished demo era
 *   add --only <eraId> (repeatable)
 *
 * Each `data/demo/eras/<eraId>.json` whose Era is `ready` replaces that Era's text and media fields in full (URLs
 * `/demo/<eraId>/...`, served from `public/`). The guide video fields are written only when the file has a kept video
 * (scripts/demo/generate-video.ts); otherwise the database's own are left alone. Eras that are not ready are skipped with a note. Costs nothing.
 */
import { existsSync, readFileSync } from 'node:fs';
import { closeMongo, getEra, getLandmark, mongoConfigured, patchEra } from '@/lib/db';
import { EraSchema, type Era } from '@/lib/contracts';
import { DEMO_ERA_IDS, demoEraFile, type DemoEraFile } from './demo-set';

/** Run the script. */
async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const only = args.flatMap((a, i) => (a === '--only' && args[i + 1] ? [args[i + 1]] : []));
  if (!mongoConfigured()) throw new Error('MONGODB_URI is not set: the app would not see the eras.');
  console.log(`Database ${process.env.MONGODB_DB ?? '(default)'}${dryRun ? ', dry run' : ''}`);

  let loaded = 0;
  for (const eraId of DEMO_ERA_IDS) {
    if (only.length && !only.includes(eraId)) continue;
    if (!existsSync(demoEraFile(eraId))) {
      console.log(`skip   ${eraId}: not generated yet`);
      continue;
    }
    const { era } = JSON.parse(readFileSync(demoEraFile(eraId), 'utf8')) as DemoEraFile;
    const parsed: Era = EraSchema.parse(era);
    if (parsed.state !== 'ready') {
      console.log(`skip   ${eraId}: state ${parsed.state}`);
      continue;
    }
    if (!(await getLandmark(parsed.landmarkId))) throw new Error(`Landmark ${parsed.landmarkId} is not in the database. Run npm run seed first.`);
    if (!(await getEra(eraId))) throw new Error(`Era ${eraId} is not in the database. Run npm run seed first.`);
    // The video fields are written only when this era's video is kept here too; otherwise the database keeps its own.
    const { id: ignoredId, videoState, guideVideo, ...core } = parsed;
    void ignoredId;
    const patch: Partial<Era> = videoState === 'ready' ? { ...core, videoState, guideVideo } : core;
    console.log(`${dryRun ? 'would ' : ''}load ${eraId}: ${parsed.title} (guide ${parsed.guide?.name})`);
    if (!dryRun) await patchEra(eraId, { ...patch, updatedAt: new Date().toISOString() });
    loaded += 1;
  }
  console.log(`${loaded} era(s) ${dryRun ? 'would be ' : ''}loaded.`);
  await closeMongo();
}

main().catch(async (error) => {
  console.error(error);
  await closeMongo();
  process.exit(1);
});
