/**
 * Tests for the Time Machine readiness check (Agent 3).
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Era } from '@/lib/contracts';
import { clearEraReadyCache, ERA_READY_TTL_MS, fetchUnavailable, hasReadyEra, unavailableIds } from './era-ready';

const era = (state: Era['state']) => ({ state }) as Era;

afterEach(() => {
  clearEraReadyCache();
  vi.unstubAllEnvs();
});

describe('hasReadyEra', () => {
  it('needs at least one ready era', () => {
    expect(hasReadyEra([era('missing'), era('ready')])).toBe(true);
    expect(hasReadyEra([era('missing'), era('generating'), era('failed'), era('queued')])).toBe(false);
    expect(hasReadyEra([])).toBe(false);
  });
});

describe('unavailableIds', () => {
  it('lists landmarks with no ready era and ignores failed lookups', () => {
    const out = unavailableIds([
      { id: 'a', eras: [era('ready')] },
      { id: 'b', eras: [era('missing')] },
      { id: 'c', eras: null },
    ]);
    expect([...out]).toEqual(['b']);
  });
});

describe('fetchUnavailable', () => {
  it('asks for every landmark once and returns the unavailable ones', async () => {
    const listEras = vi.fn(async (id: string) => [era(id === 'a' ? 'ready' : 'missing')]);
    const out = await fetchUnavailable(['a', 'b'], listEras, 0);
    expect([...out]).toEqual(['b']);
    expect(listEras).toHaveBeenCalledTimes(2);
  });

  it('fails open: a rejected read marks nothing unavailable', async () => {
    const out = await fetchUnavailable(['a'], async () => {
      throw new Error('offline');
    }, 0);
    expect(out.size).toBe(0);
  });

  it('reuses a read inside the cache window and reads again after it', async () => {
    const listEras = vi.fn(async () => [era('missing')]);
    await fetchUnavailable(['a'], listEras, 1000);
    await fetchUnavailable(['a'], listEras, 1000 + ERA_READY_TTL_MS - 1);
    expect(listEras).toHaveBeenCalledTimes(1);
    await fetchUnavailable(['a'], listEras, 1000 + ERA_READY_TTL_MS);
    expect(listEras).toHaveBeenCalledTimes(2);
  });

  it('marks nothing unavailable in mock mode, without calling the API', async () => {
    vi.stubEnv('NEXT_PUBLIC_USE_MOCKS', '1');
    const listEras = vi.fn(async () => [era('missing')]);
    expect((await fetchUnavailable(['a'], listEras, 0)).size).toBe(0);
    expect(listEras).not.toHaveBeenCalled();
  });
});
