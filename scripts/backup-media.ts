/**
 * `scripts/backup-media.ts`: download every generated file to local disk before the demo.
 *
 * Owner: Agent 2 (Studio). Implements MASTER.md section 5.3 rule 8 and task A2-13. fal keeps generated files for at
 * least 7 days, and the URLs are public, so anything not saved by then is gone.
 *
 * Usage (repo root; MONGODB_URI and MONGODB_DB in .env.local, or no MONGODB_URI to read the in-memory fixtures):
 *   npx tsx --env-file=.env.local scripts/backup-media.ts --dry-run     list every URL, download nothing
 *   npx tsx --env-file=.env.local scripts/backup-media.ts               download to spikes/agent-2/out/media-backup
 *   add --out <folder> to choose the folder, --only <eraId> to limit it
 *
 * Output: <out>/<eraId>/<name>.<ext> for each era (scene, panorama, narration, headshot, walk_on, talk, walk_off,
 * stitched), <out>/landmarks/<landmarkId>/reference.<ext>, and <out>/index.json mapping each URL to its file and size.
 * Files already downloaded with the same size are skipped, so it is safe to run repeatedly. Costs nothing.
 * It does not change the database: restoring means re-pointing URLs, which is a manual step (see the notebook).
 */
import { mkdir, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { closeMongo, listEras, listLandmarks } from '@/lib/db';
import { eraAssets, landmarkAssets, type EraAsset } from '@/lib/pipeline/assets';

/** Default folder. spikes/agent-2/out is git-ignored, so a backup never lands in a commit. */
const DEFAULT_OUT = 'spikes/agent-2/out/media-backup';

/** One planned download. */
interface Plan {
  group: string;
  asset: EraAsset;
}

/** Read the value after a flag, or null. */
function flagValue(args: string[], flag: string): string | null {
  const i = args.indexOf(flag);
  return i >= 0 && args[i + 1] ? args[i + 1] : null;
}

/** File extension from a URL path, or `bin`. */
function extensionOf(url: string): string {
  return new URL(url).pathname.match(/\.([a-z0-9]{2,5})$/i)?.[1]?.toLowerCase() ?? 'bin';
}

/** Run the script. */
async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const out = flagValue(args, '--out') ?? DEFAULT_OUT;
  const only = args.flatMap((a, i) => (a === '--only' && args[i + 1] ? [args[i + 1]] : []));

  const plans: Plan[] = [];
  for (const landmark of await listLandmarks()) {
    for (const asset of landmarkAssets(landmark)) plans.push({ group: `landmarks/${landmark.id}`, asset });
    for (const era of await listEras(landmark.id)) {
      if (only.length && !only.includes(era.id)) continue;
      for (const asset of eraAssets(era)) plans.push({ group: era.id, asset });
    }
  }
  console.log(`${plans.length} file(s) to back up${dryRun ? ' (dry run, nothing downloaded)' : ` into ${out}`}:`);
  for (const p of plans) console.log(`  ${p.group}/${p.asset.name}  ${p.asset.url}`);
  if (dryRun || plans.length === 0) return;

  const index: { url: string; file: string; bytes: number; skipped: boolean }[] = [];
  let failed = 0;
  for (const { group, asset } of plans) {
    const file = path.join(out, group, `${asset.name}.${extensionOf(asset.url)}`);
    try {
      await mkdir(path.dirname(file), { recursive: true });
      const response = await fetch(asset.url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const expected = Number(response.headers.get('content-length') ?? 0);
      const existing = await stat(file).then((s) => s.size, () => -1);
      if (expected > 0 && existing === expected) {
        await response.body?.cancel();
        index.push({ url: asset.url, file, bytes: existing, skipped: true });
        console.log(`skip   ${file} (already saved)`);
        continue;
      }
      const bytes = Buffer.from(await response.arrayBuffer());
      await writeFile(file, bytes);
      index.push({ url: asset.url, file, bytes: bytes.length, skipped: false });
      console.log(`saved  ${file} (${Math.round(bytes.length / 1024)} KB)`);
    } catch (error) {
      failed++;
      console.error(`FAILED ${group}/${asset.name}: ${error instanceof Error ? error.message : String(error)}  ${asset.url}`);
    }
  }
  await writeFile(path.join(out, 'index.json'), JSON.stringify({ savedAt: new Date().toISOString(), files: index }, null, 2));
  console.log(`\nDone: ${index.length} saved or already present, ${failed} failed. Index: ${path.join(out, 'index.json')}`);
  if (failed > 0) process.exitCode = 1;
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => closeMongo().catch(() => undefined));
