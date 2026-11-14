/**
 * Geometry for the map screen: the GPS accuracy ring around the player (MASTER.md task A3-05).
 * Owner: Agent 3.
 *
 * MapLibre's circle layer sizes circles in screen pixels, so a ring that must be a true
 * radius in metres is drawn as a polygon instead.
 */
import type { LatLng } from './contracts-copy';

/** Metres per degree of latitude, close enough everywhere at city scale. */
const M_PER_DEG_LAT = 111_320;
/** Corners in the ring polygon. 48 looks round at any zoom and costs nothing. */
const RING_STEPS = 48;

/** A GeoJSON polygon feature, typed narrowly so it needs no GeoJSON types package. */
export interface PolygonFeature {
  type: 'Feature';
  properties: Record<string, never>;
  geometry: { type: 'Polygon'; coordinates: Array<Array<[number, number]>> };
}

/**
 * Approximate a circle of `radiusM` around `centre` as a closed polygon.
 *
 * Uses a flat-earth offset, which is off by far less than a metre at radii below 1 km.
 *
 * @param centre - Centre of the circle.
 * @param radiusM - Radius in metres. Negative values are treated as 0.
 * @returns A GeoJSON Feature in [lng, lat] order, first and last point equal.
 */
export function circlePolygon(centre: LatLng, radiusM: number): PolygonFeature {
  const r = Math.max(0, radiusM);
  const dLat = r / M_PER_DEG_LAT;
  const dLng = r / (M_PER_DEG_LAT * Math.cos((centre.lat * Math.PI) / 180));
  const ring: Array<[number, number]> = [];
  for (let i = 0; i <= RING_STEPS; i++) {
    const t = ((i % RING_STEPS) / RING_STEPS) * 2 * Math.PI;
    ring.push([centre.lng + dLng * Math.sin(t), centre.lat + dLat * Math.cos(t)]);
  }
  return { type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [ring] } };
}
