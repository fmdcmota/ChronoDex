/**
 * HTTP helpers for serving stored media: Range parsing and ETag matching. Pure, unit tested.
 *
 * Owner: Agent 4 (Time Machine). Task A4-12, notebook/agent-4-panorama-plan.md section 3.1.
 * Why Range matters: iOS Safari will not play audio or video from a server that ignores `Range` and answers 200.
 */
import type { ByteRange } from './types';

/** Parsed `Range` header: a satisfiable range, `unsatisfiable` (answer 416), or null (ignore it, answer 200). */
export type RangeResult = ByteRange | 'unsatisfiable' | null;

/**
 * Parse a single-range `Range: bytes=...` header against a file size.
 *
 * Handles `bytes=a-b`, `bytes=a-` and the suffix form `bytes=-n`. A multi-range request (`bytes=0-1,5-6`) and
 * any other unit are ignored, which RFC 9110 allows: the whole file is served with 200.
 *
 * @param header - The header value, or null.
 * @param sizeBytes - File size.
 * @returns The inclusive range clamped to the file, `unsatisfiable`, or null.
 * @example parseRange('bytes=0-1', 100) // { start: 0, end: 1 }
 * @example parseRange('bytes=-10', 100) // { start: 90, end: 99 }
 */
export function parseRange(header: string | null, sizeBytes: number): RangeResult {
  if (!header) return null;
  const match = /^bytes=(\d*)-(\d*)$/i.exec(header.trim());
  if (!match) return null;
  const [, a, b] = match;
  if (a === '' && b === '') return null;
  if (sizeBytes === 0) return 'unsatisfiable';
  if (a === '') {
    const suffix = Number(b);
    if (suffix === 0) return 'unsatisfiable';
    return { start: Math.max(0, sizeBytes - suffix), end: sizeBytes - 1 };
  }
  const start = Number(a);
  if (start >= sizeBytes) return 'unsatisfiable';
  const end = b === '' ? sizeBytes - 1 : Math.min(Number(b), sizeBytes - 1);
  if (end < start) return null;
  return { start, end };
}

/**
 * Tell whether an `If-None-Match` header matches our ETag, so the answer can be 304.
 *
 * @param header - The header value, or null.
 * @param etag - Our ETag, quoted, for example `"0123abcd"`.
 * @returns True on `*` or any listed tag equal to ours, weak or strong.
 */
export function etagMatches(header: string | null, etag: string): boolean {
  if (!header) return false;
  return header.split(',').some((tag) => {
    const t = tag.trim().replace(/^W\//, '');
    return t === '*' || t === etag;
  });
}
