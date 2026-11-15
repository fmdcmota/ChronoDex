/** Debug probe: one free fal storage upload, printing the full error. Owner: Agent 2. Spike. */
import { fal } from '@fal-ai/client';
import { readFileSync } from 'node:fs';
const bytes = readFileSync(process.argv[2] ?? 'public/demo/queens-tower_1962/headshot.jpg');
try {
  console.log(await fal.storage.upload(new Blob([bytes], { type: 'image/jpeg' })));
} catch (e) {
  const err = e as Error & { status?: number; body?: unknown };
  console.log('name', err.name, 'status', err.status, 'message', JSON.stringify(err.message), 'body', JSON.stringify(err.body)?.slice(0, 400));
}
