/**
 * Shared helpers for Agent 2's fal spikes (A2-02 to A2-06). Owner: Agent 2 (Studio).
 * Throwaway, never imported by src/. The production wrapper is runFal in src/lib/fal/ (A2-07, MASTER.md 5.3).
 *
 * Every function that calls fal says so in its doc comment. Upload is free; model calls spend credits.
 */
import { fal } from '@fal-ai/client';
import { config as loadEnv } from 'dotenv';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { basename, extname } from 'node:path';

loadEnv({ path: '.env.local' });
if (!process.env.FAL_KEY) {
  throw new Error('FAL_KEY is not set. Put it in spikes/agent-2/.env.local (see .env.example).');
}
fal.config({ credentials: process.env.FAL_KEY });

/** Folder for generated files. Git-ignored. */
export const OUT_DIR = 'out';

/** One image as fal returns it. `file_size` came back null in A2-01. */
export interface FalImage {
  url: string;
  content_type?: string;
  width?: number;
  height?: number;
}

/** What a timed call returns: the raw data plus what the notebook needs. */
export interface TimedResult<T> {
  endpoint: string;
  requestId: string;
  elapsedMs: number;
  data: T;
}

/** Guess a MIME type from the file extension. */
function mimeTypeOf(path: string): string {
  const ext = extname(path).toLowerCase();
  if (ext === '.png') return 'image/png';
  if (ext === '.webp') return 'image/webp';
  if (ext === '.mp3') return 'audio/mpeg';
  if (ext === '.wav') return 'audio/wav';
  return 'image/jpeg';
}

/**
 * Upload a local file to fal storage. Free. Returns a public CDN URL kept at least 7 days (F-009).
 *
 * @param path - Local file path.
 * @returns Public URL of the uploaded file.
 */
export async function uploadFile(path: string): Promise<string> {
  const bytes = await readFile(path);
  const type = mimeTypeOf(path);
  return fal.storage.upload(new File([new Blob([bytes], { type })], basename(path), { type }));
}

/**
 * Call one fal endpoint through the queue and time it. Spends credits.
 *
 * @param label - Short name for log lines, for example "pro".
 * @param endpoint - fal endpoint id.
 * @param input - Model input, as in the model's llms.txt schema.
 * @returns Raw result data, request id and elapsed milliseconds.
 * @throws ApiError from @fal-ai/client on a rejected request. Its `body` names the bad field.
 */
export async function timedFal<T>(label: string, endpoint: string, input: Record<string, unknown>): Promise<TimedResult<T>> {
  const startMs = Date.now();
  let lastStatus = '';
  const result = await fal.subscribe(endpoint, {
    input,
    logs: true,
    onQueueUpdate: (update) => {
      // Log status changes only; A2-01 showed ~40 identical IN_PROGRESS lines per call.
      if (update.status !== lastStatus) {
        lastStatus = update.status;
        console.log(`  [${label} ${((Date.now() - startMs) / 1000).toFixed(1)} s] ${update.status}`);
      }
    },
  });
  const elapsedMs = Date.now() - startMs;
  console.log(`  [${label}] done in ${(elapsedMs / 1000).toFixed(1)} s, request ${result.requestId}`);
  return { endpoint, requestId: result.requestId, elapsedMs, data: result.data as T };
}

/**
 * Download a URL into OUT_DIR.
 *
 * @param url - Public URL, usually fal's CDN.
 * @param fileName - Name inside OUT_DIR.
 * @returns The local path written.
 */
export async function download(url: string, fileName: string): Promise<string> {
  await mkdir(OUT_DIR, { recursive: true });
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Download failed (${response.status}) for ${url}`);
  const path = `${OUT_DIR}/${fileName}`;
  await writeFile(path, Buffer.from(await response.arrayBuffer()));
  return path;
}

/**
 * Write a JSON record of a spike run into OUT_DIR, for copying figures into the notebook.
 *
 * @param fileName - Name inside OUT_DIR.
 * @param value - Anything JSON-serialisable.
 */
export async function writeRecord(fileName: string, value: unknown): Promise<void> {
  await mkdir(OUT_DIR, { recursive: true });
  await writeFile(`${OUT_DIR}/${fileName}`, JSON.stringify(value, null, 2));
}

/** Print an error, including the fal ApiError body when there is one, and exit 1. */
export function failAndExit(task: string, error: unknown): never {
  console.error(`${task} failed:`, error);
  const body = (error as { body?: unknown }).body;
  if (body) console.error('Body:', JSON.stringify(body, null, 2));
  process.exit(1);
}
