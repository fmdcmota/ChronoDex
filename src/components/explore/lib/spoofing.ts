/**
 * Whether the location-spoof tools are on: the "Spoof location" panel on the map, tap-the-map to move, and
 * "Use real GPS" on the capture screen.
 *
 * Owner: Agent 6 (demo), at the human's request (15 Nov 2026): spoofing is permanent so anyone, anywhere, can try the
 * demo cities from their own PC. It is on unless NEXT_PUBLIC_LOCATION_SPOOFING is "off" at build time, and it is
 * also on whenever NEXT_PUBLIC_DEV_TOOLS=1. The server side is ALLOW_SPOOFED_LOCATION (src/app/api/captures).
 */
export const LOCATION_SPOOFING: boolean =
  process.env.NEXT_PUBLIC_LOCATION_SPOOFING !== 'off' || process.env.NEXT_PUBLIC_DEV_TOOLS === '1';
