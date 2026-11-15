/**
 * The guide's appearance: the three video clips back to back, or the narration until they exist.
 *
 * Owner: Agent 4. Implements A4-04 (MASTER.md section 11, decision D-008, assumption A6).
 *
 * Two modes, picked from the Era:
 * - Video: `guideVideo.stitchedUrl` when present, otherwise `segments` in order through
 *   SegmentPlayer (two stacked videos, so no black flash between clips).
 * - Narration: until the video exists, GuideStandIn plays a free preview of it: the guide's portrait walks on over
 *   the era's scene, the real `narrationAudioUrl` plays with captions, then the guide walks off.
 * Captions come from `guide.script`, timed in proportion to length (no word timestamps yet). In video
 * mode they show only during the `talk` clip, since walk_on and walk_off are silent.
 * Playback starts from a tap ("Meet the guide"): browsers, iOS above all, refuse sound otherwise.
 */
'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { Era, Guide } from '@/lib/contracts';
import { buildCaptions, captionAt, type Caption } from './captions';
import { SegmentPlayer, type PlayableSegment } from './segmentPlayer';
import { BTN_PRIMARY, BTN_SECONDARY } from './pixel';
import { useCachedMediaUrl } from './mediaCache';
import { GuideStandIn, type StandInStage } from './GuideStandIn';

/** Props for GuidePlayer. */
export interface GuidePlayerProps {
  era: Pick<Era, 'guideVideo' | 'narrationAudioUrl' | 'sceneImageUrl' | 'year'> & { guide: Guide };
  /** Called when the guide has finished or the player skips. The screen then offers the chat. */
  onFinished: () => void;
  /** Called with true when the guide starts and false when they stop, so the screen can lower the ambience. */
  onPlayingChange?: (playing: boolean) => void;
}

/** What the player is doing. */
type Phase = 'ready' | 'playing' | 'done';

/** Narration mode's preview: which part of the stand-in shows while playing, or null. */
type StandIn = StandInStage | null;

/**
 * Start button, then the guide video or narration with captions and a Skip button.
 *
 * Side effects: plays audio and video while mounted; stops everything on unmount.
 *
 * @param props - Component props.
 * @param props.era - The era's guide, video and narration.
 * @param props.onFinished - Called once when the guide is done or skipped.
 * @param props.onPlayingChange - Called with true on start and false on finish, skip or a blocked start.
 * @returns The player overlay.
 */
export function GuidePlayer({ era, onFinished, onPlayingChange }: GuidePlayerProps) {
  const { guide, guideVideo } = era;
  // A4-14: the narration (under 1 MB) is kept in Cache Storage; null while it resolves. Clips stream as before.
  const narrationAudioUrl = useCachedMediaUrl(era.narrationAudioUrl);
  const [phase, setPhase] = useState<Phase>('ready');
  const [caption, setCaption] = useState<Caption | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [standIn, setStandIn] = useState<StandIn>(null);
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
    // The guide walks off after speaking; finish() runs when they have left.
    el.addEventListener('ended', () => {
      setCaption(null);
      setStandIn('walk_off');
    });
    el.addEventListener('error', () => setProblem('The narration could not be played.'));
    audio.current = el;
    return () => {
      el.pause();
      el.removeAttribute('src');
      audio.current = null;
    };
  }, [hasVideo, narrationAudioUrl, guide.script]);

  function finish() {
    setPhase('done');
    setStandIn(null);
    setCaption(null);
    onPlayingChange?.(false);
    onFinished();
  }

  // Inside the tap: both paths need a user gesture for sound.
  const start = () => {
    setProblem(null);
    setPhase('playing');
    onPlayingChange?.(true);
    const p = player.current;
    const a = audio.current;
    let started: Promise<void>;
    if (p) started = p.play();
    else if (a) {
      // Narration: play inside the tap to unlock the element for iOS, then hold it until the guide has walked on.
      setStandIn('walk_on');
      started = a.play().then(() => {
        a.pause();
        a.currentTime = 0;
      });
    } else started = Promise.reject(new Error('nothing to play'));
    started.catch(() => {
      setStandIn(null);
      setPhase('ready');
      onPlayingChange?.(false);
      setProblem('Tap again to hear the guide. Your browser blocked the sound.');
    });
  };

  /** The guide has walked on: start speaking. The element was unlocked by the tap. */
  const arrived = () => {
    const a = audio.current;
    setStandIn('talk');
    a?.play().catch(() => setProblem('The narration could not be played.'));
  };

  const skip = () => {
    player.current?.pause();
    audio.current?.pause();
    finish();
  };

  if (!hasVideo && !era.narrationAudioUrl) return null;

  return (
    <>
      {/* Video layer: covers the 360° view while the clips play. */}
      {hasVideo && (
        <div ref={stage} className={`absolute inset-0 z-20 bg-(--ink) ${phase === 'playing' ? '' : 'hidden'}`} />
      )}

      {/* Narration mode: the free preview of the guide video. */}
      {!hasVideo && phase === 'playing' && standIn && (
        <GuideStandIn
          stage={standIn}
          name={guide.name}
          role={guide.role}
          headshotUrl={guide.headshotUrl}
          sceneUrl={era.sceneImageUrl}
          year={era.year}
          onArrived={arrived}
          onLeft={finish}
        />
      )}

      {phase === 'ready' && (
        <button
          type="button"
          onClick={start}
          className={`${BTN_PRIMARY} absolute bottom-16 left-1/2 z-30 -translate-x-1/2 whitespace-nowrap`}
        >
          ▶ Meet {guide.name.split(' ')[0]}
        </button>
      )}

      {phase === 'playing' && (
        <>
          {caption && (
            <p className="absolute inset-x-3 bottom-14 z-30 m-0! mx-auto! max-w-md bg-(--ink)/80 px-3 py-1.5 text-center text-sm leading-snug text-(--paper)">
              {caption.text}
            </p>
          )}
          <button
            type="button"
            onClick={skip}
            className={`${BTN_SECONDARY} absolute top-2 right-2 z-30`}
          >
            Skip ›
          </button>
        </>
      )}

      {problem && (
        <p role="alert" className="absolute inset-x-3 top-12 z-30 m-0! bg-(--ink)/80 p-2 text-center text-xs text-(--paper)">
          {problem}
        </p>
      )}
    </>
  );
}
