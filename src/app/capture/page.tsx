'use client';

/**
 * Route `/capture`: camera, location check and badge award (MASTER.md section 1.1, task A3-06).
 *
 * Owner: Agent 3 (Explorer). Replaces the Agent 1 M0 placeholder.
 *
 * A client component because the camera, geolocation and sessionStorage are browser-only. The
 * screen itself is in src/components/explore/CaptureScreen.tsx.
 */
import CaptureScreen from '@/components/explore/CaptureScreen';

/**
 * The capture page.
 *
 * @returns The capture screen.
 */
export default function CapturePage() {
  return <CaptureScreen />;
}
