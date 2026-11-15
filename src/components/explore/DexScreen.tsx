/**
 * The Dex screen: a grid of badges, collected in colour with the player's photo and date, the rest
 * as silhouettes, with a progress count (MASTER.md section 1.1, tasks A3-07 and A3-08).
 *
 * Owner: Agent 3 (Explorer).
 *
 * Data: `api.listLandmarks()` and `api.getDex(playerId)`. The last good copy is kept in
 * localStorage (lib/dex-cache.ts). It is shown at once on open, replaced by the fresh copy when the
 * API answers, and kept on screen, marked "offline copy", when the API cannot be reached. Every
 * state has a screen: loading, error with retry, empty, offline, and normal.
 */
'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { api, getPlayerId } from '@/lib/client';
import type { Capture, Landmark } from '@/lib/contracts';
import { Button, Card, Spinner } from '@/components/ui';
import { describeApiFailure } from './lib/capture-messages';
import { MemoryBox } from './MemoryBox';
import { Sparks } from './Sparks';
import { clearJustCollected, peekJustCollected } from './lib/memory-box';
import { useUnavailableTimeMachines } from './lib/use-era-ready';
import { parseDexCache, readDexCacheRaw, saveDexCache } from './lib/dex-cache';
import {
  buildDexEntries,
  countCollected,
  formatCaptureDate,
  isShowablePhotoUrl,
  lockedBadgeUrl,
  type DexEntry,
} from './lib/dex-view';

/** Number of placeholder cards drawn while the first load is in progress. */
const SKELETON_CARDS = 6;

/** What the screen has to show, and whether it is the live copy. */
interface DexData {
  landmarks: Landmark[];
  captures: Capture[];
  /** True when this is the cached copy because the API could not be reached. */
  offline: boolean;
}

/** localStorage never notifies this tab of changes, and nothing else writes the cache while the Dex is open. */
const subscribeNever = (): (() => void) => () => undefined;

/** One badge card, collected or locked. */
function DexCard({ entry, noTimeMachine, isNew }: { entry: DexEntry; noTimeMachine: boolean; isNew: boolean }) {
  const { landmark, capture } = entry;
  const [photoBroken, setPhotoBroken] = useState(false);
  if (!capture) {
    return (
      <li>
        <div className="dex-card locked" aria-label={`${landmark.name}, not found yet`}>
          {/* eslint-disable-next-line @next/next/no-img-element -- pixel art must stay crisp; next/image would re-encode it */}
          <img className="dex-badge" src={lockedBadgeUrl(landmark.badgeUrl)} alt="" />
          <div className="dex-name">{landmark.name}</div>
          <span className="muted">Not found yet</span>
        </div>
      </li>
    );
  }
  const body = (
    <>
      {/* A badge collected a moment ago twirls and bursts sparks, once (the capture screen leaves a note). */}
      <span className="dex-badge-wrap">
        {isNew && <Sparks count={8} radiusPx={56} />}
        {/* eslint-disable-next-line @next/next/no-img-element -- pixel art must stay crisp; next/image would re-encode it */}
        <img className="dex-badge" src={landmark.badgeUrl} alt="" />
      </span>
      <div className="dex-name">{landmark.name}</div>
      <span className={`rarity rarity-${landmark.rarity}`}>{landmark.rarity.toUpperCase()}</span>
      {/* The player's own photo. A blob: address from an earlier visit may be gone, so hide it if it fails. */}
      {!photoBroken && isShowablePhotoUrl(capture.photoUrl) && (
        // eslint-disable-next-line @next/next/no-img-element -- the player's own photo at an arbitrary host
        <img
          className="dex-photo"
          src={capture.photoUrl}
          alt={`Your photo of ${landmark.name}`}
          loading="lazy"
          onError={() => setPhotoBroken(true)}
        />
      )}
      <span className="muted dex-date">{formatCaptureDate(capture.capturedAt)}</span>
      {noTimeMachine && <span className="muted dex-date">Time Machine coming soon</span>}
    </>
  );
  // No generated era to open yet: show the badge, but do not link into an empty Time Machine.
  if (noTimeMachine) {
    return (
      <li>
        <div className={isNew ? 'dex-card dex-card-new' : 'dex-card'} aria-label={`${landmark.name}, collected. Time Machine coming soon`}>
          {body}
        </div>
      </li>
    );
  }
  return (
    <li>
      <Link className={isNew ? 'dex-card dex-card-new' : 'dex-card'} href={`/time/${landmark.id}`} aria-label={`${landmark.name}, collected. Open the Time Machine`}>
        {body}
      </Link>
    </li>
  );
}

/**
 * The Dex page body.
 *
 * @returns The screen.
 */
export default function DexScreen() {
  /** The fresh copy from the API, once it has arrived. */
  const [fresh, setFresh] = useState<{ landmarks: Landmark[]; captures: Capture[] } | null>(null);
  /** The message of the last failed load, or null. */
  const [failure, setFailure] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  /** The badge to twirl, if the player came straight from a first-time capture. Read without removing it, so React's double render in development cannot lose it. */
  const [justCollected] = useState(() => peekJustCollected());
  /** Bumped by "Try again" to run the load effect once more. */
  const [attempt, setAttempt] = useState(0);

  // The last good copy, read straight from localStorage so the Dex is never blank on a slow
  // connection. `null` on the server and on the first render, which keeps hydration identical.
  const cachedRaw = useSyncExternalStore(subscribeNever, readDexCacheRaw, () => null);
  const cached = useMemo(
    () => (cachedRaw === null ? null : parseDexCache(cachedRaw, getPlayerId())),
    [cachedRaw],
  );

  // The twirl lasts about two seconds; after that the note is no longer needed.
  useEffect(() => {
    if (!justCollected) return;
    const timer = setTimeout(clearJustCollected, 4000);
    return () => clearTimeout(timer);
  }, [justCollected]);

  useEffect(() => {
    let alive = true;
    const playerId = getPlayerId();
    Promise.all([api.listLandmarks(), api.getDex(playerId)]).then(
      ([landmarks, captures]) => {
        if (!alive) return;
        setFresh({ landmarks, captures });
        setFailure(null);
        setLoading(false);
        saveDexCache({ playerId, savedAtMs: Date.now(), landmarks, captures });
      },
      (err: unknown) => {
        if (!alive) return;
        // Friendly wording only: the raw error text is for developers, not players.
        setFailure(describeApiFailure(err));
        setLoading(false);
      },
    );
    return () => {
      alive = false;
    };
  }, [attempt]);

  const retry = useCallback(() => {
    setFailure(null);
    setLoading(true);
    setAttempt((n) => n + 1);
  }, []);

  // Fresh data wins. Otherwise the cached copy, marked offline once a load has failed, so a failed
  // load never replaces what the player can already see with an error.
  const data: DexData | null = fresh
    ? { ...fresh, offline: false }
    : cached
      ? { landmarks: cached.landmarks, captures: cached.captures, offline: failure !== null }
      : null;
  const error = data ? null : failure;

  const entries = data ? buildDexEntries(data.landmarks, data.captures) : [];
  const collected = countCollected(entries);
  const total = entries.length;
  // Landmarks with no generated era yet get a badge but no link into an empty Time Machine (A3-r2-4).
  const landmarkIds = useMemo(() => (fresh?.landmarks ?? cached?.landmarks)?.map((l) => l.id), [fresh, cached]);
  const noTimeMachine = useUnavailableTimeMachines(landmarkIds);

  return (
    <main className="screen">
      <div className="screen-bar">
        <Button href="/" variant="quiet" size="small">
          ← Map
        </Button>
        {data?.offline && <span className="dex-offline">Offline copy</span>}
        <span className="chip" aria-live="polite">
          {data ? `${collected} / ${total}` : ''}
        </span>
      </div>

      <h1 className="screen-title">Dex</h1>

      {data && total > 0 && (
        <div
          className="dex-progress"
          role="progressbar"
          aria-label="Landmarks collected"
          aria-valuemin={0}
          aria-valuemax={total}
          aria-valuenow={collected}
        >
          <div className="dex-progress-fill" style={{ width: `${(collected / total) * 100}%` }} />
        </div>
      )}

      {!data && loading && (
        <ul className="dex-grid" aria-busy="true" aria-label="Loading the Dex">
          {Array.from({ length: SKELETON_CARDS }, (_, i) => (
            <li key={i}>
              <div className="dex-skeleton" />
            </li>
          ))}
        </ul>
      )}

      {!data && error && (
        <div className="dex-state">
          <Card title="Could not load the Dex">
            <p>{error}</p>
          </Card>
          <Button onClick={retry}>Try again</Button>
        </div>
      )}

      {data && total === 0 && (
        <div className="dex-state">
          <Card title="No landmarks yet">
            <p>There is nothing to collect right now. Check back soon.</p>
          </Card>
        </div>
      )}

      {data && total > 0 && collected === 0 && (
        <Card title="Your Dex is empty">
          <p>Go to a landmark, stand where the ring is on the map and take its picture to earn your first badge.</p>
          <Button href="/">Open the map</Button>
        </Card>
      )}

      {data && total > 0 && (
        <ul className="dex-grid">
          {entries.map((entry) => (
            <DexCard
              key={entry.landmark.id}
              entry={entry}
              noTimeMachine={noTimeMachine.has(entry.landmark.id)}
              isNew={entry.landmark.id === justCollected}
            />
          ))}
        </ul>
      )}

      {data && loading && (
        <div className="dex-state">
          <Spinner label="Refreshing" />
        </div>
      )}
      <MemoryBox />
    </main>
  );
}
