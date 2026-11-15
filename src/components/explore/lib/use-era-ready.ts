/**
 * React hook for era-ready.ts: which of these landmarks have no Time Machine yet.
 *
 * Owner: Agent 3 (Explorer), task A3-r2-4.
 */
'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/client';
import type { LandmarkId } from '@/lib/contracts';
import { fetchUnavailable } from './era-ready';

/** The empty set, shared so the hook returns a stable value until the first answer. */
const NONE: ReadonlySet<LandmarkId> = new Set();

/**
 * The landmarks whose Time Machine is not ready.
 *
 * Starts empty (everything looks available) and updates once the eras have been read, so a slow or
 * failing API never greys anything out.
 *
 * @param ids - Landmark ids to check, or undefined while they load. Pass a stable value: a new array
 *   on every render would read again every render.
 * @returns The unavailable ids.
 */
export function useUnavailableTimeMachines(ids: readonly LandmarkId[] | undefined): ReadonlySet<LandmarkId> {
  const [unavailable, setUnavailable] = useState<ReadonlySet<LandmarkId>>(NONE);
  const key = ids ? ids.join(',') : '';
  useEffect(() => {
    if (!key) return;
    let cancelled = false;
    void fetchUnavailable(key.split(','), (id) => api.listEras(id)).then((result) => {
      if (!cancelled) setUnavailable(result);
    });
    return () => {
      cancelled = true;
    };
  }, [key]);
  return unavailable;
}
