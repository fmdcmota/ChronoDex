/**
 * `npm run seed`: load the fixtures into the database.
 *
 * Owner: Agent 1 (Core). Task A1-08 (MASTER.md section 11).
 *
 * M0 STATE: a dry run. It validates every fixture against its schema and prints what it would
 * insert, then exits. TODO(agent-1): A1-08 writes landmarks and eras to MongoDB, reads GPS from
 * the H1 reference photos into photoSpot, and normalises each reference photo to 16:9.
 * Side effects today: none. It reads .env.local if present but uses no keys.
 */
import { EraSchema, LandmarkSchema } from '@/lib/contracts';
import { eras, landmarks } from '@fixtures/index';

/** Validate the fixtures and report. Exits non-zero on the first invalid fixture. */
function main(): void {
  for (const landmark of landmarks) LandmarkSchema.parse(landmark);
  for (const era of eras) EraSchema.parse(era);
  const ready = eras.filter((e) => e.state === 'ready').length;
  console.log(`Dry run: ${landmarks.length} landmarks and ${eras.length} eras (${ready} ready) are valid.`);
  console.log('Nothing was written. The MongoDB seed arrives with task A1-08.');
}

main();
