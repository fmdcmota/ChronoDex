/**
 * The Time Machine: pick a year, look around the place as it was, meet the guide, then chat.
 *
 * Owner: Agent 4. Implements A4-02 (MASTER.md sections 1.2 part 2 and 11), assembling A4-03
 * (PanoramaView), A4-04 (GuidePlayer) and A4-05 (ProgressSheet).
 *
 * Data: `api.listLandmarks` for the name, `api.listEras` for the year bar, then
 * `api.getEra` for the chosen year, polled every GAME.POLL_INTERVAL_MS while a job is active
 * (section 4.3). Generation, which costs money in real mode:
 * - A missing or failed era asks for the core tier once when first selected (spec step 6:
 *   "loaded if they already exist, otherwise generated").
 * - It never asks for the video tier (round 3, V3 in REMAINING_WORK_2.md): with VIDEO_GENERATION=on that would
 *   spend about $4.25 on every ready era a player happens to open. Guide videos are made on purpose, one era at a
 *   time, by the runbook (scripts/pregenerate.ts --video). While such a job runs this screen polls it like any
 *   other, and the clips replace the preview as soon as `guideVideo` lands.
 * Both calls are safe to repeat (the endpoint returns the active job), but each runs at most once per
 * era per visit, so a failing era is not retried in a loop. "Try again" retries by hand.
 * Period ambience (./useAmbience.ts) plays for the selected year and drops while the guide speaks.
 * A4-14: a ready era seen before is shown at once from its localStorage snapshot (./eraSnapshot.ts) while the
 * server answers; its panorama and scene come from Cache Storage (./mediaCache.ts); the landmark's other ready
 * years are prefetched in the background so switching year is instant.
 */
'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { GAME, type Era, type EraId, type EraResponse, type Landmark, type LandmarkId } from '@/lib/contracts';
import { api } from '@/lib/client';
import { GuidePlayer, guideVideoKey } from './GuidePlayer';
import { PanoramaView } from './PanoramaView';
import { ProgressSheet } from './ProgressSheet';
import { SourcesDrawer } from './SourcesDrawer';
import { ThenNowSlider } from './ThenNowSlider';
import { hasSourceNotes } from './sources';
import { YearBar } from './YearBar';
import { AmbienceToggle } from './AmbienceToggle';
import { useAmbience } from './useAmbience';
import { ambienceMode } from './ambience';
import { loadEraSnapshot, saveEraSnapshot } from './eraSnapshot';
import { prefetchMedia, useCachedMediaUrl } from './mediaCache';
import { BTN_PRIMARY, BTN_SECONDARY_SMALL, PANEL_DARK, PIXEL_FONT } from './pixel';

/** Props for TimeMachineScreen. */
export interface TimeMachineScreenProps {
  landmarkId: LandmarkId;
}

/** Wait this long after the year list arrives before prefetching other years, so the chosen year loads first. */
const PREFETCH_DELAY_MS = 1500;

/** How often the elapsed seconds in the progress sheet tick. */
const CLOCK_TICK_MS = 1000;

/**
 * Pick the era to open first: the oldest ready one, else the oldest.
 *
 * @param eras - The landmark's eras, ascending by year.
 * @returns The era id, or null when there are none.
 */
export function defaultEraId(eras: Pick<Era, 'id' | 'state'>[]): EraId | null {
  return (eras.find((e) => e.state === 'ready') ?? eras[0])?.id ?? null;
}

/**
 * Full-screen Time Machine for one landmark.
 *
 * Side effects: network calls through `api`, including generation requests (see the file header).
 *
 * @param props - Component props.
 * @param props.landmarkId - The landmark, from the route.
 * @returns The screen.
 */
export function TimeMachineScreen({ landmarkId }: TimeMachineScreenProps) {
  const [landmark, setLandmark] = useState<Landmark | null>(null);
  const [eras, setEras] = useState<Era[] | null>(null);
  const [selectedId, setSelectedId] = useState<EraId | null>(null);
  const [current, setCurrent] = useState<EraResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [guideDone, setGuideDone] = useState(false);
  /** A4-06: the then/now slider is open. */
  const [comparing, setComparing] = useState(false);
  /** A4-09: the sources drawer is open. */
  const [showSources, setShowSources] = useState(false);
  const [nowMs, setNowMs] = useState(() => Date.now());
  /** The guide video or narration is playing: the ambience ducks. */
  const [guideSpeaking, setGuideSpeaking] = useState(false);
  /** `${eraId}:core` and `${eraId}:video` once asked for, so each is requested at most once. */
  const asked = useRef(new Set<string>());

  // Landmark and its eras.
  useEffect(() => {
    let live = true;
    Promise.all([api.listLandmarks(), api.listEras(landmarkId)])
      .then(([all, list]) => {
        if (!live) return;
        setLandmark(all.find((l) => l.id === landmarkId) ?? null);
        setEras(list);
        setSelectedId((id) => id ?? defaultEraId(list));
      })
      .catch((err: Error) => live && setError(err.message));
    return () => {
      live = false;
    };
  }, [landmarkId]);

  /** Store a fresh era response and mirror its state into the year bar. */
  const accept = useCallback((res: EraResponse) => {
    saveEraSnapshot(res);
    setCurrent(res);
    setEras((list) => list?.map((e) => (e.id === res.era.id ? res.era : e)) ?? list);
  }, []);

  /** Ask for a tier once per era per visit. */
  const requestTier = useCallback(
    (eraId: EraId, includeVideo: boolean) => {
      const key = `${eraId}:${includeVideo ? 'video' : 'core'}`;
      if (asked.current.has(key)) return;
      asked.current.add(key);
      api.generateEra(eraId, includeVideo).then(accept, (err: Error) => {
        // A refused video tier is normal when VIDEO_GENERATION is off: the narration plays instead.
        if (!includeVideo) setError(err.message);
      });
    },
    [accept],
  );

  // Load the chosen era.
  useEffect(() => {
    if (!selectedId) return;
    let live = true;
    api.getEra(selectedId).then(
      (res) => live && accept(res),
      (err: Error) => live && setError(err.message),
    );
    return () => {
      live = false;
    };
  }, [selectedId, accept]);

  /** The era as the server last said. Generation and polling act on this only. */
  const liveEra = current?.era.id === selectedId ? current.era : null;
  /** A4-14: the kept copy from an earlier visit, shown until the server answers. */
  const snapshot = useMemo(() => (selectedId ? loadEraSnapshot(selectedId) : null), [selectedId]);
  const era = liveEra ?? snapshot;
  // From the year bar, not the loaded era, so the loop does not stop and restart while a year loads.
  const selectedYear = eras?.find((e) => e.id === selectedId)?.year ?? null;
  const ambience = useAmbience(selectedYear, ambienceMode(guideSpeaking), 'time-machine');
  const job = current?.era.id === selectedId ? current.job : null;

  // Generate what is missing, once. Never from a snapshot: only the server's answer can start spending.
  useEffect(() => {
    if (!liveEra || job) return;
    if (liveEra.state === 'missing') requestTier(liveEra.id, false);
  }, [liveEra, job, requestTier]);

  // A4-14: fetch the other ready years' pictures in the background, once the list is known.
  const prefetchKey = eras
    ?.filter((e) => e.state === 'ready')
    .map((e) => e.id)
    .join(',');
  useEffect(() => {
    if (!eras || !prefetchKey) return;
    const timer = setTimeout(() => {
      const others = eras.filter((e) => e.state === 'ready' && e.id !== selectedId);
      void prefetchMedia(others.flatMap((e) => [e.panorama?.url, e.sceneImageUrl]));
    }, PREFETCH_DELAY_MS);
    return () => clearTimeout(timer);
    // Only when the set of ready years changes, not on every year tap.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefetchKey]);

  // A4-14: pictures through the browser cache. Null while resolving: the placeholder below shows meanwhile.
  const panoramaSrc = useCachedMediaUrl(era?.panorama?.url);
  const sceneSrc = useCachedMediaUrl(era?.sceneImageUrl);

  // Poll while a job is running.
  const pollId = job ? era?.id : null;
  useEffect(() => {
    if (!pollId) return;
    const timer = setInterval(() => {
      api.getEra(pollId).then(accept, (err: Error) => setError(err.message));
    }, GAME.POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [pollId, accept]);

  // Dev tools only (NEXT_PUBLIC_DEV_TOOLS=1): `window.chronodexDev.requestVideo()` asks for the video tier of the
  // open era, the way the runbook's script does, so the preview-to-clips swap (R3-4b, V6) can be watched with
  // mocks. Never set in the demo build, so it can never spend.
  useEffect(() => {
    if (process.env.NEXT_PUBLIC_DEV_TOOLS !== '1' || !liveEra) return;
    const eraId = liveEra.id;
    const w = window as unknown as { chronodexDev?: { requestVideo: () => Promise<void> } };
    w.chronodexDev = { requestVideo: () => api.generateEra(eraId, true).then(accept) };
    return () => {
      delete w.chronodexDev;
    };
  }, [liveEra, accept]);

  // Tick the elapsed time in the progress sheet.
  useEffect(() => {
    if (!job) return;
    const timer = setInterval(() => setNowMs(Date.now()), CLOCK_TICK_MS);
    return () => clearInterval(timer);
  }, [job]);

  /** Switch year. Resets per-era screen state here, not in an effect. */
  const selectEra = (eraId: EraId) => {
    if (eraId === selectedId) return;
    setSelectedId(eraId);
    setGuideDone(false);
    setGuideSpeaking(false);
    setComparing(false);
    setShowSources(false);
    setError(null);
  };

  const retry = () => {
    if (!era) return;
    asked.current.delete(`${era.id}:core`);
    setError(null);
    requestTier(era.id, false);
  };

  const guideName = era?.guide?.name.split(' ')[0];
  /** A4-06: the slider needs both images, and they share framing (section 5.1). */
  const canCompare = Boolean(era?.sceneImageUrl && landmark?.referencePhotoUrl);

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-(--ink) text-(--paper)">
      <header className="flex items-center gap-2 px-3 pt-[max(0.5rem,env(safe-area-inset-top))] pb-2">
        <Link href="/" className={`${PIXEL_FONT} px-1 text-4xl text-(--gold)`} aria-label="Back to the map">
          ‹
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className={`${PIXEL_FONT} truncate text-2xl text-(--gold)`}>{landmark?.name ?? 'Time Machine'}</h1>
          <p className="m-0! truncate text-xs text-(--paper)/70">{era?.title ?? (era ? `${era.year}` : 'Choose a year')}</p>
        </div>
        <AmbienceToggle muted={ambience.muted} onToggle={ambience.toggleMuted} />
        {era && hasSourceNotes(era) && (
          <button
            type="button"
            onClick={() => setShowSources(true)}
            aria-label="Sources and facts for this year"
            className={`${BTN_SECONDARY_SMALL} shrink-0`}
          >
            Sources
          </button>
        )}
        {canCompare && (
          <button
            type="button"
            onClick={() => setComparing(true)}
            className={`${BTN_SECONDARY_SMALL} shrink-0`}
          >
            Then/Now
          </button>
        )}
      </header>

      <main className="relative flex-1 overflow-hidden">
        {era?.panorama && panoramaSrc ? (
          <PanoramaView key={era.panorama.url} panorama={{ ...era.panorama, url: panoramaSrc }} className="absolute inset-0" />
        ) : era?.sceneImageUrl && sceneSrc ? (
          // The scene lands before the panorama: show it so there is something to look at.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={sceneSrc} alt={`${landmark?.name ?? 'The landmark'} in ${era.year}, AI reconstruction`} className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <div className={`${PIXEL_FONT} absolute inset-0 flex items-center justify-center text-8xl text-(--paper)/10`}>{era?.year ?? ''}</div>
        )}

        {era?.guide && (era.narrationAudioUrl || era.guideVideo) && !job?.stages.some((s) => s.state === 'running' && s.key === 'narration') && (
          <GuidePlayer
            // R3-4b: a new key when the clips land, so a preview in progress (or finished) gives way to a fresh
            // Meet button that plays the real video. Without it the player sat on a blank video layer.
            key={`${era.id}|${guideVideoKey(era.guideVideo)}`}
            era={{ ...era, guide: era.guide }}
            onFinished={() => setGuideDone(true)}
            onPlayingChange={setGuideSpeaking}
          />
        )}

        {job && (
          <div className="absolute inset-x-2 top-2 z-30 max-h-[70%] overflow-y-auto p-[3px]">
            <ProgressSheet key={job.id} job={job} nowMs={nowMs} startCollapsed={era?.state === 'ready'} />
          </div>
        )}

        {era?.state === 'failed' && !job && (
          <div className={`${PANEL_DARK} absolute inset-x-6 top-1/3 z-30 p-4 text-center`}>
            <p className="text-sm">This trip to {era.year} did not work.</p>
            <button type="button" onClick={retry} className={`${BTN_PRIMARY} mt-3`}>
              Try again
            </button>
          </div>
        )}

        {comparing && canCompare && era?.sceneImageUrl && landmark && (
          <ThenNowSlider
            thenUrl={era.sceneImageUrl}
            nowUrl={landmark.referencePhotoUrl}
            eraId={era.id}
            year={era.year}
            landmarkName={landmark.name}
            onClose={() => setComparing(false)}
          />
        )}

        {showSources && era && <SourcesDrawer era={era} onClose={() => setShowSources(false)} />}

        {error && (
          <p role="alert" className="absolute inset-x-3 bottom-3 z-30 m-0! bg-(--brick) p-2 text-center text-xs text-(--paper)">
            {error}
          </p>
        )}
      </main>

      {guideDone && era?.guide && (
        <Link
          href={`/chat/${era.id}`}
          className={`${BTN_PRIMARY} mx-3 mt-2 flex items-center gap-3 text-2xl`}
        >
          <span className="flex-1">Chat with {guideName}</span>
          <span aria-hidden>›</span>
        </Link>
      )}

      <div className="pb-[env(safe-area-inset-bottom)]">
        {eras && <YearBar eras={eras} selectedId={selectedId} onSelect={selectEra} />}
        {!eras && !error && <p className="m-0! px-3 py-3 text-sm text-(--paper)/70">Warming up the Time Machine…</p>}
      </div>
    </div>
  );
}
