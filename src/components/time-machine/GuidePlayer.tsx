/**
 * The guide's appearance: the three video clips back to back, or the narration until they exist.
 *
 * Owner: Agent 4. Implements A4-04 (MASTER.md section 11, decision D-008, assumption A6).
 *
 * Two modes, picked from the Era:
 * - Video: `guideVideo.stitchedUrl` when present, otherwise `segments` in order through
 *   SegmentPlayer (two stacked videos, so no black flash between clips).
 * - Narration: `narrationAudioUrl` over the 360° view, which stays interactive underneath.
 * Captions come from `guide.script`, timed in proportion to length (no word timestamps yet). In video
 * mode they show only during the `talk` clip, since walk_on and walk_off are silent.
 * Playback starts from a tap ("Meet the guide"): browsers, iOS above all, refuse sound otherwise.
 */
'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { Era, Guide } from '@/lib/contracts';
import { buildCaptions, captionAt, type Caption } from './captions';
import { SegmentPlayer, type PlayableSegment } from './segmentPlayer';

/** Props for GuidePlayer. */
export interface GuidePlayerProps {
  era: Pick<Era, 'guideVideo' | 'narrationAudioUrl'> & { guide: Guide };
  /** Called when the guide has finished or the player skips. The screen then offers the chat. */
  onFinished: () => void;
}

/** What the player is doing. */
type Phase = 'ready' | 'playing' | 'done';

/**
 * Start button, then the guide video or narration with captions and a Skip button.
 *
 * Side effects: plays audio and video while mounted; stops everything on unmount.
 *
 * @param props - Component props.
 * @param props.era - The era's guide, video and narration.
 * @param props.onFinished - Called once when the guide is done or skipped.
 * @returns The player overlay.
 */
export function GuidePlayer({ era, onFinished }: GuidePlayerProps) {
  const { guide, guideVideo, narrationAudioUrl } = era;
  const [phase, setPhase] = useState<Phase>('ready');
  const [caption, setCaption] = useState<Caption | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const stage = useRef<HTMLDivElement | null>(null);
  const player = useRef<SegmentPlayer | null>(null);
  const audio = useRef<HTMLAudioElement | null>(null);

  const segments = useMemo<PlayableSegment[]>(() => {
    if (!guideVideo) return [];
    if (guideVideo.stitchedUrl) return [{ url: guideVideo.stitchedUrl, kind: 'stitched' }];
    return guideVideo.segments.map((s) => ({ url: s.url, kind: s.kind }));
  }, [guideVideo]);
  const hasVideo = segments.length > 0;
  const talkDurationS = guideVideo?.segments.find((s) => s.kind === 'talk')?.durationS ?? 0;

  // Build the video player as soon as there is somewhere to put it, so the first clip preloads.
  useEffect(() => {
    if (!hasVideo || !stage.current) return;
    const p = new SegmentPlayer(stage.current, segments, {
      onTimeUpdate: (_i, kind, timeS) => {
        // A stitched file has no separate talk clip: caption the whole thing.
        if (kind === 'talk' || kind === 'stitched') {
          const durationS = kind === 'talk' ? talkDurationS : 0;
          setCaption(durationS > 0 ? captionAt(buildCaptions(guide.script, durationS), timeS) : null);
        } else {
          setCaption(null);
        }
      },
      onFinished: () => finish(),
      onError: (_i, kind, message) => setProblem(`The ${kind.replace('_', ' ')} clip failed: ${message}`),
    });
    player.current = p;
    return () => {
      p.destroy();
      player.current = null;
    };
    // `finish` is stable for the life of a mount; listing it would rebuild the player.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasVideo, segments, guide.script, talkDurationS]);

  // Narration mode: one audio element, captions timed against its real duration.
  useEffect(() => {
    if (hasVideo || !narrationAudioUrl) return;
    const el = new Audio(narrationAudioUrl);
    el.preload = 'auto';
    let captions: Caption[] = [];
    el.addEventListener('loadedmetadata', () => {
      captions = Number.isFinite(el.duration) ? buildCaptions(guide.script, el.duration) : [];
    });
    el.addEventListener('timeupdate', () => setCaption(captionAt(captions, el.currentTime)));
    el.addEventListener('ended', () => finish());
    el.addEventListener('error', () => setProblem('The narration could not be played.'));
    audio.current = el;
    return () => {
      el.pause();
      el.removeAttribute('src');
      audio.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasVideo, narrationAudioUrl, guide.script]);

  function finish() {
    setPhase('done');
    setCaption(null);
    onFinished();
  }

  // Inside the tap: both paths need a user gesture for sound.
  const start = () => {
    setProblem(null);
    setPhase('playing');
    const p = player.current;
    const a = audio.current;
    const started = p ? p.play() : a ? a.play() : Promise.reject(new Error('nothing to play'));
    started.catch(() => {
      setPhase('ready');
      setProblem('Tap again to hear the guide. Your browser blocked the sound.');
    });
  };

  const skip = () => {
    player.current?.pause();
    audio.current?.pause();
    finish();
  };

  if (!hasVideo && !narrationAudioUrl) return null;

  return (
    <>
      {/* Video layer: covers the 360° view while the clips play. */}
      {hasVideo && (
        <div ref={stage} className={`absolute inset-0 z-20 bg-black ${phase === 'playing' ? '' : 'hidden'}`} />
      )}

      {phase === 'ready' && (
        <button
          type="button"
          onClick={start}
          className="absolute bottom-16 left-1/2 z-30 -translate-x-1/2 rounded-full bg-amber-400 px-5 py-3 text-sm font-bold text-black shadow-lg"
        >
          ▶ Meet {guide.name.split(' ')[0]}
        </button>
      )}

      {phase === 'playing' && (
        <>
          {caption && (
            <p className="absolute inset-x-3 bottom-14 z-30 mx-auto max-w-md rounded bg-black/70 px-3 py-1.5 text-center text-sm leading-snug text-white">
              {caption.text}
            </p>
          )}
          <button
            type="button"
            onClick={skip}
            className="absolute top-2 right-2 z-30 rounded-full bg-black/60 px-3 py-1.5 text-xs font-semibold text-white"
          >
            Skip ›
          </button>
        </>
      )}

      {problem && (
        <p role="alert" className="absolute inset-x-3 top-12 z-30 rounded bg-black/75 p-2 text-center text-xs text-white">
          {problem}
        </p>
      )}
    </>
  );
}
