/**
 * In-memory media backend. Tests only: everything is lost when the process ends.
 *
 * Owner: Agent 4 (Time Machine). Task A4-11, notebook/agent-4-panorama-plan.md section 3.1.
 */
import type { ByteRange, MediaAsset, MediaBackend } from '../types';

/**
 * Create an empty in-memory backend.
 *
 * @returns A backend holding records and bytes in two Maps. Records are copied in and out.
 */
export function createMemoryBackend(): MediaBackend {
  const assets = new Map<string, MediaAsset>();
  const files = new Map<string, Uint8Array>();
  return {
    kind: 'memory',
    async get(id) {
      const a = assets.get(id);
      return a ? { ...a } : null;
    },
    async findBySourceUrl(sourceUrl) {
      for (const a of assets.values()) if (a.sourceUrl === sourceUrl) return { ...a };
      return null;
    },
    async put(asset, bytes) {
      if (assets.has(asset.id)) return;
      files.set(asset.id, bytes.slice());
      assets.set(asset.id, { ...asset });
    },
    async read(id, range?: ByteRange) {
      const bytes = files.get(id);
      if (!bytes) throw new Error(`No media "${id}"`);
      const part = range ? bytes.slice(range.start, range.end + 1) : bytes.slice();
      return new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(part);
          controller.close();
        },
      });
    },
    async setFalUrl(id, falUrl, expiresAt) {
      const a = assets.get(id);
      if (a) assets.set(id, { ...a, falUrl, falUrlExpiresAt: expiresAt });
    },
  };
}
