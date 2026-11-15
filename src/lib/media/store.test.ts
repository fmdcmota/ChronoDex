/**
 * Tests for the media store logic (store.ts), the folder backend and the Range helpers.
 *
 * Owner: Agent 4 (Time Machine). Task A4-11. No network, fal or database: fetch and the fal upload are fakes.
 */
import { mkdtemp, readFile, rm, writeFile, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createFolderBackend } from './backends/folder';
import { createMemoryBackend } from './backends/memory';
import { etagMatches, parseRange } from './range';
import {
  FAL_URL_ASSUMED_LIFETIME_MS,
  contentTypeFor,
  createMediaStore,
  isFalUrl,
  mediaIdFromUrl,
  type MediaStoreDeps,
} from './store';
import type { MediaBackend } from './types';

const FAL_PANO = 'https://v3.fal.media/files/lion/pano.jpg';
const T0 = new Date('2026-11-15T03:00:00Z');
const DAY_MS = 24 * 60 * 60 * 1000;

/** Read a web stream to text. */
async function text(stream: ReadableStream<Uint8Array>): Promise<string> {
  return new Response(stream).text();
}

/** A store over the given backend with a fake fetch serving `files` and a counting fal upload. */
function setup(backend: MediaBackend, publicDir = tmpdir()) {
  const files: Record<string, { body: string; type?: string }> = { [FAL_PANO]: { body: 'PANORAMA-BYTES', type: 'image/jpeg' } };
  let clock = T0;
  const fetchMock = vi.fn(async (input: string | URL | Request) => {
    const f = files[String(input)];
    if (!f) return new Response('nope', { status: 404 });
    return new Response(f.body, { headers: f.type ? { 'content-type': f.type } : {} });
  });
  let uploads = 0;
  const upload = vi.fn(async () => `https://v3.fal.media/files/up/${++uploads}.bin`);
  const deps: MediaStoreDeps = {
    backend,
    uploadToFal: upload,
    fetch: fetchMock as unknown as typeof fetch,
    now: () => clock,
    publicDir,
  };
  return { store: createMediaStore(deps), files, fetchMock, upload, setNow: (d: Date) => (clock = d) };
}

describe('url helpers', () => {
  it('recognises our media URLs, relative or absolute', () => {
    const id = 'a'.repeat(32);
    expect(mediaIdFromUrl(`/api/media/${id}`)).toBe(id);
    expect(mediaIdFromUrl(`https://x.trycloudflare.com/api/media/${id}?v=1`)).toBe(id);
    expect(mediaIdFromUrl('/api/media/nothex')).toBeNull();
    expect(mediaIdFromUrl(FAL_PANO)).toBeNull();
  });

  it('recognises fal hosts only', () => {
    expect(isFalUrl(FAL_PANO)).toBe(true);
    expect(isFalUrl('https://fal.media/x.png')).toBe(true);
    expect(isFalUrl('https://evilfal.media/x.png')).toBe(false);
    expect(isFalUrl('/reference/a.jpg')).toBe(false);
  });

  it('prefers a real content type header, else the extension', () => {
    expect(contentTypeFor('image/png; charset=binary', 'x.jpg')).toBe('image/png');
    expect(contentTypeFor('application/octet-stream', 'https://h/a/clip.mp4')).toBe('video/mp4');
    expect(contentTypeFor(null, '/reference/q.JPG')).toBe('image/jpeg');
    expect(contentTypeFor(null, 'noext')).toBe('application/octet-stream');
  });
});

describe('persistFromUrl', () => {
  it('downloads a fal file once, records it and returns a durable URL', async () => {
    const { store, fetchMock } = setup(createMemoryBackend());
    const a = await store.persistFromUrl(FAL_PANO, { eraId: 'queens-tower_1893', name: 'panorama' });
    expect(a.created).toBe(true);
    expect(a.url).toBe(`/api/media/${a.id}`);
    expect(a.asset).toMatchObject({
      eraId: 'queens-tower_1893',
      name: 'panorama',
      contentType: 'image/jpeg',
      bytes: 14,
      sourceUrl: FAL_PANO,
      falUrl: FAL_PANO,
      falUrlExpiresAt: new Date(T0.getTime() + FAL_URL_ASSUMED_LIFETIME_MS).toISOString(),
    });
    const again = await store.persistFromUrl(FAL_PANO, { eraId: 'queens-tower_1893', name: 'panorama' });
    expect(again).toMatchObject({ id: a.id, created: false });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('dedupes identical bytes from different URLs', async () => {
    const { store, files } = setup(createMemoryBackend());
    files['https://v3.fal.media/files/other.jpg'] = { body: 'PANORAMA-BYTES' };
    const a = await store.persistFromUrl(FAL_PANO, { eraId: 'e_1', name: 'panorama' });
    const b = await store.persistFromUrl('https://v3.fal.media/files/other.jpg', { eraId: 'e_2', name: 'scene' });
    expect(b).toMatchObject({ id: a.id, created: false });
  });

  it('returns our own URL unchanged and refuses an unknown id', async () => {
    const { store } = setup(createMemoryBackend());
    const a = await store.persistFromUrl(FAL_PANO, { eraId: 'e_1', name: 'panorama' });
    expect((await store.persistFromUrl(a.url, { eraId: 'e_1', name: 'x' })).id).toBe(a.id);
    await expect(store.persistFromUrl(`/api/media/${'0'.repeat(32)}`, { eraId: null, name: 'x' })).rejects.toThrow(/No stored media/);
  });

  it('records an unknown expiry when told to (old eras)', async () => {
    const { store } = setup(createMemoryBackend());
    const a = await store.persistFromUrl(FAL_PANO, { eraId: 'e_1', name: 'panorama', falUrlExpiresAt: null });
    expect(a.asset.falUrlExpiresAt).toBeNull();
  });

  it('fails clearly on a failed download, and stores nothing', async () => {
    const { store } = setup(createMemoryBackend());
    await expect(store.persistFromUrl('https://v3.fal.media/files/gone.jpg', { eraId: 'e', name: 'scene' })).rejects.toThrow(/HTTP 404/);
    await expect(store.persistFromUrl('data:image/png;base64,AA', { eraId: 'e', name: 'scene' })).rejects.toThrow(/not an http/);
  });

  it('reads a site path from the public folder and refuses to climb out of it', async () => {
    const pub = await mkdtemp(path.join(tmpdir(), 'pub-'));
    await mkdir(path.join(pub, 'reference'));
    await writeFile(path.join(pub, 'reference', 'q.jpg'), 'JPEGDATA');
    const { store } = setup(createMemoryBackend(), pub);
    const a = await store.persistFromUrl('/reference/q.jpg', { eraId: null, name: 'reference' });
    expect(a.asset).toMatchObject({ contentType: 'image/jpeg', bytes: 8, sourceUrl: '/reference/q.jpg', falUrl: null });
    await expect(store.persistFromUrl('/../secret.txt', { eraId: null, name: 'x' })).rejects.toThrow(/outside public/);
    await rm(pub, { recursive: true, force: true });
  });
});

describe('toFalUrl', () => {
  it('reuses a fresh fal copy and uploads again once it is close to expiry', async () => {
    const { store, upload, setNow } = setup(createMemoryBackend());
    const a = await store.persistFromUrl(FAL_PANO, { eraId: 'e_1', name: 'panorama' });
    expect(await store.toFalUrl(a.url)).toBe(FAL_PANO);
    expect(upload).not.toHaveBeenCalled();

    setNow(new Date(T0.getTime() + 5.5 * DAY_MS));
    const fresh = await store.toFalUrl(a.url);
    expect(fresh).toBe('https://v3.fal.media/files/up/1.bin');
    expect(upload).toHaveBeenCalledTimes(1);
    const blob = (upload.mock.calls[0] as unknown as [Blob])[0];
    expect(blob.type).toBe('image/jpeg');
    expect(await blob.text()).toBe('PANORAMA-BYTES');
    // The new copy is recorded, so the next call reuses it.
    expect(await store.toFalUrl(a.url)).toBe(fresh);
    expect(upload).toHaveBeenCalledTimes(1);
  });

  it('uploads a public reference photo once, and refuses an SVG', async () => {
    const pub = await mkdtemp(path.join(tmpdir(), 'pub-'));
    await writeFile(path.join(pub, 'ref.jpg'), 'JPEG');
    const { store, upload } = setup(createMemoryBackend(), pub);
    const first = await store.toFalUrl('/ref.jpg');
    expect(await store.toFalUrl('/ref.jpg')).toBe(first);
    expect(upload).toHaveBeenCalledTimes(1);
    await expect(store.toFalUrl('/mock/reference.svg')).rejects.toThrow(/SVG/);
    await rm(pub, { recursive: true, force: true });
  });

  it('passes other http URLs through unchanged', async () => {
    const { store } = setup(createMemoryBackend());
    expect(await store.toFalUrl('https://upload.wikimedia.org/a.jpg')).toBe('https://upload.wikimedia.org/a.jpg');
  });
});

describe('folder backend', () => {
  let dir: string;
  beforeEach(async () => {
    dir = path.join(await mkdtemp(path.join(tmpdir(), 'media-')), 'store');
  });
  afterEach(async () => {
    await rm(path.dirname(dir), { recursive: true, force: true });
  });

  it('stores, finds, reads ranges, records fal URLs, and ignores itself in git', async () => {
    const backend = createFolderBackend(dir);
    const { store } = setup(backend);
    const a = await store.persistFromUrl(FAL_PANO, { eraId: 'e_1', name: 'panorama' });
    expect(await readFile(path.join(dir, '.gitignore'), 'utf8')).toBe('*\n');
    expect((await backend.findBySourceUrl(FAL_PANO))?.id).toBe(a.id);
    expect(await text(await backend.read(a.id))).toBe('PANORAMA-BYTES');
    expect(await text(await backend.read(a.id, { start: 0, end: 7 }))).toBe('PANORAMA');
    await backend.setFalUrl(a.id, 'https://fal.media/new', '2030-01-01T00:00:00.000Z');
    expect((await backend.get(a.id))?.falUrl).toBe('https://fal.media/new');
    // A second backend on the same folder (another process) sees the same file.
    expect((await createFolderBackend(dir).get(a.id))?.bytes).toBe(14);
  });
});

describe('parseRange', () => {
  it('parses the three single-range forms', () => {
    expect(parseRange('bytes=0-1', 100)).toEqual({ start: 0, end: 1 });
    expect(parseRange('bytes=50-', 100)).toEqual({ start: 50, end: 99 });
    expect(parseRange('bytes=-10', 100)).toEqual({ start: 90, end: 99 });
    expect(parseRange('bytes=90-500', 100)).toEqual({ start: 90, end: 99 });
    expect(parseRange('bytes=-500', 100)).toEqual({ start: 0, end: 99 });
  });

  it('ignores what it does not support and flags what cannot be served', () => {
    expect(parseRange(null, 100)).toBeNull();
    expect(parseRange('bytes=0-1,5-6', 100)).toBeNull();
    expect(parseRange('items=0-1', 100)).toBeNull();
    expect(parseRange('bytes=5-2', 100)).toBeNull();
    expect(parseRange('bytes=100-', 100)).toBe('unsatisfiable');
    expect(parseRange('bytes=-0', 100)).toBe('unsatisfiable');
  });
});

describe('etagMatches', () => {
  it('matches strong, weak, listed and star', () => {
    expect(etagMatches('"abc"', '"abc"')).toBe(true);
    expect(etagMatches('W/"abc"', '"abc"')).toBe(true);
    expect(etagMatches('"x", "abc"', '"abc"')).toBe(true);
    expect(etagMatches('*', '"abc"')).toBe(true);
    expect(etagMatches('"x"', '"abc"')).toBe(false);
    expect(etagMatches(null, '"abc"')).toBe(false);
  });
});
