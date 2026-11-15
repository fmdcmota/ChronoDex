/**
 * Tests for GET and HEAD /api/media/[mediaId] on the folder backend: 200, 206, 304, 400, 404, 416 and headers.
 *
 * Owner: Agent 4 (Time Machine). Task A4-12.
 */
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import type { NextRequest } from 'next/server';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { persistBytes } from '@/lib/media';
import { GET, HEAD } from './[mediaId]/route';

let dir: string;
let id: string;
const saved = { uri: process.env.MONGODB_URI, dir: process.env.MEDIA_DIR };

/** A request with the given headers. */
function req(headers: Record<string, string> = {}): NextRequest {
  return new Request('http://test.local/api/media/x', { headers }) as NextRequest;
}

/** Route context for an id. */
function ctx(mediaId: string) {
  return { params: Promise.resolve({ mediaId }) };
}

beforeAll(async () => {
  dir = await mkdtemp(path.join(tmpdir(), 'media-route-'));
  delete process.env.MONGODB_URI;
  process.env.MEDIA_DIR = dir;
  delete (globalThis as Record<string, unknown>).__chronodexMediaStore;
  ({ id } = await persistBytes(new TextEncoder().encode('0123456789'), { eraId: 'e_1', name: 'narration', contentType: 'audio/mpeg' }));
});

afterAll(async () => {
  delete (globalThis as Record<string, unknown>).__chronodexMediaStore;
  if (saved.uri) process.env.MONGODB_URI = saved.uri;
  if (saved.dir) process.env.MEDIA_DIR = saved.dir;
  else delete process.env.MEDIA_DIR;
  await rm(dir, { recursive: true, force: true });
});

describe('GET /api/media/[mediaId]', () => {
  it('serves the whole file with immutable caching', async () => {
    const res = await GET(req(), ctx(id));
    expect(res.status).toBe(200);
    expect(await res.text()).toBe('0123456789');
    expect(res.headers.get('content-type')).toBe('audio/mpeg');
    expect(res.headers.get('content-length')).toBe('10');
    expect(res.headers.get('cache-control')).toContain('immutable');
    expect(res.headers.get('etag')).toBe(`"${id}"`);
    expect(res.headers.get('accept-ranges')).toBe('bytes');
  });

  it('answers a range with 206 (iOS audio and video)', async () => {
    const res = await GET(req({ range: 'bytes=2-4' }), ctx(id));
    expect(res.status).toBe(206);
    expect(await res.text()).toBe('234');
    expect(res.headers.get('content-range')).toBe('bytes 2-4/10');
    expect(res.headers.get('content-length')).toBe('3');
    const probe = await GET(req({ range: 'bytes=0-1' }), ctx(id));
    expect(await probe.text()).toBe('01');
  });

  it('answers 416 past the end, 304 on a matching ETag', async () => {
    const past = await GET(req({ range: 'bytes=10-' }), ctx(id));
    expect(past.status).toBe(416);
    expect(past.headers.get('content-range')).toBe('bytes */10');
    expect((await GET(req({ 'if-none-match': `"${id}"` }), ctx(id))).status).toBe(304);
  });

  it('answers 400 for a malformed id and 404 for an unknown one', async () => {
    expect((await GET(req(), ctx('../etc'))).status).toBe(400);
    expect((await GET(req(), ctx('f'.repeat(32)))).status).toBe(404);
  });

  it('HEAD gives the headers and no body', async () => {
    const res = await HEAD(req(), ctx(id));
    expect(res.status).toBe(200);
    expect(res.headers.get('content-length')).toBe('10');
    expect(await res.text()).toBe('');
  });
});
