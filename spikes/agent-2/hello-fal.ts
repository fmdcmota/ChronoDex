/**
 * A2-01 "Hello fal" spike. Owner: Agent 2 (Studio). Implements MASTER.md section 11, task A2-01.
 *
 * Purpose: prove the fal key, the @fal-ai/client library and the result shape of
 * `google/nano-banana-2.1/edit` with one real call, and log how long it took.
 * Throwaway: never imported by src/. The real wrapper (runFal) comes in A2-07.
 *
 * Usage (from spikes/agent-2/):
 *   npm install
 *   copy .env.example to .env.local and set FAL_KEY
 *   put a street photo at input/test.jpg (any JPEG, ideally landscape)
 *   npm run hello                 -> uses input/test.jpg
 *   npm run hello -- path/to.jpg  -> uses another file
 *
 * External calls, each documented where made below:
 *   1. fal storage upload of the test photo (free).
 *   2. One request to google/nano-banana-2.1/edit at 1K (token-priced, roughly $0.04 to $0.15).
 *
 * Output: prints the request id, timings and the raw result; writes out/hello-result.json
 * and downloads the edited image to out/hello-edit.<ext>.
 */
import { fal } from '@fal-ai/client';
import { config as loadEnv } from 'dotenv';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { basename, extname } from 'node:path';

loadEnv({ path: '.env.local' });

/** Endpoint under test. In src/ this string may only live in src/lib/fal/models.ts (5.3 rule 3). */
const ENDPOINT = 'google/nano-banana-2.1/edit';

/** Default input photo, relative to this folder. */
const DEFAULT_INPUT_PATH = 'input/test.jpg';

/**
 * A deliberately simple edit so the spike tests plumbing, not prompt quality.
 * Prompt design for the real scene stage happens in A2-02.
 */
const HELLO_PROMPT =
  'Turn this street photo into the same street in the year 1900: horse-drawn carriages instead of cars, ' +
  'gas street lamps, people in Victorian clothing. Keep the exact same camera position and framing.';

/** Guess a MIME type from the file extension so fal storage serves the upload correctly. */
function mimeTypeOf(path: string): string {
  const ext = extname(path).toLowerCase();
  if (ext === '.png') return 'image/png';
  if (ext === '.webp') return 'image/webp';
  return 'image/jpeg';
}

/** Run the spike end to end. Exits the process with code 1 on any failure. */
async function main(): Promise<void> {
  if (!process.env.FAL_KEY) {
    throw new Error('FAL_KEY is not set. Put it in spikes/agent-2/.env.local (see .env.example).');
  }
  // The client also reads FAL_KEY by itself; setting it explicitly makes the dependency obvious.
  fal.config({ credentials: process.env.FAL_KEY });

  const inputPath = process.argv[2] ?? DEFAULT_INPUT_PATH;
  const bytes = await readFile(inputPath);
  console.log(`Input: ${inputPath} (${(bytes.length / 1024).toFixed(0)} KB)`);

  // External call 1: fal storage upload. Free. Returns a public CDN URL (kept at least 7 days, F-009).
  const uploadStartMs = Date.now();
  const blob = new Blob([bytes], { type: mimeTypeOf(inputPath) });
  const imageUrl = await fal.storage.upload(new File([blob], basename(inputPath), { type: blob.type }));
  const uploadMs = Date.now() - uploadStartMs;
  console.log(`Uploaded in ${uploadMs} ms: ${imageUrl}`);

  // External call 2: the edit. Spends credits. fal.subscribe submits to the queue and polls until done;
  // fine for a spike. On failure it throws an ApiError with the HTTP status and body.
  const editStartMs = Date.now();
  let firstUpdateMs: number | null = null;
  const result = await fal.subscribe(ENDPOINT, {
    input: {
      prompt: HELLO_PROMPT,
      image_urls: [imageUrl],
      aspect_ratio: '16:9',
      resolution: '1K',
      output_format: 'jpeg',
    },
    logs: true,
    onQueueUpdate: (update) => {
      if (firstUpdateMs === null) firstUpdateMs = Date.now() - editStartMs;
      console.log(`  [${((Date.now() - editStartMs) / 1000).toFixed(1)} s] ${update.status}`);
      if (update.status === 'IN_PROGRESS') {
        update.logs?.forEach((log) => console.log(`    ${log.message}`));
      }
    },
  });
  const editMs = Date.now() - editStartMs;

  console.log(`\nRequest id: ${result.requestId}`);
  console.log(`Edit took ${(editMs / 1000).toFixed(1)} s (first queue update after ${firstUpdateMs} ms)`);
  console.log('Result keys:', Object.keys(result.data as object));
  console.log(JSON.stringify(result.data, null, 2));

  await mkdir('out', { recursive: true });
  await writeFile(
    'out/hello-result.json',
    JSON.stringify({ endpoint: ENDPOINT, requestId: result.requestId, uploadMs, editMs, data: result.data }, null, 2),
  );

  const images = (result.data as { images?: { url: string; content_type?: string }[] }).images ?? [];
  if (images.length === 0) throw new Error('Result has no images: the documented output shape did not hold.');
  const response = await fetch(images[0].url);
  const ext = (images[0].content_type ?? 'image/jpeg').split('/')[1] ?? 'jpg';
  await writeFile(`out/hello-edit.${ext}`, Buffer.from(await response.arrayBuffer()));
  console.log(`\nSaved out/hello-edit.${ext}. Check the cost of request ${result.requestId} on the fal dashboard.`);
}

main().catch((error: unknown) => {
  console.error('A2-01 failed:', error);
  // ApiError from @fal-ai/client carries the response body, which names the bad field.
  const body = (error as { body?: unknown }).body;
  if (body) console.error('Body:', JSON.stringify(body, null, 2));
  process.exit(1);
});
