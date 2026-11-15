/**
 * Reader for the Archivist's data files in `data/` (AGENT5.md section 5), for the seed and the Historian.
 *
 * Owner: Agent 1 (Core). Implements the three asks in AGENT5.md section 10 addressed to Agent 1:
 * landmark geometry for the seed, research notes for the Historian, and era sources and period
 * images for the brief. Agent 5 (or whoever does its work) writes `data/`; this module only reads it.
 *
 * Deliberately lenient: the schemas below name only the fields this app uses and ignore the rest, so
 * a new field in the data files never breaks a seed or a brief. Strict validation of the files is
 * `scripts/data/validate.ts`'s job. A file that is missing or does not parse is skipped with a
 * warning, never fatal: the app then falls back to the fixtures and to the Historian's own search.
 *
 * Every function takes the data directory, defaulting to `<cwd>/data` or ARCHIVE_DIR, so tests use a
 * temporary folder and never read the real data.
 * Side effects: reads files. Writes nothing.
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { z } from 'zod';
import { LatLngSchema, SourceSchema, type Landmark, type Source } from '@/lib/contracts';

/**
 * Where `data/` lives unless a caller says otherwise. ARCHIVE_DIR overrides it, for tests and odd checkouts.
 *
 * @returns An absolute directory path.
 */
export function archiveDir(): string {
  return process.env.ARCHIVE_DIR || path.join(process.cwd(), 'data');
}

/** Most period images the pipeline should be given after the reference photo (AGENT5.md section 10). */
export const MAX_REFERENCE_IMAGES = 4;

/** The parts of `data/landmarks/<id>.json` this app reads. */
const LandmarkFileSchema = z.object({
  schemaVersion: z.literal(1),
  id: z.string().min(1),
  status: z.enum(['validated', 'partial', 'blocked']),
  subject: LatLngSchema,
  photoSpot: LatLngSchema,
  captureRadiusM: z.number().finite().positive(),
  eraYears: z.array(z.number().int()),
  referencePhoto: z.object({ status: z.enum(['h1_validated', 'commons_stand_in', 'missing']), file: z.string().nullable() }),
});

/** The parts of `data/eras/<eraId>.json` this app reads. */
const EraFileSchema = z.object({
  schemaVersion: z.literal(1),
  eraId: z.string().min(1),
  status: z.enum(['validated', 'thin_record', 'rejected']),
  sources: z.array(SourceSchema),
  referenceImages: z.array(z.object({ url: z.url(), match: z.enum(['same_view', 'nearby', 'context']) })),
});

/** What the seed takes from a landmark file. */
export interface LandmarkOverride {
  subject: Landmark['subject'];
  photoSpot: Landmark['photoSpot'];
  captureRadiusM: number;
  eraYears: number[];
  /** Absolute path of the 1600x900 reference JPEG, or null when there is none to use. */
  referencePhotoPath: string | null;
}

/** What the Historian takes from an era file. */
export interface EraDossier {
  sources: Source[];
  /** Direct URLs of the period images the image model may be given, best match first, at most MAX_REFERENCE_IMAGES. */
  referenceImageUrls: string[];
}

/**
 * Read and parse one JSON file against a schema, warning and returning null on any problem.
 *
 * @param file - Absolute path.
 * @param schema - What to check it against.
 * @returns The parsed value, or null when the file is missing or invalid.
 */
function readJsonFile<T>(file: string, schema: z.ZodType<T>): T | null {
  if (!existsSync(file)) return null;
  try {
    const parsed = schema.safeParse(JSON.parse(readFileSync(file, 'utf8')));
    if (parsed.success) return parsed.data;
    const issue = parsed.error.issues[0];
    console.warn(`archive: ${file} ignored: ${issue?.path.join('.') || 'file'}: ${issue?.message}`);
  } catch (err) {
    console.warn(`archive: ${file} ignored: ${err instanceof Error ? err.message : String(err)}`);
  }
  return null;
}

/**
 * Read every landmark file in `data/landmarks/`.
 *
 * A `blocked` file is skipped (the Archivist has not settled its geometry), as is any file whose
 * name does not match its `id`. Eras are never removed by this: the seed only adds.
 *
 * @param dir - The data directory. Defaults to archiveDir().
 * @returns Overrides keyed by landmark id. Empty when there is no `data/landmarks/` folder.
 */
export function readLandmarkOverrides(dir: string = archiveDir()): Map<string, LandmarkOverride> {
  const folder = path.join(dir, 'landmarks');
  const out = new Map<string, LandmarkOverride>();
  if (!existsSync(folder)) return out;
  for (const name of readdirSync(folder).filter((n) => n.endsWith('.json')).sort()) {
    const file = readJsonFile(path.join(folder, name), LandmarkFileSchema);
    if (!file) continue;
    if (file.id !== name.replace(/\.json$/, '')) {
      console.warn(`archive: landmarks/${name} ignored: its id is "${file.id}"`);
      continue;
    }
    if (file.status === 'blocked') continue;
    const photo = file.referencePhoto.status !== 'missing' && file.referencePhoto.file ? path.resolve(dir, '..', file.referencePhoto.file) : null;
    out.set(file.id, {
      subject: file.subject,
      photoSpot: file.photoSpot,
      captureRadiusM: file.captureRadiusM,
      eraYears: [...new Set(file.eraYears)].sort((a, b) => a - b),
      referencePhotoPath: photo && existsSync(photo) ? photo : null,
    });
  }
  return out;
}

/**
 * Apply an override to a fixture landmark. The fixture keeps what the Archivist does not own: name,
 * blurb, rarity and art.
 *
 * @param landmark - The fixture landmark.
 * @param override - From readLandmarkOverrides.
 * @param referencePhotoUrl - URL the app will serve the reference photo from, or null to keep the fixture's.
 * @returns A new landmark. The input is not modified.
 */
export function applyLandmarkOverride(landmark: Landmark, override: LandmarkOverride, referencePhotoUrl: string | null): Landmark {
  return {
    ...landmark,
    subject: override.subject,
    photoSpot: override.photoSpot,
    captureRadiusM: override.captureRadiusM,
    eraYears: override.eraYears.length > 0 ? override.eraYears : landmark.eraYears,
    referencePhotoUrl: referencePhotoUrl ?? landmark.referencePhotoUrl,
  };
}

/**
 * Read the research notes the Archivist wrote for an era, in the Historian's own notes format.
 *
 * @param eraId - For example "queens-tower_1893".
 * @param dir - The data directory. Defaults to archiveDir().
 * @returns The notes, or null when the file is missing or empty.
 */
export function readEraNotes(eraId: string, dir: string = archiveDir()): string | null {
  const file = path.join(dir, 'eras', `${eraId}.notes.txt`);
  if (!existsSync(file)) return null;
  const text = readFileSync(file, 'utf8').trim();
  return text ? text : null;
}

/**
 * Read an era dossier's sources and usable period images.
 *
 * A `rejected` era yields nothing. Images marked `context` are excluded: the place is wrong, so
 * they would mislead the image model (AGENT5.md section 5.3).
 *
 * @param eraId - For example "queens-tower_1893".
 * @param dir - The data directory. Defaults to archiveDir().
 * @returns The dossier, or null when there is no usable file.
 */
export function readEraDossier(eraId: string, dir: string = archiveDir()): EraDossier | null {
  const file = readJsonFile(path.join(dir, 'eras', `${eraId}.json`), EraFileSchema);
  if (!file || file.status === 'rejected' || file.eraId !== eraId) return null;
  const rank = { same_view: 0, nearby: 1, context: 2 } as const;
  const referenceImageUrls = file.referenceImages
    .filter((image) => image.match !== 'context')
    .sort((a, b) => rank[a.match] - rank[b.match])
    .map((image) => image.url)
    .slice(0, MAX_REFERENCE_IMAGES);
  return { sources: file.sources, referenceImageUrls };
}

/** Characters that end a URL in notes: whitespace, brackets, parentheses, angle brackets and quotes. */
const URL_PATTERN = /https?:\/\/[^\s[\]()<>"']+/g;

/**
 * Every http(s) URL in a block of text, without trailing punctuation or brackets, in first-seen order.
 *
 * The notes cite each claim as `[https://...]` and list images as `https://... (page: https://...)`,
 * so this is how the Historian learns which URLs the research "found".
 *
 * @param text - Research notes.
 * @returns Distinct URLs.
 */
export function urlsInNotes(text: string): string[] {
  const matches = text.match(URL_PATTERN) ?? [];
  return [...new Set(matches.map((url) => url.replace(/[.,;:]+$/, '')))];
}
