/**
 * `scripts/persist-media.ts`: copy every era's fal media into our store and point the Era at the copies.
 *
 * Owner: Agent 4 (Time Machine), by the human's grant. Task A4-13, notebook/agent-4-panorama-plan.md section 3.
 * Why: eras made before the pipeline persisted its outputs (A2-h) hold fal CDN URLs, which die after about 7 days.
 * After this runs, they hold `/api/media/<id>` URLs served from GridFS (or the MEDIA_DIR folder) for ever.
 *
 * Usage (repo root; MONGODB_URI and MONGODB_DB in .env.local, the same database the app and worker use):
 *   npx tsx --env-file=.env.local scripts/persist-media.ts --dry-run       list what would be copied, change nothing
 *   npx tsx --env-file=.env.local scripts/persist-media.ts                 copy and rewrite every era
 *   add --only <eraId> (repeatable) to limit it, --no-video to leave the guide clips on fal
 *   add --copy-only to store the files but leave the Eras' URLs alone (safe before the pipeline uses toFalUrl,
 *   A2-h: until then a later stage would send an /api/media URL to fal); rerun without it later to rewrite
 *
 * Cost: nothing on fal (downloads from its CDN are free). Safe to rerun: stored URLs are skipped, and a file
 * already stored (same URL or same bytes) is not downloaded twice. Each era is re-read just before it is patched,
 * so a worker finishing a stage meanwhile is not overwritten. A failed download is reported and the rest go on.
 */
import { closeMongo, getEra, listEras, listLandmarks, patchEra } from '@/lib/db';
import { closeMedia, mediaBackendKind, persistFromUrl } from '@/lib/media';
import { eraMediaPatch, unpersistedMedia } from '@/lib/media/eraMedia';

/** Values of a repeatable flag. */
function flagValues(args: string[], flag: string): string[] {
  return args.flatMap((a, i) => (a === flag && args[i + 1] ? [args[i + 1]] : []));
}

/** Run the script. */
async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const includeVideo = !args.includes('--no-video');
  const copyOnly = args.includes('--copy-only');
  const only = flagValues(args, '--only');
  console.log(
    `Media store: ${mediaBackendKind()}${process.env.MONGODB_URI ? ` (database ${process.env.MONGODB_DB ?? 'chronodex_dev'})` : ' (no MONGODB_URI: in-memory fixtures and the local folder)'}` +
      (dryRun ? '. Dry run: nothing is copied or changed.' : copyOnly ? '. Copy only: the Eras keep their URLs.' : ''),
  );

  let copied = 0;
  let failed = 0;
  let erasChanged = 0;
  for (const landmark of await listLandmarks()) {
    for (const listed of await listEras(landmark.id)) {
      if (only.length && !only.includes(listed.id)) continue;
      const refs = unpersistedMedia(listed, { includeVideo });
      if (refs.length === 0) continue;
      console.log(`${listed.id}: ${refs.length} file(s)`);
      const replaced = new Map<string, string>();
      for (const ref of refs) {
        if (dryRun) {
          console.log(`  would copy ${ref.name}  ${ref.url}`);
          continue;
        }
        try {
          // Expiry unknown: these URLs may be days old, so toFalUrl will upload afresh rather than trust a guess.
          const stored = await persistFromUrl(ref.url, { eraId: listed.id, name: ref.name, falUrlExpiresAt: null });
          replaced.set(ref.url, stored.url);
          copied += stored.created ? 1 : 0;
          console.log(`  ${stored.created ? 'copied' : 'already had'} ${ref.name} -> ${stored.url} (${Math.round(stored.asset.bytes / 1024)} KB)`);
        } catch (error) {
          failed += 1;
          console.error(`  FAILED ${ref.name}  ${ref.url}: ${(error as Error).message}`);
        }
      }
      if (dryRun || copyOnly || replaced.size === 0) continue;
      const fresh = await getEra(listed.id);
      if (!fresh) continue;
      const patch = eraMediaPatch(fresh, replaced);
      if (Object.keys(patch).length === 0) continue;
      await patchEra(listed.id, patch);
      erasChanged += 1;
      console.log(`  era rewritten: ${Object.keys(patch).join(', ')}`);
    }
  }
  console.log(dryRun ? 'Dry run done.' : `Done: ${copied} file(s) copied, ${erasChanged} era(s) rewritten, ${failed} failure(s).`);
  if (failed) process.exitCode = 1;
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => closeMongo().catch(() => undefined))
  .finally(() => closeMedia().catch(() => undefined));
