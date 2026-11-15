'use client';

/**
 * Route `/`: the Map, the main screen (MASTER.md section 1.1, task A3-04).
 *
 * Owner: Agent 3 (Explorer). Replaces the Agent 1 M0 placeholder.
 *
 * maplibre-gl needs the browser (DOM + a web worker), so the map is loaded with
 * `dynamic(..., { ssr: false })`: Next 16 only allows `ssr: false` from a Client Component, so
 * this page is a client component. During server render it shows the empty map shell; the real
 * map hydrates in the browser.
 */
import dynamic from 'next/dynamic';

/** The map screen, loaded only in the browser. */
const MapScreen = dynamic(() => import('@/components/explore/MapScreen'), {
  ssr: false,
  loading: () => <div className="map-root" />,
});

/**
 * The map page: a full-screen game map of the landmarks (London, Singapore, Oslo, Cambridge).
 *
 * @returns The page.
 */
export default function MapPage() {
  return <MapScreen />;
}
