/**
 * Route `/`: the Map, the main screen (MASTER.md section 1.1).
 *
 * Owner: Agent 3 (Explorer). Created by Agent 1 as the M0 placeholder (task A1-06): it lists the
 * landmarks from the typed client to prove mock mode works.
 * TODO(agent-3): A3-04 replaces this with the MapLibre game map.
 */
'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { Landmark } from '@/lib/contracts';
import { api, USE_MOCKS } from '@/lib/client';

/**
 * Placeholder map: a list of landmarks.
 *
 * @returns The page.
 */
export default function MapPage() {
  const [landmarks, setLandmarks] = useState<Landmark[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.listLandmarks().then(setLandmarks, (err: Error) => setError(err.message));
  }, []);

  return (
    <section className="space-y-4">
      <h1 className="text-xl font-bold">Map (placeholder)</h1>
      <p className="text-sm">Mock mode: {USE_MOCKS ? 'on' : 'off'}</p>
      {error && <p className="text-red-700">Could not load landmarks: {error}</p>}
      {!landmarks && !error && <p>Loading landmarks…</p>}
      <ul className="space-y-2">
        {landmarks?.map((landmark) => (
          <li key={landmark.id} className="border-2 border-foreground p-3">
            <p className="font-bold">
              {landmark.name} <span className="text-xs uppercase">({landmark.rarity})</span>
            </p>
            <p className="text-sm">{landmark.blurb}</p>
            <Link className="text-sm underline" href={`/time/${landmark.id}`}>
              Open Time Machine
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
