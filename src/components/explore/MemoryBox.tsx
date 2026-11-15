/**
 * The memory box: a little pixel chest in a corner of the screen that keeps the photos the player
 * has taken. Tap it to open the keepsakes as a stack of polaroids.
 *
 * Owner: Agent 3 (Explorer). A Chronodex extra added at the human's request on 15 Nov 2026. The
 * photos live in the browser (lib/memory-box.ts), so they open offline and never expire.
 *
 * When a photo is added the chest does a stepped bounce (its `key` changes with the count, which
 * restarts the CSS animation) and its counter goes up.
 */
'use client';

import { useMemo, useState, useSyncExternalStore } from 'react';
import { getPlayerId } from '@/lib/client';
import { Sheet } from '@/components/ui';
import { formatCaptureDate } from './lib/dex-view';
import { parseMemoryBox, readMemoryBoxRaw, subscribeMemoryBox } from './lib/memory-box';

/**
 * Render the chest in the bottom-right corner, and the keepsakes sheet when it is open.
 *
 * @returns The chest button and, when open, the sheet.
 */
export function MemoryBox() {
  // Read straight from localStorage (null on the server and the first render, which keeps hydration
  // identical) and re-read whenever the box changes in this tab or another.
  const raw = useSyncExternalStore(subscribeMemoryBox, readMemoryBoxRaw, () => null);
  const entries = useMemo(() => (raw === null ? [] : parseMemoryBox(raw, getPlayerId())), [raw]);
  const [open, setOpen] = useState(false);
  const label = `Memory box, ${entries.length} ${entries.length === 1 ? 'photo' : 'photos'}`;
  return (
    <>
      <button type="button" className="memory-box" aria-label={label} onClick={() => setOpen(true)}>
        <span key={entries.length} className="memory-box-art">
          {/* eslint-disable-next-line @next/next/no-img-element -- pixel art must stay crisp; next/image would re-encode it */}
          <img src="/sprites/memory-box.png" alt="" />
        </span>
        {entries.length > 0 && <span className="memory-box-count">{entries.length}</span>}
      </button>
      {open && (
        <Sheet title="Memory box" onClose={() => setOpen(false)}>
          {entries.length === 0 ? (
            <p className="muted">The photos you take are kept here. Go and find a landmark!</p>
          ) : (
            <ul className="memory-grid">
              {entries.map((entry) => (
                <li key={entry.id} className="memory-card">
                  {/* eslint-disable-next-line @next/next/no-img-element -- a small data: picture kept in this browser */}
                  <img src={entry.thumb} alt={`Your photo of ${entry.landmarkName}`} />
                  <span className="memory-name">{entry.landmarkName}</span>
                  <span className="memory-date">{formatCaptureDate(new Date(entry.takenAtMs).toISOString())}</span>
                </li>
              ))}
            </ul>
          )}
        </Sheet>
      )}
    </>
  );
}
