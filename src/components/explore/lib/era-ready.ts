/**
 * Which landmarks have a Time Machine worth opening (task A3-r2-4, REMAINING_WORK_2.md).
 *
 * Owner: Agent 3 (Explorer).
 *
 * Why: opening the Time Machine for a landmark whose eras have not been generated shows an empty
 * screen (and, with a worker running, starts a paid job). For the demo the Map, the capture award
 * and the Dex say "Time Machine coming soon" for those landmarks instead of linking in. A landmark
 * has a Time Machine when at least one of its eras is `ready`.
 *
 * It fails open on purpose: if the eras cannot be read (network or server trouble), or the app is in
 * mock mode (where the Time Machine fakes a generation), nothing is marked unavailable, so a hiccup
 * never greys out the whole game.
 *
 * Pure parts are unit tested; the fetch takes the API function as an argument so tests need no network.
 */
import type { Era, LandmarkId } from '@/lib/contracts';

/** The result of reading one landmark's eras. `null` means the read failed. */
export interface EraLookup {
  id: LandmarkId;
  eras: readonly Era[] | null;
}

/**
 * Whether a landmark's eras include one the player can open.
 *
 * @param eras - The landmark's eras.
 * @returns True when at least one is `ready`.
 */
export function hasReadyEra(eras: readonly Era[]): boolean {
  return eras.some((era) => era.state === 'ready');
}

/**
 * The landmarks whose Time Machine is NOT ready.
 *
 * @param lookups - One per landmark. A failed lookup (`eras: null`) is not counted as unavailable.
 * @returns The ids with a successful lookup and no ready era.
 */
export function unavailableIds(lookups: readonly EraLookup[]): Set<LandmarkId> {
  const out = new Set<LandmarkId>();
  for (const { id, eras } of lookups) if (eras !== null && !hasReadyEra(eras)) out.add(id);
  return out;
}

/** How long a read is reused across screens, milliseconds. */
export const ERA_READY_TTL_MS = 30_000;

/** Reads reused across the Map, the capture screen and the Dex within a session. */
const cache = new Map<LandmarkId, { atMs: number; eras: readonly Era[] | null }>();

/**
 * Read the eras of many landmarks and work out which have no Time Machine yet.
 *
 * Side effects: one `GET /api/landmarks/<id>/eras` per landmark not read in the last
 * ERA_READY_TTL_MS (a few hundred bytes each).
 *
 * @param ids - Landmark ids to check.
 * @param listEras - The API call, `api.listEras` in the app.
 * @param nowMs - The current time, for the cache. Defaults to Date.now().
 * @returns The unavailable ids. Empty when mocks are on, for an empty list, and for lookups that failed.
 */
export async function fetchUnavailable(
  ids: readonly LandmarkId[],
  listEras: (id: LandmarkId) => Promise<Era[]>,
  nowMs: number = Date.now(),
): Promise<Set<LandmarkId>> {
  if (process.env.NEXT_PUBLIC_USE_MOCKS === '1') return new Set();
  const lookups = await Promise.all(
    ids.map(async (id): Promise<EraLookup> => {
      const hit = cache.get(id);
      if (hit && nowMs - hit.atMs < ERA_READY_TTL_MS) return { id, eras: hit.eras };
      let eras: readonly Era[] | null;
      try {
        eras = await listEras(id);
      } catch {
        eras = null;
      }
      cache.set(id, { atMs: nowMs, eras });
      return { id, eras };
    }),
  );
  return unavailableIds(lookups);
}

/** Forget every cached read. For tests. */
export function clearEraReadyCache(): void {
  cache.clear();
}
