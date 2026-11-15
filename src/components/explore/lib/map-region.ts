/**
 * Picks which part of the world the map opens on, so Chronodex works in more than one city
 * (MASTER.md section 1.1, Map screen; Agent 3 task A3-04 follow-up).
 *
 * Owner: Agent 3 (Explorer).
 *
 * Why this exists: the map style and the OpenFreeMap tiles already cover the whole planet, so a
 * new city needs no generated map. What used to tie the screen to London was a hard-coded
 * bounding box and the rule "frame every landmark". With landmarks in London, Singapore and
 * Norway that frame would be the whole globe. Landmarks are therefore grouped into regions
 * (places within REGION_GAP_M of each other), and the map opens on one region.
 *
 * Pure functions, unit tested.
 */
import { haversineM, type LatLng } from '@/lib/contracts';

/** Landmarks closer than this to a region's members join that region. A city is well inside it. */
export const REGION_GAP_M = 30_000;

/** A group of landmarks that sit in the same city or area. */
export interface Region<T> {
  /** Members, in the order they were given. */
  items: T[];
}

/**
 * Group items into regions by single linkage: an item joins a region when it is within `gapM` of
 * any member, and regions that an item bridges are merged.
 *
 * @param items - Anything with a position.
 * @param position - Where an item is.
 * @param gapM - Maximum distance between neighbours in one region. Defaults to REGION_GAP_M.
 * @returns Regions, biggest first (ties keep input order). Empty for no items.
 */
export function groupIntoRegions<T>(
  items: readonly T[],
  position: (item: T) => LatLng,
  gapM: number = REGION_GAP_M,
): Region<T>[] {
  const regions: T[][] = [];
  for (const item of items) {
    const here = position(item);
    const touching = regions.filter((members) => members.some((m) => haversineM(position(m), here) <= gapM));
    const merged = [item];
    for (const region of touching) {
      merged.unshift(...region);
      regions.splice(regions.indexOf(region), 1);
    }
    regions.push(merged.sort((a, b) => items.indexOf(a) - items.indexOf(b)));
  }
  return regions
    .map((members) => ({ items: members }))
    .sort((a, b) => b.items.length - a.items.length || items.indexOf(a.items[0]!) - items.indexOf(b.items[0]!));
}

/**
 * Choose the region to open the map on: the one nearest the player when their position is
 * known, otherwise the biggest.
 *
 * @param regions - Output of groupIntoRegions.
 * @param position - Where an item is.
 * @param player - The player's position, or null before the first fix.
 * @returns The chosen region, or null when there are none.
 */
export function pickRegion<T>(
  regions: readonly Region<T>[],
  position: (item: T) => LatLng,
  player: LatLng | null,
): Region<T> | null {
  if (regions.length === 0) return null;
  if (!player) return regions[0]!;
  let best = regions[0]!;
  let bestM = Infinity;
  for (const region of regions) {
    for (const item of region.items) {
      const d = haversineM(position(item), player);
      if (d < bestM) {
        bestM = d;
        best = region;
      }
    }
  }
  return best;
}

/** Distance above which the map jumps to the player instead of flying (a flight would cross the globe). */
export const FLY_MAX_M = 50_000;

/**
 * Whether to animate the camera to a new centre. Animating a trans-continental hop makes the map
 * zoom out and back through tiles that were never loaded, so far moves jump instead.
 *
 * @param from - Current map centre.
 * @param to - Where the camera is going.
 * @returns True to fly, false to jump.
 */
export function shouldFly(from: LatLng, to: LatLng): boolean {
  return haversineM(from, to) <= FLY_MAX_M;
}
