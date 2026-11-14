/**
 * Route `/dex`: the grid of badges, collected and not (MASTER.md section 1.1).
 *
 * Owner: Agent 3 (Explorer). Created by Agent 1 as the M0 placeholder (task A1-06).
 * TODO(agent-3): A3-07 replaces this with the badge grid.
 */
'use client';

import { useEffect, useState } from 'react';
import type { Capture, Landmark } from '@/lib/contracts';
import { api, getPlayerId } from '@/lib/client';

/**
 * Placeholder Dex: every landmark with whether this player has collected it.
 *
 * @returns The page.
 */
export default function DexPage() {
  const [data, setData] = useState<{ landmarks: Landmark[]; captures: Capture[] } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([api.listLandmarks(), api.getDex(getPlayerId())]).then(
      ([landmarks, captures]) => setData({ landmarks, captures }),
      (err: Error) => setError(err.message),
    );
  }, []);

  return (
    <section className="space-y-4">
      <h1 className="text-xl font-bold">Dex (placeholder)</h1>
      {error && <p className="text-red-700">Could not load the Dex: {error}</p>}
      {!data && !error && <p>Loading…</p>}
      {data && (
        <>
          <p>
            {data.captures.length} of {data.landmarks.length} collected
          </p>
          <ul className="space-y-1">
            {data.landmarks.map((landmark) => (
              <li key={landmark.id}>
                {data.captures.some((c) => c.landmarkId === landmark.id) ? '★' : '☆'} {landmark.name}
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
