/**
 * Upload local files to fal storage and print their public URLs. Owner: Agent 2. Free (no model call).
 * Usage: npm run upload -- out/file1.jpg [out/file2.jpg ...]
 */
import { uploadFile, failAndExit } from './lib.js';

/** Upload each path given on the command line, one URL per line. */
async function main(): Promise<void> {
  for (const path of process.argv.slice(2)) console.log(`${path} -> ${await uploadFile(path)}`);
}

main().catch((error: unknown) => failAndExit('upload', error));
