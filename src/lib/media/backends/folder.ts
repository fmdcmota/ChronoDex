/**
 * Folder media backend: each file as `<dir>/<id>.bin` with its ledger record beside it as `<id>.json`.
 *
 * Owner: Agent 4 (Time Machine). Task A4-11, notebook/agent-4-panorama-plan.md section 3.1.
 * Used when MONGODB_URI is not set (local development). The folder writes its own `.gitignore` (`*`) on first
 * use, so stored media never lands in a commit. Writes go to a temporary name and are renamed into place, so a
 * reader in another process (the dev server while the worker writes) never sees half a file.
 */
import { createReadStream } from 'node:fs';
import { mkdir, readFile, readdir, rename, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { Readable } from 'node:stream';
import type { ByteRange, MediaAsset, MediaBackend } from '../types';

/**
 * Create a backend on a local folder.
 *
 * Side effects: creates the folder and its `.gitignore` on the first write.
 *
 * @param dir - Folder path, absolute or relative to the working directory.
 * @returns The backend.
 */
export function createFolderBackend(dir: string): MediaBackend {
  const root = path.resolve(dir);
  const binPath = (id: string): string => path.join(root, `${id}.bin`);
  const jsonPath = (id: string): string => path.join(root, `${id}.json`);
  let prepared: Promise<void> | null = null;

  /** Create the folder and its .gitignore once. */
  function prepare(): Promise<void> {
    prepared ??= (async () => {
      await mkdir(root, { recursive: true });
      await writeFile(path.join(root, '.gitignore'), '*\n', { flag: 'w' });
    })();
    return prepared;
  }

  /** Write a file atomically: temporary name, then rename. */
  async function writeAtomic(file: string, data: Uint8Array | string): Promise<void> {
    const tmp = `${file}.${process.pid}.${Date.now()}.tmp`;
    await writeFile(tmp, data);
    await rename(tmp, file);
  }

  /** Read one ledger record, or null when it does not exist. */
  async function readRecord(id: string): Promise<MediaAsset | null> {
    try {
      return JSON.parse(await readFile(jsonPath(id), 'utf8')) as MediaAsset;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
      throw error;
    }
  }

  return {
    kind: 'folder',
    get: readRecord,
    async findBySourceUrl(sourceUrl) {
      let names: string[];
      try {
        names = await readdir(root);
      } catch {
        return null;
      }
      // A scan is fine: a demo holds tens of files, and the persist path downloads far more slowly than this reads.
      for (const name of names) {
        if (!name.endsWith('.json')) continue;
        const record = await readRecord(name.slice(0, -'.json'.length));
        if (record?.sourceUrl === sourceUrl) return record;
      }
      return null;
    },
    async put(asset, bytes) {
      await prepare();
      if (await readRecord(asset.id)) return;
      // Bytes first, record last: a record always points at a complete file.
      await writeAtomic(binPath(asset.id), bytes);
      await writeAtomic(jsonPath(asset.id), JSON.stringify(asset, null, 2));
    },
    async read(id, range?: ByteRange) {
      await stat(binPath(id));
      const stream = createReadStream(binPath(id), range ? { start: range.start, end: range.end } : undefined);
      return Readable.toWeb(stream) as ReadableStream<Uint8Array>;
    },
    async setFalUrl(id, falUrl, expiresAt) {
      const record = await readRecord(id);
      if (!record) return;
      await writeAtomic(jsonPath(id), JSON.stringify({ ...record, falUrl, falUrlExpiresAt: expiresAt }, null, 2));
    },
  };
}
