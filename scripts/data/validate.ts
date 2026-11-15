/**
 * Validate the Archivist's data files: `npx tsx scripts/data/validate.ts [--era <eraId>] [--online]`.
 *
 * Owner: Agent 5 (Archivist). Implements AGENT5.md section 6.1, task A5-01.
 * Prints one line per problem and exits 1 if there is any, 0 when everything passes.
 *
 * - No flags: every landmark and era file, cross references, notes.txt against `renderNotes`,
 *   `ATTRIBUTION.md` against `renderAttribution`, and every JPEG in `data/reference/`.
 * - `--era <eraId>`: one era dossier only (schema and `checkEra`). Researchers run this before the
 *   lead has run ./build.ts, so the notes file is not required in this mode.
 * - `--online`: also fetch every image URL (must answer 200 with an image type) and every source URL
 *   (200 to 399; a 403 is a warning, since some archives block scripts). One request at a time, with
 *   a pause between requests to Wikimedia hosts (AGENT5.md rule 4.5). Takes minutes.
 *
 * Side effects: reads files under `data/`; with `--online`, network requests. Writes nothing.
 */
import fs from 'node:fs';
import path from 'node:path';
import { renderAttribution } from './attribution';
import { checkCrossReferences, checkEra, checkLandmark, checkReferenceJpeg, hostOf } from './checks';
import { ATTRIBUTION_PATH, REFERENCE_DIR, notesPath, readEraFile, readEraFiles, readLandmarkFiles, readText } from './files';
import { renderNotes } from './notes';
import type { EraFile, LandmarkFile } from './schema';

/** Sent on every request, as AGENT5.md rule 4.5 asks. */
export const USER_AGENT = 'Chronodex-hackathon-archivist/0.1';
/** Pause between requests to a Wikimedia host. */
const WIKIMEDIA_PAUSE_MS = 1100;
/** Give up on one URL after this long. */
const FETCH_TIMEOUT_MS = 20_000;

/** Result of the online pass: hard problems and warnings. */
interface OnlineResult {
  problems: string[];
  warnings: string[];
}

/**
 * Run the offline checks over everything in `data/`.
 *
 * @returns Problems, and the parsed files for the online pass.
 */
function checkAll(): { problems: string[]; landmarks: LandmarkFile[]; eras: EraFile[] } {
  const problems: string[] = [];
  const loadedLandmarks = readLandmarkFiles();
  const loadedEras = readEraFiles();
  const landmarks: LandmarkFile[] = [];
  const eras: EraFile[] = [];
  for (const file of loadedLandmarks) {
    problems.push(...file.problems);
    if (file.value) {
      landmarks.push(file.value);
      problems.push(...checkLandmark(file.value));
      if (`${file.value.id}.json` !== file.name) problems.push(`${file.name}: id is ${file.value.id}`);
    }
  }
  for (const file of loadedEras) {
    problems.push(...file.problems);
    if (!file.value) continue;
    eras.push(file.value);
    problems.push(...checkEra(file.value));
    if (`${file.value.eraId}.json` !== file.name) problems.push(`${file.name}: eraId is ${file.value.eraId}`);
    const notes = readText(notesPath(file.value.eraId));
    if (notes === null) problems.push(`${file.value.eraId}: no notes.txt (run npx tsx scripts/data/build.ts)`);
    else if (notes !== renderNotes(file.value)) problems.push(`${file.value.eraId}: notes.txt is out of date (run npx tsx scripts/data/build.ts)`);
  }
  problems.push(...checkCrossReferences(landmarks, eras));

  if (landmarks.length > 0 || eras.length > 0) {
    const attribution = readText(ATTRIBUTION_PATH);
    if (attribution === null) problems.push('data/ATTRIBUTION.md is missing (run npx tsx scripts/data/build.ts)');
    else if (attribution !== renderAttribution(landmarks, eras)) problems.push('data/ATTRIBUTION.md is out of date (run npx tsx scripts/data/build.ts)');
  }

  if (fs.existsSync(REFERENCE_DIR)) {
    for (const name of fs.readdirSync(REFERENCE_DIR).filter((n) => /\.jpe?g$/i.test(n)).sort()) {
      problems.push(...checkReferenceJpeg(name, new Uint8Array(fs.readFileSync(path.join(REFERENCE_DIR, name)))));
    }
  }
  return { problems, landmarks, eras };
}

/**
 * Wait.
 *
 * @param ms - Milliseconds.
 * @returns Resolves after the pause.
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Fetch one URL politely and report its status and content type.
 *
 * @param url - The URL.
 * @returns Status (0 on a network error) and content type.
 */
async function probe(url: string): Promise<{ status: number; type: string }> {
  if (/(^|\.)wikimedia\.org$|(^|\.)wikipedia\.org$|(^|\.)wikidata\.org$/.test(hostOf(url))) await sleep(WIKIMEDIA_PAUSE_MS);
  try {
    const res = await fetch(url, { method: 'GET', redirect: 'follow', headers: { 'User-Agent': USER_AGENT }, signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
    const type = res.headers.get('content-type') ?? '';
    await res.body?.cancel();
    return { status: res.status, type };
  } catch {
    return { status: 0, type: '' };
  }
}

/**
 * Fetch every image and source URL in the given files.
 *
 * @param landmarks - Landmark files (reference photo originals and pages).
 * @param eras - Era dossiers (images and sources).
 * @returns Problems and warnings.
 */
async function checkOnline(landmarks: readonly LandmarkFile[], eras: readonly EraFile[]): Promise<OnlineResult> {
  const result: OnlineResult = { problems: [], warnings: [] };
  const images = new Map<string, string>();
  const pages = new Map<string, string>();
  for (const era of eras) {
    era.referenceImages.forEach((image, i) => images.set(image.url, `${era.eraId} referenceImages[${i}]`));
    for (const source of era.sources) pages.set(source.url, `${era.eraId} sources`);
  }
  for (const landmark of landmarks) {
    const photo = landmark.referencePhoto;
    if (photo.originalUrl) images.set(photo.originalUrl, `${landmark.id} referencePhoto.originalUrl`);
    if (photo.pageUrl) pages.set(photo.pageUrl, `${landmark.id} referencePhoto.pageUrl`);
  }
  for (const [url, where] of images) {
    const { status, type } = await probe(url);
    if (status !== 200 || !type.startsWith('image/')) result.problems.push(`${where}: ${url} answered ${status} ${type}`);
  }
  for (const [url, where] of pages) {
    const { status } = await probe(url);
    if (status === 403 || status === 429) result.warnings.push(`${where}: ${url} answered ${status} (open it in a browser)`);
    else if (status < 200 || status > 399) result.problems.push(`${where}: ${url} answered ${status}`);
  }
  return result;
}

/**
 * Entry point.
 *
 * @param argv - Command-line arguments after the script name.
 * @returns The process exit code.
 */
async function main(argv: string[]): Promise<number> {
  const online = argv.includes('--online');
  const eraFlag = argv.indexOf('--era');
  let problems: string[];
  let landmarks: LandmarkFile[] = [];
  let eras: EraFile[] = [];
  if (eraFlag >= 0) {
    const eraId = argv[eraFlag + 1];
    if (!eraId) {
      console.error('usage: validate.ts --era <eraId> [--online]');
      return 2;
    }
    const file = readEraFile(eraId);
    problems = [...file.problems];
    if (file.value) {
      problems.push(...checkEra(file.value));
      eras = [file.value];
    }
  } else {
    ({ problems, landmarks, eras } = checkAll());
  }

  const warnings: string[] = [];
  if (online) {
    const res = await checkOnline(landmarks, eras);
    problems.push(...res.problems);
    warnings.push(...res.warnings);
  }
  for (const w of warnings) console.log(`warning: ${w}`);
  for (const p of problems) console.log(p);
  const scope = eraFlag >= 0 ? `era ${argv[eraFlag + 1]}` : `${landmarks.length} landmark and ${eras.length} era files`;
  console.log(problems.length === 0 ? `OK: ${scope} pass${online ? ' (online)' : ''}.` : `${problems.length} problem(s) in ${scope}.`);
  return problems.length === 0 ? 0 : 1;
}

void main(process.argv.slice(2)).then((code) => {
  process.exitCode = code;
});
