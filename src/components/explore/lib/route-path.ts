/**
 * Maths for the voyage ducks that travel along fixed routes on the map (see ../duck-voyages.ts).
 *
 * Owner: Agent 3 (Explorer). Pure functions with unit tests, so the animation needs no browser to
 * be checked.
 */
import { haversineM, type LatLng } from '@/lib/contracts';

/** A point on a route, with which way it is heading. */
export interface RoutePoint {
  /** Position in degrees. */
  position: LatLng;
  /** +1 when heading east (longitude rising), -1 when west. Decides which way the duck faces. */
  eastward: 1 | -1;
}

/**
 * Length of each leg of a polyline.
 *
 * @param points - Route waypoints, at least two.
 * @returns Great-circle length in metres of each leg between consecutive waypoints.
 */
export function legLengthsM(points: readonly LatLng[]): number[] {
  const lengths: number[] = [];
  for (let i = 1; i < points.length; i++) lengths.push(haversineM(points[i - 1]!, points[i]!));
  return lengths;
}

/**
 * Where a traveller is after covering a fraction of a route, moving at a steady ground speed.
 * Legs are interpolated linearly in latitude and longitude, so a route needs enough waypoints to
 * follow its coast, desert track or wall; the fraction is measured along real distance, not by
 * waypoint, so the speed does not change at a bend.
 *
 * @param points - Route waypoints, at least two.
 * @param fraction - 0 for the start, 1 for the end. Values outside are clamped.
 * @returns The position and the east or west heading of the current leg.
 * @throws Error when fewer than two waypoints are given.
 */
export function positionAlong(points: readonly LatLng[], fraction: number): RoutePoint {
  if (points.length < 2) throw new Error('A route needs at least two waypoints');
  const lengths = legLengthsM(points);
  const total = lengths.reduce((sum, l) => sum + l, 0);
  let remaining = Math.min(1, Math.max(0, fraction)) * total;
  for (let i = 0; i < lengths.length; i++) {
    const length = lengths[i]!;
    if (remaining <= length || i === lengths.length - 1) {
      const t = length === 0 ? 0 : Math.min(1, remaining / length);
      const a = points[i]!;
      const b = points[i + 1]!;
      return {
        position: { lat: a.lat + (b.lat - a.lat) * t, lng: a.lng + (b.lng - a.lng) * t },
        eastward: b.lng >= a.lng ? 1 : -1,
      };
    }
    remaining -= length;
  }
  return { position: points[points.length - 1]!, eastward: 1 };
}

/**
 * How far along its route a one-way traveller is, when it walks the route, reappears at the start,
 * and walks it again for ever.
 *
 * @param timeS - Seconds since the start of the cycle (any number, it wraps).
 * @param legS - Seconds to travel the whole route.
 * @returns A fraction from 0 (at the start) up to but not including 1.
 */
export function loopFraction(timeS: number, legS: number): number {
  return (((timeS % legS) + legS) % legS) / legS;
}

/**
 * Opacity for a traveller that fades in at the start of its route and out at the end, so the
 * restart never shows a duck jumping across the map.
 *
 * @param fraction - Position along the route, 0 to 1.
 * @param margin - Share of the route spent fading at each end, for example 0.05.
 * @returns 0 at the very start and end, rising linearly to 1 and back.
 */
export function edgeFade(fraction: number, margin: number): number {
  if (margin <= 0) return 1;
  return Math.max(0, Math.min(1, fraction / margin, (1 - fraction) / margin));
}
