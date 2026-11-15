/**
 * Regenerate the derived data files: `npx tsx scripts/data/build.ts`.
 *
 * Owner: Agent 5 (Archivist). Implements AGENT5.md sections 5.3 (`sources`), 5.4 and 5.6, task A5-01.
 * For every era dossier that parses: rewrite its `sources` as exactly the URLs it cites
 * (`citedSources`), then write `data/eras/<eraId>.notes.txt` with `renderNotes`. Then write
 * `data/ATTRIBUTION.md` with `renderAttribution`. ./validate.ts regenerates the same text and compares,
 * so the derived files can never drift from the JSON.
 *
 * Side effects: rewrites era JSON files (sources only), notes files and ATTRIBUTION.md. No network.
 */
import { renderAttribution } from './attribution';
import { citedSources } from './checks';
import { ATTRIBUTION_PATH, ERAS_DIR, notesPath, readEraFiles, readLandmarkFiles, writeJson, writeText } from './files';
import { renderNotes } from './notes';
import type { EraFile, LandmarkFile } from './schema';
import path from 'node:path';

const landmarks: LandmarkFile[] = [];
const eras: EraFile[] = [];
for (const file of readLandmarkFiles()) {
  if (file.value) landmarks.push(file.value);
  else console.log(`skipped ${file.name}: ${file.problems.join('; ')}`);
}
for (const file of readEraFiles()) {
  if (!file.value) {
    console.log(`skipped ${file.name}: ${file.problems.join('; ')}`);
    continue;
  }
  const era: EraFile = { ...file.value, sources: citedSources(file.value) };
  writeJson(path.join(ERAS_DIR, file.name), era);
  writeText(notesPath(era.eraId), renderNotes(era));
  eras.push(era);
}
writeText(ATTRIBUTION_PATH, renderAttribution(landmarks, eras));
console.log(`built notes for ${eras.length} eras and ATTRIBUTION.md for ${landmarks.length} landmarks.`);
