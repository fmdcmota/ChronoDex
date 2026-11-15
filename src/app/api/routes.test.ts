/**
 * Route tests: each handler of MASTER.md section 4.3 owned by Agent 1, called directly on the
 * in-memory backend. Owner: Agent 1.
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { NextRequest } from 'next/server';
import { CaptureResultSchema, EraSchema, LandmarkSchema, type CaptureResult } from '@/lib/contracts';
import { resetMemoryDb } from '@/lib/db';
import { resetMemoryJobs } from '@/lib/jobs';
import { landmarks } from '@fixtures/index';
import { POST as postCapture } from './captures/route';
import { GET as getEra } from './eras/[eraId]/route';
import { POST as generate } from './eras/[eraId]/generate/route';
import { GET as listLandmarks } from './landmarks/route';
import { GET as listEras } from './landmarks/[landmarkId]/eras/route';
import { GET as getDex } from './players/[playerId]/dex/route';
import { POST as chat } from './chat/route';

/** A JSON POST request. */
function post(body: unknown): NextRequest {
  return new Request('http://test.local/api', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  }) as NextRequest;
}

/** A route context with the given params. */
function ctx<P extends Record<string, string>>(params: P) {
  return { params: Promise.resolve(params) };
}

const GET_REQUEST = new Request('http://test.local/api') as NextRequest;
const queensTower = landmarks.find((l) => l.id === 'queens-tower')!;

beforeEach(() => {
  delete process.env.MONGODB_URI;
  resetMemoryDb();
  resetMemoryJobs();
});
afterEach(() => {
  delete process.env.ALLOW_SPOOFED_LOCATION;
  delete process.env.VIDEO_GENERATION;
});

describe('landmarks and eras', () => {
  it('GET /api/landmarks lists eleven valid landmarks and is not cached', async () => {
    const res = await listLandmarks();
    expect(res.status).toBe(200);
    expect(res.headers.get('cache-control')).toBe('no-store');
    const { landmarks: list } = await res.json();
    expect(list).toHaveLength(11);
    for (const l of list) LandmarkSchema.parse(l);
  });

  it('GET /api/landmarks/[id]/eras lists eras, 404s unknown, 400s malformed', async () => {
    const ok = await listEras(GET_REQUEST, ctx({ landmarkId: 'queens-tower' }));
    expect((await ok.json()).eras.map((e: { year: number }) => e.year)).toEqual([1893, 1962]);
    expect((await listEras(GET_REQUEST, ctx({ landmarkId: 'nowhere' }))).status).toBe(404);
    const bad = await listEras(GET_REQUEST, ctx({ landmarkId: 'Bad_Id' }));
    expect(bad.status).toBe(400);
    expect(await bad.json()).toMatchObject({ error: { code: 'bad_request' } });
  });

  it('GET /api/eras/[id] returns the era and no job', async () => {
    const res = await getEra(GET_REQUEST, ctx({ eraId: 'queens-tower_1893' }));
    const body = await res.json();
    EraSchema.parse(body.era);
    expect(body.job).toBeNull();
    expect((await getEra(GET_REQUEST, ctx({ eraId: 'queens-tower_1700' }))).status).toBe(404);
    expect((await getEra(GET_REQUEST, ctx({ eraId: 'nonsense' }))).status).toBe(400);
  });
});

describe('POST /api/eras/[id]/generate', () => {
  const era = { eraId: 'royal-albert-hall_1871' };

  it('creates one job, then returns it again, and GET shows it', async () => {
    const first = await (await generate(post({ includeVideo: false }), ctx(era))).json();
    expect(first.job.state).toBe('queued');
    const second = await (await generate(post({ includeVideo: false }), ctx(era))).json();
    expect(second.job.id).toBe(first.job.id);
    const polled = await (await getEra(GET_REQUEST, ctx(era))).json();
    expect(polled.job.id).toBe(first.job.id);
    expect(polled.era.state).toBe('queued');
  });

  it('403s video while VIDEO_GENERATION is off', async () => {
    const res = await generate(post({ includeVideo: true }), ctx(era));
    expect(res.status).toBe(403);
    expect(await res.json()).toMatchObject({ error: { code: 'video_disabled' } });
  });

  it('400s a bad body', async () => {
    expect((await generate(post({}), ctx(era))).status).toBe(400);
    expect((await generate(post('not json'), ctx(era))).status).toBe(400);
  });
});

describe('POST /api/captures and the Dex', () => {
  const base = { playerId: 'player-1', photoUrl: 'https://cdn.example/p.jpg', accuracyM: 8 };

  /** Post a capture and parse the result. */
  async function capture(body: object): Promise<{ status: number; result: CaptureResult }> {
    const res = await postCapture(post(body));
    const result = await res.json();
    if (res.status === 200) CaptureResultSchema.parse(result);
    return { status: res.status, result };
  }

  it('collects at the photo spot, once, and shows it in the Dex', async () => {
    const first = await capture({ ...base, location: queensTower.photoSpot });
    expect(first.result).toMatchObject({ ok: true, alreadyCollected: false, landmark: { id: 'queens-tower' } });
    const second = await capture({ ...base, location: queensTower.photoSpot });
    expect(second.result).toMatchObject({ ok: true, alreadyCollected: true });

    const dex = await (await getDex(GET_REQUEST, ctx({ playerId: 'player-1' }))).json();
    expect(dex.captures).toHaveLength(1);
    const empty = await (await getDex(GET_REQUEST, ctx({ playerId: 'someone-else' }))).json();
    expect(empty.captures).toEqual([]);
  });

  it('says too far, with the nearest landmark and its distance', async () => {
    const { result } = await capture({ ...base, location: { lat: 51.51, lng: -0.1768 } });
    expect(result).toMatchObject({ ok: false, reason: 'too_far' });
    if (!result.ok) expect(result.nearest!.distanceM).toBeGreaterThan(500);
  });

  it('reports a missing location or photo as results, not errors', async () => {
    expect((await capture({ ...base, location: null })).result).toEqual({ ok: false, reason: 'location_missing', nearest: null });
    expect((await capture({ ...base })).result).toMatchObject({ ok: false, reason: 'location_missing' });
    expect((await capture({ ...base, photoUrl: '', location: queensTower.photoSpot })).result).toMatchObject({ ok: false, reason: 'photo_missing' });
  });

  it('rejects non-web photo URLs and bad bodies', async () => {
    expect((await capture({ ...base, photoUrl: 'javascript:alert(1)', location: queensTower.photoSpot })).status).toBe(400);
    expect((await capture({ playerId: 'p' })).status).toBe(400);
  });

  it('refuses spoofed locations unless ALLOW_SPOOFED_LOCATION=1', async () => {
    const spoofed = { ...base, location: queensTower.photoSpot, spoofed: true };
    expect((await capture(spoofed)).status).toBe(403);
    process.env.ALLOW_SPOOFED_LOCATION = '1';
    expect((await capture(spoofed)).result).toMatchObject({ ok: true });
  });
});

describe('POST /api/chat, before the stream starts', () => {
  // Only the error paths: the streaming path would call Claude, which tests must never do.
  // Streaming itself is covered with a fake client in src/lib/chat/chat.test.ts.
  const hello = [{ role: 'player', text: 'Hello' }];

  it('400s a bad body or a history that does not end with the player', async () => {
    expect((await chat(post({ eraId: 'queens-tower_1893', playerId: 'p', messages: [] }))).status).toBe(400);
    const endsWithGuide = await chat(post({ eraId: 'queens-tower_1893', playerId: 'p', messages: [...hello, { role: 'guide', text: 'Yes?' }] }));
    expect(endsWithGuide.status).toBe(400);
  });

  it('404s an unknown era and 409s an era with no guide yet', async () => {
    expect((await chat(post({ eraId: 'queens-tower_1700', playerId: 'p', messages: hello }))).status).toBe(404);
    const notReady = await chat(post({ eraId: 'v-and-a_1941', playerId: 'p', messages: hello }));
    expect(notReady.status).toBe(409);
    expect(await notReady.json()).toMatchObject({ error: { code: 'era_not_ready' } });
  });
});
