/**
 * Route `/time/[landmarkId]`: the Time Machine (MASTER.md section 1.1).
 *
 * Owner: Agent 4 (Time Machine). Created by Agent 1 as the M0 placeholder (task A1-06): it lists
 * the eras, starts generation and polls the job, to prove the fake job in mock mode advances.
 * TODO(agent-4): A4-02 onwards replaces this with the year bar, 360° view and guide player.
 */
'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { GAME, type Era, type EraResponse } from '@/lib/contracts';
import { api } from '@/lib/client';

/**
 * Placeholder Time Machine: eras with their states, a generate button and live job stages.
 *
 * @returns The page.
 */
export default function TimeMachinePage() {
  const { landmarkId } = useParams<{ landmarkId: string }>();
  const [eras, setEras] = useState<Era[] | null>(null);
  const [selected, setSelected] = useState<EraResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.listEras(landmarkId).then(setEras, (err: Error) => setError(err.message));
  }, [landmarkId]);

  const select = useCallback((eraId: string) => {
    api.getEra(eraId).then(setSelected, (err: Error) => setError(err.message));
  }, []);

  // Poll while a job is active, as MASTER.md 4.3 says.
  const activeEraId = selected?.job ? selected.era.id : null;
  useEffect(() => {
    if (!activeEraId) return;
    const timer = setInterval(() => {
      api.getEra(activeEraId).then(setSelected, (err: Error) => setError(err.message));
    }, GAME.POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [activeEraId]);

  const generate = (includeVideo: boolean) => {
    if (!selected) return;
    api.generateEra(selected.era.id, includeVideo).then(setSelected, (err: Error) => setError(err.message));
  };

  return (
    <section className="space-y-4">
      <h1 className="text-xl font-bold">Time Machine: {landmarkId} (placeholder)</h1>
      {error && <p className="text-red-700">{error}</p>}
      <div className="flex flex-wrap gap-2">
        {eras?.map((era) => (
          <button key={era.id} className="border-2 border-foreground px-3 py-1" onClick={() => select(era.id)}>
            {era.year} · {era.state}
          </button>
        ))}
      </div>
      {selected && (
        <div className="space-y-2 border-2 border-foreground p-3">
          <p className="font-bold">{selected.era.title ?? `${selected.era.year}: not generated yet`}</p>
          <p className="text-sm">
            Core: {selected.era.state} · Video: {selected.era.videoState}
          </p>
          {selected.era.summary && <p className="text-sm">{selected.era.summary}</p>}
          <div className="flex gap-2">
            <button className="border-2 border-foreground px-3 py-1" onClick={() => generate(false)}>
              Generate core
            </button>
            <button className="border-2 border-foreground px-3 py-1" onClick={() => generate(true)}>
              Generate with video
            </button>
          </div>
          {selected.job && (
            <ol className="text-sm">
              {selected.job.stages.map((stage) => (
                <li key={stage.key}>
                  [{stage.state}] {stage.label}
                </li>
              ))}
            </ol>
          )}
          {selected.era.guide && (
            <Link className="underline" href={`/chat/${selected.era.id}`}>
              Chat with {selected.era.guide.name}
            </Link>
          )}
        </div>
      )}
    </section>
  );
}
