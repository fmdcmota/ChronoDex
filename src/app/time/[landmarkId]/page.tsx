/**
 * Route `/time/[landmarkId]`: the Time Machine (MASTER.md section 1.1).
 *
 * Owner: Agent 4. Implements A4-02. The screen itself is in src/components/time-machine/.
 * A client page reading params with useParams(), as Agent 1's M0 notes say (params are Promises).
 */
'use client';

import { useParams } from 'next/navigation';
import { TimeMachineScreen } from '@/components/time-machine/TimeMachineScreen';

/**
 * Read the landmark id from the URL and render the Time Machine.
 *
 * @returns The page.
 */
export default function TimeMachinePage() {
  const { landmarkId } = useParams<{ landmarkId: string }>();
  return <TimeMachineScreen landmarkId={landmarkId} />;
}
