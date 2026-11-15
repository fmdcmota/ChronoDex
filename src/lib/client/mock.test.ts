/**
 * Unit tests for mock mode (MASTER.md 4.5). Owner: Agent 1.
 */
import { describe, expect, it } from 'vitest';
import { EraSchema, JobSchema, eraIdOf } from '@/lib/contracts';
import { HERO_ERA_ID, landmarks } from '@fixtures/index';
import { ApiError } from './errors';
import { MOCK_JOB_DURATION_MS, createMockApi } from './mock';

/** A mock API with a hand-driven clock and no delays. */
function setup() {
  let t = Date.parse('2026-11-14T16:00:00.000Z');
  const store = new Map<string, string>();
  const api = createMockApi({
    now: () => t,
    latencyMs: 0,
    chatWordDelayMs: 0,
    storage: { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => void store.set(k, v) },
  });
  return { api, advance: (ms: number) => (t += ms), store };
}

describe('mock API: landmarks and eras', () => {
  it('lists thirteen landmarks and one era per year', async () => {
    const { api } = setup();
    expect(await api.listLandmarks()).toHaveLength(13);
    const eras = await api.listEras('queens-tower');
    expect(eras.map((e) => e.year)).toEqual([1893, 1962]);
  });

  it('throws a 404 ApiError for unknown ids', async () => {
    const { api } = setup();
    await expect(api.listEras('nowhere')).rejects.toBeInstanceOf(ApiError);
    await expect(api.getEra('nowhere_1900')).rejects.toMatchObject({ status: 404, code: 'not_found' });
  });

  it('returns no job when nothing is missing', async () => {
    const { api } = setup();
    expect((await api.generateEra(HERO_ERA_ID, true)).job).toBeNull();
  });
});

describe('mock API: fake job', () => {
  it('advances through every stage and fills the era, then reports no job', async () => {
    const { api, advance } = setup();
    const eraId = eraIdOf('royal-albert-hall', 1871);

    const started = await api.generateEra(eraId, true);
    expect(started.job?.state).toBe('queued');
    expect(started.era.state).toBe('queued');
    JobSchema.parse(started.job);

    // Calling again returns the same job, not a second one.
    expect((await api.generateEra(eraId, true)).job?.id).toBe(started.job?.id);

    advance(MOCK_JOB_DURATION_MS * 0.2);
    const mid = await api.getEra(eraId);
    expect(mid.job?.state).toBe('running');
    expect(mid.era.state).toBe('generating');
    expect(mid.job?.stages.find((s) => s.key === 'brief')?.state).toBe('done');
    expect(mid.era.title).not.toBeNull();
    expect(mid.era.panorama).toBeNull();
    EraSchema.parse(mid.era);

    advance(MOCK_JOB_DURATION_MS * 0.4);
    const coreDone = await api.getEra(eraId);
    expect(coreDone.era.state).toBe('ready');
    expect(coreDone.era.panorama).not.toBeNull();
    expect(coreDone.era.videoState).toBe('generating');

    advance(MOCK_JOB_DURATION_MS);
    const end = await api.getEra(eraId);
    expect(end.job).toBeNull();
    expect(end.era.state).toBe('ready');
    expect(end.era.videoState).toBe('ready');
    expect(end.era.guideVideo?.segments).toHaveLength(3);
    expect(end.era.guideVideo?.stitchedUrl).toBeNull();
    EraSchema.parse(end.era);

    // The result sticks.
    expect((await api.listEras('royal-albert-hall'))[0].state).toBe('ready');
  });

  it('skips the core tier when only the video is missing', async () => {
    const { api, advance } = setup();
    const eraId = eraIdOf('v-and-a', 1941);
    await api.generateEra(eraId, false);
    advance(MOCK_JOB_DURATION_MS * 2);
    expect((await api.getEra(eraId)).era.videoState).toBe('missing');

    const video = await api.generateEra(eraId, true);
    expect(video.job?.stages.filter((s) => s.state === 'skipped').map((s) => s.key)).toEqual([
      'brief', 'scene', 'panorama', 'headshot', 'narration', 'stitch',
    ]);
    expect(video.era.state).toBe('ready');
  });
});

describe('mock API: captures', () => {
  const qt = landmarks.find((l) => l.id === 'queens-tower')!;

  it('collects a landmark at its photo spot, once, and lists it in the Dex', async () => {
    const { api } = setup();
    const body = { playerId: 'p1', photoUrl: 'blob:x', location: qt.photoSpot, accuracyM: 5 };
    const first = await api.postCapture(body);
    expect(first).toMatchObject({ ok: true, alreadyCollected: false, landmark: { id: 'queens-tower' } });
    const second = await api.postCapture(body);
    expect(second).toMatchObject({ ok: true, alreadyCollected: true });
    expect(await api.getDex('p1')).toHaveLength(1);
    expect(await api.getDex('someone-else')).toHaveLength(0);
  });

  it('persists captures in storage across instances that share it', async () => {
    const a = setup();
    await a.api.postCapture({ playerId: 'p1', photoUrl: 'blob:x', location: qt.photoSpot, accuracyM: 5 });
    const b = createMockApi({ latencyMs: 0, storage: { getItem: (k) => a.store.get(k) ?? null, setItem: () => {} } });
    expect(await b.getDex('p1')).toHaveLength(1);
  });

  it('reports too far with the nearest landmark, and missing location or photo', async () => {
    const { api } = setup();
    const far = await api.postCapture({ playerId: 'p', photoUrl: 'u', location: { lat: 51.51, lng: -0.1768 }, accuracyM: 5 });
    expect(far).toMatchObject({ ok: false, reason: 'too_far' });
    if (!far.ok) expect(far.nearest?.distanceM).toBeGreaterThan(500);
    expect(await api.postCapture({ playerId: 'p', photoUrl: 'u', location: null, accuracyM: 5 })).toEqual({
      ok: false,
      reason: 'location_missing',
      nearest: null,
    });
    expect(await api.postCapture({ playerId: 'p', photoUrl: '', location: qt.photoSpot, accuracyM: 5 })).toMatchObject({
      ok: false,
      reason: 'photo_missing',
    });
  });
});

describe('mock API: chat', () => {
  it('streams deltas that add up to the done text', async () => {
    const { api } = setup();
    let joined = '';
    let done = '';
    for await (const e of api.streamChat({ eraId: HERO_ERA_ID, playerId: 'p', messages: [{ role: 'player', text: 'Hi' }] })) {
      if (e.type === 'delta') joined += e.text;
      if (e.type === 'done') done = e.text;
    }
    expect(done.length).toBeGreaterThan(0);
    expect(joined).toBe(done);
  });

  it('sends an error event for an era with no guide', async () => {
    const { api } = setup();
    const out = [];
    for await (const e of api.streamChat({ eraId: eraIdOf('v-and-a', 1941), playerId: 'p', messages: [{ role: 'player', text: 'Hi' }] })) out.push(e);
    expect(out).toEqual([{ type: 'error', message: 'This era has no guide yet' }]);
  });
});
