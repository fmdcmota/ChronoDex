/**
 * Tests for POST /api/uploads. Owner: Agent 2 (Studio). Task A2-11. Mock mode makes uploadToFal return a
 * fixture URL, so nothing here touches fal.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { NextRequest } from 'next/server';
import { MOCK_REFERENCE_URL } from '@fixtures/index';
import { UPLOADS_PER_MINUTE, looksLikeJpeg } from './_lib/limits';
import { POST as upload } from './route';

/** Smallest bytes that start like a JPEG. */
const JPEG_BYTES = Uint8Array.from([0xff, 0xd8, 0xff, 0xe0, 0, 0x10, 0x4a, 0x46, 0x49, 0x46]);
let callerCounter = 0;

/** A multipart POST with an optional `file` field, from a fresh caller. */
function postFile(file: Blob | null, caller = `10.2.0.${++callerCounter}`): NextRequest {
  const form = new FormData();
  if (file) form.append('file', file, 'whatever.png');
  return new Request('http://test.local/api/uploads', { method: 'POST', headers: { 'x-forwarded-for': caller }, body: form }) as NextRequest;
}

beforeEach(() => vi.stubEnv('NEXT_PUBLIC_USE_MOCKS', '1'));
afterEach(() => vi.unstubAllEnvs());

describe('POST /api/uploads', () => {
  it('answers { url } for a JPEG, whatever the browser called it', async () => {
    const res = await upload(postFile(new Blob([JPEG_BYTES], { type: 'application/octet-stream' })));
    expect(res.status).toBe(200);
    expect(res.headers.get('cache-control')).toBe('no-store');
    expect(await res.json()).toEqual({ url: MOCK_REFERENCE_URL });
  });

  it('400s a missing or empty file and a body that is not a form', async () => {
    expect((await upload(postFile(null))).status).toBe(400);
    expect((await upload(postFile(new Blob([], { type: 'image/jpeg' })))).status).toBe(400);
    const notForm = new Request('http://test.local/api/uploads', { method: 'POST', body: 'plain', headers: { 'Content-Type': 'text/plain' } });
    expect((await upload(notForm as NextRequest)).status).toBe(400);
  });

  it('413s a photo over 4 MB', async () => {
    const big = new Uint8Array(4 * 1024 * 1024 + 1);
    big.set(JPEG_BYTES);
    expect((await upload(postFile(new Blob([big], { type: 'image/jpeg' })))).status).toBe(413);
  });

  it('415s anything that is not a JPEG, even when it claims to be one', async () => {
    const png = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    const res = await upload(postFile(new Blob([png], { type: 'image/jpeg' })));
    expect(res.status).toBe(415);
    expect((await res.json()).error.code).toBe('unsupported_type');
    expect((await upload(postFile(new Blob(['hello'], { type: 'text/plain' })))).status).toBe(415);
  });

  it('503s when there is no fal key and mocks are off', async () => {
    vi.stubEnv('NEXT_PUBLIC_USE_MOCKS', '');
    vi.stubEnv('FAL_KEY', '');
    const res = await upload(postFile(new Blob([JPEG_BYTES], { type: 'image/jpeg' })));
    expect(res.status).toBe(503);
    expect((await res.json()).error.code).toBe('voice_unavailable');
  });

  it('rate limits one caller after UPLOADS_PER_MINUTE photos', async () => {
    const caller = 'upload-spammer';
    for (let i = 0; i < UPLOADS_PER_MINUTE; i++) expect((await upload(postFile(new Blob([JPEG_BYTES]), caller))).status).toBe(200);
    const blocked = await upload(postFile(new Blob([JPEG_BYTES]), caller));
    expect(blocked.status).toBe(429);
    expect(blocked.headers.get('retry-after')).toBeTruthy();
    expect((await upload(postFile(new Blob([JPEG_BYTES]), 'someone-else'))).status).toBe(200);
  });

  it('looksLikeJpeg checks the file signature', () => {
    expect(looksLikeJpeg(JPEG_BYTES)).toBe(true);
    expect(looksLikeJpeg(Uint8Array.from([0x89, 0x50, 0x4e]))).toBe(false);
    expect(looksLikeJpeg(new Uint8Array([]))).toBe(false);
  });
});
