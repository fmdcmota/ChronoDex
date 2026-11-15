/**
 * `scripts/demo/export-landmarks.ts`: write the demo landmarks, as the seed would make them, to
 * `data/demo/landmarks.json`, and copy their reference photos to `public/demo/reference/`.
 *
 * Owner: Agent 6 (demo assets). Why: `src/lib/demo` lets a fresh clone with no database keys show the demo set
 * (in-memory store and mock mode). It needs the landmarks with the Archivist's coordinates and a reference photo URL
 * that is committed (`public/reference/` is git-ignored and only filled by the seed).
 *
 * Usage: npx tsx scripts/demo/export-landmarks.ts   (no keys, no network, costs nothing). Rerun after a landmark's
 * data file or reference photo changes.
 */
import { copyFileSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { applyLandmarkOverride, readLandmarkOverrides } from '@/lib/archive';
import { parseEraId, type Landmark } from '@/lib/contracts';
import { landmarks as fixtureLandmarks } from '@fixtures/index';
import { DEMO_ERA_IDS } from './demo-set';

const ids = [...new Set(DEMO_ERA_IDS.map((eraId) => parseEraId(eraId).landmarkId))];
const overrides = readLandmarkOverrides();
const out: Landmark[] = ids.map((id) => {
  const fixture = fixtureLandmarks.find((l) => l.id === id);
  const override = overrides.get(id);
  if (!fixture || !override?.referencePhotoPath) throw new Error(`${id}: no fixture or no reference photo`);
  const dir = path.join(process.cwd(), 'public', 'demo', 'reference');
  mkdirSync(dir, { recursive: true });
  copyFileSync(override.referencePhotoPath, path.join(dir, `${id}.jpg`));
  return applyLandmarkOverride(fixture, override, `/demo/reference/${id}.jpg`);
});
writeFileSync(path.join(process.cwd(), 'data', 'demo', 'landmarks.json'), `${JSON.stringify(out, null, 2)}\n`);
console.log(`Wrote ${out.length} demo landmarks to data/demo/landmarks.json`);
