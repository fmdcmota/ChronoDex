/**
 * Reading and writing the Archivist's data files under `data/`.
 *
 * Owner: Agent 5 (Archivist). Implements the layout in AGENT5.md section 5.1, task A5-01.
 * Shared by ./validate.ts, ./build.ts and ./load.ts so the three agree on where files live.
 * Side effects: file reads, and file writes from the two `write` functions. No network.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { EraFileSchema, LandmarkFileSchema, type EraFile, type LandmarkFile } from './schema';

/** Absolute path of the repository's `data/` directory. */
export const DATA_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'data');
/** `data/landmarks/`: one JSON file per landmark. */
export const LANDMARKS_DIR = path.join(DATA_DIR, 'landmarks');
/** `data/eras/`: one JSON dossier and one notes file per landmark and year. */
export const ERAS_DIR = path.join(DATA_DIR, 'eras');
/** `data/reference/`: the 1600x900 present-day reference photos. */
export const REFERENCE_DIR = path.join(DATA_DIR, 'reference');
/** `data/ATTRIBUTION.md`: licence and author of every third-party file. */
export const ATTRIBUTION_PATH = path.join(DATA_DIR, 'ATTRIBUTION.md');

/** A data file that was read, with the problems found while parsing it. */
export interface Loaded<T> {
  /** File name without its directory, for example "queens-tower_1893.json". */
  name: string;
  /** The parsed file, or null when it is not valid JSON or fails the schema. */
  value: T | null;
  /** One line per parse or schema problem. */
  problems: string[];
}

/**
 * List the `.json` files in a directory, sorted by name.
 *
 * @param dir - Absolute directory path.
 * @returns File names. Empty when the directory does not exist.
 */
function jsonFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter((name) => name.endsWith('.json')).sort();
}

/**
 * Read one JSON file and check it against a schema.
 *
 * @param dir - Directory of the file.
 * @param name - File name.
 * @param parse - The schema's safeParse.
 * @returns The value, or the problems that stopped it parsing.
 */
function load<T>(
  dir: string,
  name: string,
  parse: (raw: unknown) => { success: true; data: T } | { success: false; error: { issues: { path: PropertyKey[]; message: string }[] } },
): Loaded<T> {
  let raw: unknown;
  try {
    raw = JSON.parse(fs.readFileSync(path.join(dir, name), 'utf8'));
  } catch (err) {
    return { name, value: null, problems: [`${name}: not valid JSON (${(err as Error).message})`] };
  }
  const result = parse(raw);
  if (result.success) return { name, value: result.data, problems: [] };
  return { name, value: null, problems: result.error.issues.map((issue) => `${name}: ${issue.path.join('.') || '(root)'}: ${issue.message}`) };
}

/**
 * Read every landmark file.
 *
 * @returns One entry per file in `data/landmarks/`, valid or not.
 */
export function readLandmarkFiles(): Loaded<LandmarkFile>[] {
  return jsonFiles(LANDMARKS_DIR).map((name) => load(LANDMARKS_DIR, name, (raw) => LandmarkFileSchema.safeParse(raw)));
}

/**
 * Read every era dossier.
 *
 * @returns One entry per `.json` file in `data/eras/`, valid or not.
 */
export function readEraFiles(): Loaded<EraFile>[] {
  return jsonFiles(ERAS_DIR).map((name) => load(ERAS_DIR, name, (raw) => EraFileSchema.safeParse(raw)));
}

/**
 * Read one era dossier by id.
 *
 * @param eraId - For example "queens-tower_1893".
 * @returns The entry, with a problem when the file does not exist.
 */
export function readEraFile(eraId: string): Loaded<EraFile> {
  const name = `${eraId}.json`;
  if (!fs.existsSync(path.join(ERAS_DIR, name))) return { name, value: null, problems: [`${name}: file not found in data/eras/`] };
  return load(ERAS_DIR, name, (raw) => EraFileSchema.safeParse(raw));
}

/**
 * Path of an era's research-notes file.
 *
 * @param eraId - The era id.
 * @returns Absolute path of `data/eras/<eraId>.notes.txt`.
 */
export function notesPath(eraId: string): string {
  return path.join(ERAS_DIR, `${eraId}.notes.txt`);
}

/**
 * Write a data file as UTF-8 JSON with two-space indentation and a final newline (AGENT5.md 5).
 *
 * @param filePath - Absolute path.
 * @param value - The file contents. Key order is kept as given.
 */
export function writeJson(filePath: string, value: unknown): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

/**
 * Write a text file with LF line endings, creating its directory.
 *
 * @param filePath - Absolute path.
 * @param text - The contents.
 */
export function writeText(filePath: string, text: string): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, text, 'utf8');
}

/**
 * Read a text file with line endings normalised to LF, because git on Windows may check files out
 * with CRLF (DEV_NOTEBOOK.md F-023) and a byte comparison would then fail for no real reason.
 *
 * @param filePath - Absolute path.
 * @returns The text, or null when the file does not exist.
 */
export function readText(filePath: string): string | null {
  if (!fs.existsSync(filePath)) return null;
  return fs.readFileSync(filePath, 'utf8').replace(/\r\n/g, '\n');
}
