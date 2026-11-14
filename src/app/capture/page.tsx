/**
 * Route `/capture`: camera, location check and badge award (MASTER.md section 1.1).
 *
 * Owner: Agent 3 (Explorer). Created by Agent 1 as the M0 placeholder (task A1-06).
 * TODO(agent-3): A3-05 and A3-06 replace this with the real camera and location flow.
 */
import Link from 'next/link';

/**
 * Placeholder capture screen.
 *
 * @returns The page.
 */
export default function CapturePage() {
  return (
    <section className="space-y-4">
      <h1 className="text-xl font-bold">Capture (placeholder)</h1>
      <p>The camera, the 50 m check and the badge award go here.</p>
      <Link className="underline" href="/">
        Back to the map
      </Link>
    </section>
  );
}
