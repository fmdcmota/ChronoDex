/**
 * `scripts/demo/stamp-urls.ts`: add a content version to every `/demo/...` URL in the kept Era files.
 *
 * Owner: Agent 6 (demo assets). Why: the app caches media for ever by URL (Agent 4's browser cache and immutable
 * HTTP caching), so a remade file under the same URL never reached anyone who had seen the old one (the Singapore
 * panorama seam fix, 15 Nov 2026). Each URL gets `?v=<first 10 hex of the file's SHA-256>`: a changed file gets a
 * new URL, an unchanged one keeps its URL and its cache. Next serves the file and ignores the query.
 *
 * Usage: npx tsx scripts/demo/stamp-urls.ts   (free, no keys). generate-demo.ts and generate-video.ts call it at
 * the end; run load-demo.ts afterwards to put the new URLs in the database.
 */
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { DEMO_ERA_IDS, demoEraFile } from './demo-set';

/** Hex characters of the hash kept in the URL. */
const VERSION_LENGTH = 10;

/**
 * Stamp every `/demo/...` URL in the demo Era files with the content hash of the file it names.
 *
 * @returns How many URLs changed.
 */
export function stampDemoUrls(): number {
  let changed = 0;
  for (const eraId of DEMO_ERA_IDS) {
    const file = demoEraFile(eraId);
    if (!existsSync(file)) continue;
    const text = readFileSync(file, 'utf8');
    const stamped = text.replace(/"(\/demo\/[^"?]+)(\?v=[0-9a-f]+)?"/g, (whole, url: string) => {
      const onDisk = path.join(process.cwd(), 'public', url);
      if (!existsSync(onDisk)) return whole;
      const next = `"${url}?v=${createHash('sha256').update(readFileSync(onDisk)).digest('hex').slice(0, VERSION_LENGTH)}"`;
      if (next !== whole) changed += 1;
      return next;
    });
    if (stamped !== text) writeFileSync(file, stamped);
  }
  return changed;
}

if (path.basename(process.argv[1] ?? '') === 'stamp-urls.ts') {
  console.log(`${stampDemoUrls()} URL(s) stamped.`);
}
