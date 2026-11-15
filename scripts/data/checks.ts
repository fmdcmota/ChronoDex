/**
 * Pure checks on the Archivist's data files: the rules of AGENT5.md sections 4 and 6.1 that a JSON
 * schema cannot express.
 *
 * Owner: Agent 5 (Archivist). Implements AGENT5.md section 6.1, task A5-01.
 * Every function here is pure (no file or network access), so it is unit tested in
 * ./checks.test.ts and runs in `npm run check`. ./validate.ts does the reading and fetching.
 * Each check returns problems in plain words; an empty list means the file passes.
 */
import { bearingDeg, eraIdOf, haversineM, type LatLng } from '@/lib/contracts';
// Imported from the file, not from '@/lib/historian', so a data script never loads the DeepSeek
// and fal clients that the Historian's entry point pulls in.
import { isGoogleUrl } from '@/lib/historian/validate';
import type { DataSource, EraFile, LandmarkFile, ReferenceImage } from './schema';

/** South Kensington, with a margin. Every coordinate must fall inside (AGENT5.md 6.1). */
export const AREA_BOUNDS = { minLat: 51.49, maxLat: 51.505, minLng: -0.185, maxLng: -0.165 } as const;
/** `distanceM` must match the recomputed distance this closely. */
export const DISTANCE_TOLERANCE_M = 1;
/** Closer than this and the subject cannot fit in frame. */
export const MIN_SUBJECT_DISTANCE_M = 15;
/** Further than this and the subject is not the thing being photographed. */
export const MAX_SUBJECT_DISTANCE_M = 200;
/** `facingDeg` must match the recomputed bearing this closely. */
export const FACING_TOLERANCE_DEG = 2;
/** A validated era needs this many sourced facts. */
export const MIN_FACTS = 5;
/** ... of which this many change what the camera sees. */
export const MIN_VISIBLE_FACTS = 3;
/** ... and this many are flagged as fun facts (the Historian must return at least three). */
export const MIN_FUN_FACTS = 3;
/** A validated era offers the Historian this many plausible guide roles. */
export const MIN_ROLES = 3;
/** A validated era needs this many `same_view` or `nearby` images, or a gap that says none exist. */
export const MIN_MODEL_IMAGES = 2;
/** Shortest and longest allowed long side of a reference image, in pixels. */
export const IMAGE_LONG_SIDE_MIN_PX = 1024;
/** See IMAGE_LONG_SIDE_MIN_PX. */
export const IMAGE_LONG_SIDE_MAX_PX = 2048;
/** An image dated further than this from the era year needs "unchanged" in its notes. */
export const MAX_IMAGE_YEAR_GAP = 10;
/** Shortest scene description or surroundings text a painter could work from, in characters. */
export const MIN_SCENE_TEXT_CHARS = 120;
/** Reference photos are exactly this size (AGENT5.md 5.5). */
export const REFERENCE_WIDTH_PX = 1600;
/** See REFERENCE_WIDTH_PX. */
export const REFERENCE_HEIGHT_PX = 900;
/** Reference photos stay under this size so the repo stays small and fal fetches them quickly. */
export const REFERENCE_MAX_BYTES = 600 * 1024;

/**
 * Hosts that count as scholarly or primary for AGENT5.md rule 4.3: one source here is enough for a
 * `high` fact. Everything else needs two independent sources. A subdomain of a listed host counts.
 */
export const SCHOLARLY_HOSTS = [
  // Survey of London and other edited histories.
  'british-history.ac.uk',
  // National Heritage List for England: listing descriptions.
  'historicengland.org.uk',
  // The institutions' own histories and archives.
  'imperial.ac.uk',
  'royalalberthall.com',
  'vam.ac.uk',
  'nhm.ac.uk',
  'sciencemuseum.org.uk',
  'sciencemuseumgroup.org.uk',
  'royalcommission1851.org',
  'rcm.ac.uk',
  'bl.uk',
  'iwm.org.uk',
  'londonmuseum.org.uk',
  'museumoflondon.org.uk',
  'ltmuseum.co.uk',
  // Government and local authority records.
  'parliament.uk',
  'nationalarchives.gov.uk',
  'rbkc.gov.uk',
  'tfl.gov.uk',
  'london.gov.uk',
  'gov.uk',
  // Scans and transcriptions of contemporary publications.
  'archive.org',
  'hathitrust.org',
  'wikisource.org',
  'gutenberg.org',
  // Peer-reviewed reference works and journals.
  'oxforddnb.com',
  'jstor.org',
  'ucl.ac.uk',
  'bbc.co.uk',
] as const;

/** Hosts a reference image file may be served from. The image models fetch these URLs directly. */
export const IMAGE_HOST_ALLOWLIST = ['upload.wikimedia.org'] as const;

/**
 * Tell whether a URL is an http(s) URL.
 *
 * @param url - Candidate.
 * @returns True for http: and https: URLs that parse.
 */
export function isWebUrl(url: string): boolean {
  try {
    const { protocol } = new URL(url);
    return protocol === 'https:' || protocol === 'http:';
  } catch {
    return false;
  }
}

/**
 * The host of a URL without a leading "www.", lower-cased.
 *
 * @param url - Any URL.
 * @returns The host, or an empty string when the URL does not parse.
 */
export function hostOf(url: string): string {
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, '');
  } catch {
    return '';
  }
}

/**
 * Tell whether a host is, or is a subdomain of, one of the listed hosts.
 *
 * @param host - From hostOf.
 * @param list - Registered hosts.
 * @returns True on a match.
 */
function hostMatches(host: string, list: readonly string[]): boolean {
  return list.some((h) => host === h || host.endsWith(`.${h}`));
}

/**
 * Tell whether a source is scholarly or primary, so that it can support a `high` fact alone.
 *
 * @param url - The source URL.
 * @returns True when its host is on SCHOLARLY_HOSTS.
 */
export function isScholarlyUrl(url: string): boolean {
  return hostMatches(hostOf(url), SCHOLARLY_HOSTS);
}

/**
 * Tell whether an image URL is served from an allowed host.
 *
 * @param url - Direct image URL.
 * @returns True when its host is on IMAGE_HOST_ALLOWLIST.
 */
export function isAllowedImageHost(url: string): boolean {
  return hostMatches(hostOf(url), IMAGE_HOST_ALLOWLIST);
}

/**
 * Tell whether a licence, as the source states it, lets us use an image as model input and show it
 * (AGENT5.md rule 4.2): public domain in any wording, CC0, CC BY or CC BY-SA in any version.
 * NonCommercial and NoDerivatives variants, and anything unrecognised, are refused.
 *
 * @param licence - For example "CC BY-SA 4.0", "Public domain", "PD-old-100", "No restrictions".
 * @returns True when the licence is on the whitelist.
 */
export function isAllowedLicence(licence: string): boolean {
  const text = licence.trim().toLowerCase().replace(/[\s_]+/g, ' ');
  if (!text) return false;
  if (/\b(nc|nd|noncommercial|non-commercial|noderivs|noderivatives)\b/.test(text.replace(/-/g, ' '))) return false;
  if (/all rights reserved|fair use|permission|unknown/.test(text)) return false;
  if (/^public domain( mark)?\b/.test(text) || /^pd\b/.test(text) || /^pd-/.test(text)) return true;
  if (text === 'no restrictions' || text === 'no known copyright restrictions') return true;
  if (/^cc0\b/.test(text) || /^cc zero\b/.test(text)) return true;
  // "CC BY 2.0", "CC BY-SA 4.0", "CC-BY-SA-3.0", "CC BY-SA 2.0 uk".
  return /^cc[ -]by([ -]sa)?[ -]\d(\.\d)?( [a-z-]+)?$/.test(text);
}

/**
 * The year an image shows, nearest to a target year, read from its `date` text.
 *
 * @param date - For example "1893", "c. 1895" or "1886-1890".
 * @param targetYear - The era year. For a range, the end nearest to it is returned.
 * @returns The year, or null when the text holds no four-digit year.
 */
export function depictedYear(date: string, targetYear: number): number | null {
  const years = (date.match(/\b1[0-9]{3}\b|\b20[0-9]{2}\b/g) ?? []).map(Number);
  if (years.length === 0) return null;
  const min = Math.min(...years);
  const max = Math.max(...years);
  if (targetYear >= min && targetYear <= max) return targetYear;
  return Math.abs(targetYear - min) <= Math.abs(targetYear - max) ? min : max;
}

/**
 * The smallest difference between two compass bearings.
 *
 * @param aDeg - First bearing.
 * @param bDeg - Second bearing.
 * @returns Degrees, 0 to 180.
 */
export function bearingDifferenceDeg(aDeg: number, bDeg: number): number {
  const diff = Math.abs(aDeg - bDeg) % 360;
  return diff > 180 ? 360 - diff : diff;
}

/**
 * Tell whether a point is inside the South Kensington box.
 *
 * @param point - WGS84 degrees.
 * @returns True when inside AREA_BOUNDS.
 */
export function inArea(point: LatLng): boolean {
  return point.lat >= AREA_BOUNDS.minLat && point.lat <= AREA_BOUNDS.maxLat && point.lng >= AREA_BOUNDS.minLng && point.lng <= AREA_BOUNDS.maxLng;
}

/**
 * Check one landmark file: coordinates, derived numbers, years and the reference photo block.
 *
 * @param file - A file that already matches LandmarkFileSchema.
 * @returns Problems in plain words. Empty when the file passes.
 */
export function checkLandmark(file: LandmarkFile): string[] {
  const problems: string[] = [];
  const say = (text: string) => problems.push(`${file.id}: ${text}`);

  for (const [name, point] of [['subject', file.subject], ['photoSpot', file.photoSpot]] as const) {
    if (!inArea(point)) say(`${name} (${point.lat}, ${point.lng}) is outside South Kensington`);
  }
  const distanceM = haversineM(file.photoSpot, file.subject);
  if (Math.abs(distanceM - file.distanceM) > DISTANCE_TOLERANCE_M) {
    say(`distanceM is ${file.distanceM} but photoSpot to subject is ${distanceM.toFixed(1)} m`);
  }
  if (distanceM < MIN_SUBJECT_DISTANCE_M || distanceM > MAX_SUBJECT_DISTANCE_M) {
    say(`photoSpot is ${distanceM.toFixed(1)} m from the subject; expected ${MIN_SUBJECT_DISTANCE_M} to ${MAX_SUBJECT_DISTANCE_M} m`);
  }
  const facingDeg = bearingDeg(file.photoSpot, file.subject);
  if (bearingDifferenceDeg(facingDeg, file.facingDeg) > FACING_TOLERANCE_DEG) {
    say(`facingDeg is ${file.facingDeg} but the bearing from photoSpot to subject is ${facingDeg.toFixed(1)}`);
  }

  const years = file.eraYears;
  if (years.some((y, i) => i > 0 && y <= years[i - 1])) say('eraYears must be ascending with no repeats');
  for (const year of years) {
    if (!file.eraYearsReason[String(year)]) say(`eraYearsReason has no entry for ${year}`);
    if (file.rejectedYears[String(year)]) say(`${year} is in both eraYears and rejectedYears`);
  }
  for (const key of Object.keys(file.eraYearsReason)) {
    if (!years.includes(Number(key))) say(`eraYearsReason has ${key}, which is not in eraYears`);
  }
  for (const evidence of file.geometryEvidence) {
    if (isGoogleUrl(evidence.url)) say(`geometryEvidence cites a Google URL: ${evidence.url}`);
  }

  const photo = file.referencePhoto;
  if (photo.status === 'missing') {
    if (file.status === 'validated') say('status is validated but the reference photo is missing');
  } else {
    const expectedFile = `data/reference/${file.id}.jpg`;
    if (photo.file !== expectedFile) say(`referencePhoto.file must be ${expectedFile}`);
    if (!photo.crop) say('referencePhoto.crop is empty; record the crop box');
    if (!photo.takenAt) say('referencePhoto.takenAt is empty');
    if (!photo.author) say('referencePhoto.author is empty');
    if (photo.status === 'commons_stand_in') {
      if (!photo.pageUrl || !photo.originalUrl) say('a stand-in reference photo needs pageUrl and originalUrl');
      if (!photo.licence || !isAllowedLicence(photo.licence)) say(`reference photo licence "${photo.licence}" is not on the whitelist`);
      for (const url of [photo.pageUrl, photo.originalUrl]) {
        if (url && isGoogleUrl(url)) say(`reference photo cites a Google URL: ${url}`);
      }
      if (file.status === 'validated') say('status must be partial while the reference photo is a stand-in (H1 photos missing)');
    }
    if (photo.takenFrom && !inArea(photo.takenFrom)) say('referencePhoto.takenFrom is outside South Kensington');
  }
  if (file.status !== 'validated' && file.openQuestions.length === 0) say(`status is ${file.status} but openQuestions is empty`);
  return problems;
}

/**
 * Check a list of citations: each has a web URL, a title, and no Google host.
 *
 * @param sources - The citations.
 * @param where - Path shown in the problem, for example "facts[2]".
 * @returns Problems. Empty when all pass.
 */
export function checkSources(sources: readonly DataSource[], where: string): string[] {
  const problems: string[] = [];
  if (sources.length === 0) problems.push(`${where} has no source`);
  for (const source of sources) {
    if (!isWebUrl(source.url)) problems.push(`${where} source is not a web URL: ${source.url}`);
    else if (isGoogleUrl(source.url)) problems.push(`${where} cites a Google URL: ${source.url}`);
  }
  return problems;
}

/**
 * Tell whether a `high` fact meets AGENT5.md rule 4.3: one scholarly or primary source, or two
 * sources on different hosts.
 *
 * @param sources - The fact's citations.
 * @returns True when the rule is met.
 */
export function meetsHighConfidence(sources: readonly DataSource[]): boolean {
  if (sources.some((s) => isScholarlyUrl(s.url))) return true;
  return new Set(sources.map((s) => hostOf(s.url)).filter(Boolean)).size >= 2;
}

/**
 * Check one reference image: licence, host, size, date and receipt.
 *
 * @param image - The image entry.
 * @param year - The era year.
 * @param where - Path shown in the problem, for example "referenceImages[0]".
 * @returns Problems. Empty when the image passes.
 */
export function checkReferenceImage(image: ReferenceImage, year: number, where: string): string[] {
  const problems: string[] = [];
  if (!isAllowedLicence(image.licence)) problems.push(`${where} licence "${image.licence}" is not on the whitelist`);
  for (const url of [image.url, image.pageUrl]) {
    if (!isWebUrl(url)) problems.push(`${where} URL is not a web URL: ${url}`);
    else if (isGoogleUrl(url)) problems.push(`${where} uses a Google URL: ${url}`);
  }
  if (!isAllowedImageHost(image.url)) problems.push(`${where} url host ${hostOf(image.url)} is not on the image allowlist`);
  if (!/\.(jpe?g|png)$/i.test(new URL(image.url, 'https://x.invalid').pathname)) problems.push(`${where} url is not a direct .jpg or .png file`);
  const longSidePx = Math.max(image.widthPx, image.heightPx);
  if (longSidePx < IMAGE_LONG_SIDE_MIN_PX || longSidePx > IMAGE_LONG_SIDE_MAX_PX) {
    problems.push(`${where} long side is ${longSidePx} px; expected ${IMAGE_LONG_SIDE_MIN_PX} to ${IMAGE_LONG_SIDE_MAX_PX}`);
  }
  const shown = depictedYear(image.date, year);
  if (shown === null) problems.push(`${where} date "${image.date}" holds no year`);
  else if (Math.abs(shown - year) > MAX_IMAGE_YEAR_GAP && !/unchanged/i.test(image.notes)) {
    problems.push(`${where} shows ${shown}, more than ${MAX_IMAGE_YEAR_GAP} years from ${year}; say what is unchanged in notes or drop it`);
  }
  return problems;
}

/**
 * Every URL an era dossier cites, deduplicated, in first-seen order: facts, daily life, guide
 * roles, then the file page of each reference image. This is what `sources` must hold.
 *
 * @param era - The dossier.
 * @returns Citations with the first title seen for each URL.
 */
export function citedSources(era: EraFile): DataSource[] {
  const seen = new Map<string, DataSource>();
  const add = (source: DataSource) => {
    if (!seen.has(source.url)) seen.set(source.url, source);
  };
  for (const fact of era.facts) fact.sources.forEach(add);
  for (const item of era.dailyLife) item.sources.forEach(add);
  for (const role of era.guideGrounding.roles) role.sources.forEach(add);
  for (const image of era.referenceImages) add({ title: `${image.title} (image, ${image.licence}, ${image.author})`, url: image.pageUrl });
  return [...seen.values()];
}

/**
 * Check one era dossier against AGENT5.md 5.3 and 6.1.
 *
 * @param era - A file that already matches EraFileSchema.
 * @returns Problems in plain words. Empty when the file passes.
 */
export function checkEra(era: EraFile): string[] {
  const problems: string[] = [];
  const say = (text: string) => problems.push(`${era.eraId}: ${text}`);
  const sayAll = (texts: string[]) => texts.forEach(say);

  if (era.eraId !== eraIdOf(era.landmarkId, era.year)) say(`eraId should be ${eraIdOf(era.landmarkId, era.year)}`);

  era.facts.forEach((fact, i) => {
    sayAll(checkSources(fact.sources, `facts[${i}]`));
    if (fact.confidence === 'high' && !meetsHighConfidence(fact.sources)) {
      say(`facts[${i}] is "high" but has neither a scholarly source nor two independent sources`);
    }
  });
  era.dailyLife.forEach((item, i) => sayAll(checkSources(item.sources, `dailyLife[${i}]`)));
  era.guideGrounding.roles.forEach((role, i) => sayAll(checkSources(role.sources, `guideGrounding.roles[${i}]`)));

  for (const [name, list] of Object.entries({ persists: era.scene.persists, altered: era.scene.altered, notYetBuilt: era.scene.notYetBuilt, gone: era.scene.gone })) {
    if (list.some((item) => !item.trim())) say(`scene.${name} has an empty item`);
    if (new Set(list.map((item) => item.trim().toLowerCase())).size !== list.length) say(`scene.${name} has a duplicate item`);
  }

  era.referenceImages.forEach((image, i) => sayAll(checkReferenceImage(image, era.year, `referenceImages[${i}]`)));
  const imageUrls = era.referenceImages.map((image) => image.url);
  if (new Set(imageUrls).size !== imageUrls.length) say('referenceImages lists the same url twice');

  const expected = citedSources(era).map((s) => s.url);
  const listed = era.sources.map((s) => s.url);
  if (new Set(listed).size !== listed.length) say('sources has a duplicate URL');
  for (const url of expected) if (!listed.includes(url)) say(`sources is missing ${url}`);
  for (const url of listed) if (!expected.includes(url)) say(`sources lists ${url}, which nothing cites`);

  if (era.status === 'rejected') {
    if (era.gaps.length === 0) say('a rejected era must say why in gaps');
    return problems;
  }
  if (era.gaps.length === 0 && era.status === 'thin_record') say('a thin_record era must list its gaps');

  if (era.status === 'validated') {
    const visible = era.facts.filter((f) => f.visible).length;
    const fun = era.facts.filter((f) => f.funFact).length;
    if (era.facts.length < MIN_FACTS) say(`validated needs ${MIN_FACTS} facts; has ${era.facts.length}`);
    if (visible < MIN_VISIBLE_FACTS) say(`validated needs ${MIN_VISIBLE_FACTS} visible facts; has ${visible}`);
    if (fun < MIN_FUN_FACTS) say(`validated needs ${MIN_FUN_FACTS} fun facts; has ${fun}`);
    if (era.scene.description.length < MIN_SCENE_TEXT_CHARS) say('scene.description is too short to paint from');
    if (era.scene.surroundings.length < MIN_SCENE_TEXT_CHARS) say('scene.surroundings is too short to paint from');
    if (era.guideGrounding.roles.length < MIN_ROLES) say(`validated needs ${MIN_ROLES} guide roles; has ${era.guideGrounding.roles.length}`);
    for (const key of ['dress', 'speech', 'prices', 'transport'] as const) {
      if (!era.guideGrounding[key].trim()) say(`guideGrounding.${key} is empty`);
    }
    const modelImages = era.referenceImages.filter((image) => image.match !== 'context').length;
    if (modelImages < MIN_MODEL_IMAGES && !era.gaps.some((gap) => /image|photograph|engraving/i.test(gap))) {
      say(`has ${modelImages} same_view or nearby images; add more, or state in gaps which searches found none`);
    }
  }
  return problems;
}

/**
 * Check that landmark files and era files agree: every year of a landmark has a dossier, every
 * dossier belongs to a landmark, and a rejected dossier is listed as rejected.
 *
 * @param landmarks - Every landmark file.
 * @param eras - Every era dossier.
 * @returns Problems. Empty when the two sets agree.
 */
export function checkCrossReferences(landmarks: readonly LandmarkFile[], eras: readonly EraFile[]): string[] {
  const problems: string[] = [];
  const byId = new Map(landmarks.map((l) => [l.id, l]));
  const eraIds = new Set(eras.map((e) => e.eraId));
  for (const landmark of landmarks) {
    for (const year of landmark.eraYears) {
      if (!eraIds.has(eraIdOf(landmark.id, year))) problems.push(`${landmark.id}: no era file for ${year}`);
    }
  }
  for (const era of eras) {
    const landmark = byId.get(era.landmarkId);
    if (!landmark) {
      problems.push(`${era.eraId}: no landmark file for ${era.landmarkId}`);
      continue;
    }
    const offered = landmark.eraYears.includes(era.year);
    if (era.status === 'rejected') {
      if (offered) problems.push(`${era.eraId}: rejected, but ${era.year} is still in the landmark's eraYears`);
      if (!landmark.rejectedYears[String(era.year)]) problems.push(`${era.eraId}: rejected, but the landmark's rejectedYears does not say why`);
    } else if (!offered) {
      problems.push(`${era.eraId}: ${era.year} is not in the landmark's eraYears`);
    }
  }
  return problems;
}

/**
 * Read the pixel size of a JPEG from its bytes, without decoding it.
 *
 * Walks the marker segments to the first start-of-frame marker (SOF0 to SOF15, except the
 * non-frame markers C4, C8 and CC), which holds height then width as big-endian 16-bit numbers.
 *
 * @param bytes - The file contents.
 * @returns Width and height in pixels, or null when the bytes are not a readable JPEG.
 */
export function readJpegSize(bytes: Uint8Array): { widthPx: number; heightPx: number } | null {
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return null;
  let offset = 2;
  while (offset + 9 < bytes.length) {
    if (bytes[offset] !== 0xff) return null;
    const marker = bytes[offset + 1];
    // Fill bytes before a marker are legal.
    if (marker === 0xff) {
      offset += 1;
      continue;
    }
    const lengthBytes = (bytes[offset + 2] << 8) | bytes[offset + 3];
    const isFrame = marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
    if (isFrame) {
      return { heightPx: (bytes[offset + 5] << 8) | bytes[offset + 6], widthPx: (bytes[offset + 7] << 8) | bytes[offset + 8] };
    }
    if (lengthBytes < 2) return null;
    offset += 2 + lengthBytes;
  }
  return null;
}

/**
 * Check a reference photo file's bytes: a JPEG of exactly 1600x900 under the size limit.
 *
 * @param name - File name shown in the problem.
 * @param bytes - The file contents.
 * @returns Problems. Empty when the file passes.
 */
export function checkReferenceJpeg(name: string, bytes: Uint8Array): string[] {
  const size = readJpegSize(bytes);
  if (!size) return [`${name}: not a readable JPEG`];
  const problems: string[] = [];
  if (size.widthPx !== REFERENCE_WIDTH_PX || size.heightPx !== REFERENCE_HEIGHT_PX) {
    problems.push(`${name}: is ${size.widthPx}x${size.heightPx}; must be ${REFERENCE_WIDTH_PX}x${REFERENCE_HEIGHT_PX}`);
  }
  if (bytes.length > REFERENCE_MAX_BYTES) problems.push(`${name}: is ${Math.round(bytes.length / 1024)} KB; must be under ${REFERENCE_MAX_BYTES / 1024} KB`);
  return problems;
}
