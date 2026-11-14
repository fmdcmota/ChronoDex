/**
 * `npm run seed`: load the landmarks and their eras into MongoDB.
 *
 * Owner: Agent 1 (Core). Task A1-08 (MASTER.md section 11).
 *
 * Usage:
 *   npm run seed              write to the database named by MONGODB_URI and MONGODB_DB
 *   npm run seed -- --dry-run validate the fixtures and print what would be written
 *
 * What it writes:
 * - Landmarks: created or fully replaced from fixtures/landmarks.ts, so edits there take effect.
 * - Eras: one per landmark year, inserted only when missing. Re-seeding never touches an era that
 *   already exists, so generated content is safe. Every era is seeded `missing`, including
 *   queens-tower_1893: the fixture's placeholder hero content is for mock mode only and would
 *   otherwise block real generation.
 *
 * Not yet: reading GPS from the H1 reference photos into photoSpot and normalising each photo to
 * 16:9. That waits for the photos (TODO(agent-1), A1-08 part 2).
 * Side effects: database writes only. Costs nothing.
 */
import { EraSchema, LandmarkSchema, type Era } from '@/lib/contracts';
import { closeMongo, insertEraIfMissing, mongoConfigured, upsertLandmark } from '@/lib/db';
import { landmarks, missingEra } from '@fixtures/index';

/** Validate everything first, so a bad fixture never leaves the database half seeded. */
function plan(): { eras: Era[] } {
  for (const landmark of landmarks) LandmarkSchema.parse(landmark);
  const eras = landmarks.flatMap((landmark) => landmark.eraYears.map((year) => missingEra(landmark, year)));
  for (const era of eras) EraSchema.parse(era);
  return { eras };
}

/** Seed, or describe the seed when --dry-run is passed. */
async function main(): Promise<void> {
  const dryRun = process.argv.includes('--dry-run');
  const { eras } = plan();

  if (dryRun) {
    console.log(`Dry run: ${landmarks.length} landmarks and ${eras.length} eras are valid. Nothing was written.`);
    return;
  }
  if (!mongoConfigured()) {
    console.error('MONGODB_URI is not set. Put it in .env.local, or pass --dry-run to only validate.');
    process.exitCode = 1;
    return;
  }

  const db = process.env.MONGODB_DB || 'chronodex_dev';
  console.log(`Seeding database "${db}"...`);
  for (const [order, landmark] of landmarks.entries()) await upsertLandmark(landmark, order);
  let inserted = 0;
  for (const era of eras) if (await insertEraIfMissing(era)) inserted++;
  console.log(`Landmarks written: ${landmarks.length}. Eras inserted: ${inserted}. Eras already present and left alone: ${eras.length - inserted}.`);
}

main()
  .catch((err: unknown) => {
    console.error('Seed failed:', err);
    process.exitCode = 1;
  })
  .finally(() => closeMongo());
