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
 * The Archivist's data: when `data/landmarks/<id>.json` exists and is not `blocked`, its subject,
 * photoSpot, captureRadiusM and eraYears replace the fixture's, and its reference JPEG (already
 * 1600x900, AGENT5.md 5.5) is copied to `public/reference/<id>.jpg` and used as referencePhotoUrl
 * `/reference/<id>.jpg`. Name, blurb, rarity and art still come from the fixtures. Years an
 * override adds get new `missing` eras; years it drops keep their existing era (nothing is deleted).
 * Reading GPS from raw H1 photos is the Archivist's job now: it writes the landmark file.
 * Side effects: database writes only. Costs nothing.
 */
import { copyFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { applyLandmarkOverride, readLandmarkOverrides } from '@/lib/archive';
import { EraSchema, LandmarkSchema, type Era, type Landmark } from '@/lib/contracts';
import { closeMongo, insertEraIfMissing, mongoConfigured, upsertLandmark } from '@/lib/db';
import { landmarks as fixtureLandmarks, missingEra } from '@fixtures/index';

/** Where Next.js serves static files from; the reference photos are copied under it. */
const REFERENCE_DIR = path.join(process.cwd(), 'public', 'reference');

/**
 * The fixture landmarks with the Archivist's data applied, copying reference photos into place unless dry-running.
 *
 * @param copyFiles - False for a dry run, which must write nothing.
 * @returns The landmarks to seed, and the ids that took data from `data/`.
 */
function effectiveLandmarks(copyFiles: boolean): { landmarks: Landmark[]; fromData: string[] } {
  const overrides = readLandmarkOverrides();
  const fromData: string[] = [];
  const result = fixtureLandmarks.map((fixture) => {
    const override = overrides.get(fixture.id);
    if (!override) return fixture;
    fromData.push(fixture.id);
    let url: string | null = null;
    if (override.referencePhotoPath) {
      url = `/reference/${fixture.id}.jpg`;
      if (copyFiles) {
        mkdirSync(REFERENCE_DIR, { recursive: true });
        copyFileSync(override.referencePhotoPath, path.join(REFERENCE_DIR, `${fixture.id}.jpg`));
      }
    }
    return applyLandmarkOverride(fixture, override, url);
  });
  return { landmarks: result, fromData };
}

/** Validate everything first, so a bad fixture never leaves the database half seeded. */
function plan(landmarks: Landmark[]): { eras: Era[] } {
  for (const landmark of landmarks) LandmarkSchema.parse(landmark);
  const eras = landmarks.flatMap((landmark) => landmark.eraYears.map((year) => missingEra(landmark, year)));
  for (const era of eras) EraSchema.parse(era);
  return { eras };
}

/** Seed, or describe the seed when --dry-run is passed. */
async function main(): Promise<void> {
  const dryRun = process.argv.includes('--dry-run');
  const { landmarks, fromData } = effectiveLandmarks(!dryRun);
  const { eras } = plan(landmarks);
  if (fromData.length > 0) console.log(`Using data/ for: ${fromData.join(', ')}.`);

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
