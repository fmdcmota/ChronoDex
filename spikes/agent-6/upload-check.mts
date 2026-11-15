// Agent 6: why does fal storage upload fail? Free.
import { fal } from '@fal-ai/client';
import { readFileSync } from 'node:fs';
try {
  console.log(await fal.storage.upload(new Blob([new Uint8Array(readFileSync(process.argv[2]))], { type: 'image/jpeg' })));
} catch (e) { console.log('ERR', e, (e as { body?: unknown }).body, (e as { status?: unknown }).status); }
