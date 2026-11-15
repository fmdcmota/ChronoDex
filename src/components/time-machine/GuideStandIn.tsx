/**
 * A stand-in for the guide video while it does not exist: the guide's portrait bounces up into view over the era's
 * scene, bounces while the real narration plays (captions from GuidePlayer), then drops back out of view.
 * (Bouncing rather than walking at the human's request, Agent 6, 15 Nov 2026.)
 *
 * Owner: Agent 4. Part of A4-04. The human asked for "a sample video, with audio of what the narrator would have
 * said, and captions" between the 360° view and the chat. The real three-clip video needs the video tier
 * (about $4 an era, VIDEO_GENERATION=on); this costs nothing and uses only what the core tier already made:
 * the scene image, the headshot and the narration. It is labelled as a preview.
 *
 * Motion uses the Web Animations API (no global CSS needed) and is reduced to fades when the phone asks for
 * reduced motion.
 */
'use client';

import { useEffect, useRef } from 'react';
import { Avatar } from '@/components/chat/Avatar';
import { useCachedMediaUrl } from './mediaCache';
import { PIXEL_FONT, TAG_DARK } from './pixel';

/** Which part of the appearance is showing. */
export type StandInStage = 'walk_on' | 'talk' | 'walk_off';

/** How long the guide takes to bounce up into view, ms. Short: the player is waiting to hear them. */
export const WALK_MS = 900;
/** How long the guide takes to drop back out of view, ms. */
const LEAVE_MS = 650;
/** One bounce while talking, ms. About two syllables of calm speech. */
const TALK_PULSE_MS = 560;
/** Height of a talking bounce, CSS px. */
const TALK_BOUNCE_PX = 14;
/** Portrait diameter, CSS px. */
const PORTRAIT_PX = 168;

/** Props for GuideStandIn. */
export interface GuideStandInProps {
  stage: StandInStage;
  name: string;
  role: string;
  headshotUrl: string | null;
  /** Era scene (16:9), shown behind the guide. Null leaves the 360° view's colour. */
  sceneUrl: string | null;
  year: number;
  /** Called once the walk-on animation ends: start the narration. */
  onArrived: () => void;
  /** Called once the walk-off animation ends. */
  onLeft: () => void;
}

/**
 * Full-cover layer with the scene and the walking, talking portrait.
 *
 * Side effects: runs animations on its own elements; cancels them on unmount or stage change.
 *
 * @param props - Component props.
 * @param props.stage - walk_on, talk or walk_off.
 * @param props.name - Guide's full name, shown on the name plate.
 * @param props.role - Guide's role, under the name.
 * @param props.headshotUrl - Portrait, or null for the period silhouette.
 * @param props.sceneUrl - Era scene image, or null.
 * @param props.year - The era's year, for alt text.
 * @param props.onArrived - Called when the walk-on finishes.
 * @param props.onLeft - Called when the walk-off finishes.
 * @returns The layer.
 */
export function GuideStandIn({ stage, name, role, headshotUrl, sceneUrl, year, onArrived, onLeft }: GuideStandInProps) {
  const figure = useRef<HTMLDivElement | null>(null);
  const body = useRef<HTMLDivElement | null>(null);
  const scene = useCachedMediaUrl(sceneUrl);
  // Callbacks change identity on every render of the parent; keep the latest without restarting animations.
  const callbacks = useRef({ onArrived, onLeft });
  useEffect(() => {
    callbacks.current = { onArrived, onLeft };
  });

  useEffect(() => {
    const fig = figure.current;
    const bod = body.current;
    if (!fig || !bod) return;
    const reduced = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const running: Animation[] = [];
    const run = (el: HTMLElement, frames: Keyframe[], opts: KeyframeAnimationOptions) => {
      const a = el.animate(frames, opts);
      running.push(a);
      return a;
    };

    if (stage === 'walk_on' || stage === 'walk_off') {
      // Below the frame: far enough down that the portrait and its name plate are hidden.
      const hidden = reduced ? { transform: 'translateY(0)', opacity: 0 } : { transform: 'translateY(110vh)', opacity: 1 };
      const shown = { transform: 'translateY(0)', opacity: 1 };
      const frames: Keyframe[] =
        stage === 'walk_on'
          ? reduced
            ? [hidden, shown]
            : // Pops up past its spot, then settles with a small bounce.
              [hidden, { transform: 'translateY(-36px)', offset: 0.62 }, { transform: 'translateY(10px)', offset: 0.82 }, shown]
          : reduced
            ? [shown, hidden]
            : // A little hop, then drops out of view.
              [shown, { transform: 'translateY(-24px)', offset: 0.3 }, hidden];
      const move = run(fig, frames, {
        duration: stage === 'walk_on' ? WALK_MS : LEAVE_MS,
        easing: stage === 'walk_on' ? 'ease-out' : 'ease-in',
        fill: 'forwards',
      });
      move.onfinish = () => (stage === 'walk_on' ? callbacks.current.onArrived() : callbacks.current.onLeft());
    } else {
      fig.style.transform = 'translateY(0)';
      fig.style.opacity = '1';
      if (!reduced) {
        // Speaking: a steady bounce, squashing a little as it lands.
        run(
          bod,
          [
            { transform: 'translateY(0) scale(1, 1)' },
            { transform: `translateY(-${TALK_BOUNCE_PX}px) scale(0.98, 1.03)`, offset: 0.45 },
            { transform: 'translateY(0) scale(1.03, 0.97)', offset: 0.85 },
            { transform: 'translateY(0) scale(1, 1)' },
          ],
          { duration: TALK_PULSE_MS, iterations: Infinity, easing: 'ease-in-out' },
        );
      }
    }
    return () => running.forEach((a) => a.cancel());
  }, [stage]);

  return (
    <div className="absolute inset-0 z-20 overflow-hidden bg-(--ink)">
      {scene && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={scene} alt={`The street in ${year}, AI reconstruction`} className="absolute inset-0 h-full w-full object-cover opacity-80" />
      )}
      <span className={`${TAG_DARK} absolute top-2 left-2 z-10`}>Preview · guide video coming</span>
      <div ref={figure} className="absolute inset-x-0 bottom-28 flex justify-center" style={{ transform: 'translateY(110vh)' }}>
        <div ref={body} className="flex flex-col items-center">
          <div className="rounded-full shadow-(--pixel-frame)">
            <Avatar name={name} url={headshotUrl} sizePx={PORTRAIT_PX} />
          </div>
          <div className="mt-2 bg-(--ink)/85 px-3 py-1 text-center">
            <p className={`${PIXEL_FONT} m-0! text-xl text-(--gold)`}>{name}</p>
            <p className="m-0! text-xs text-(--paper)/80">{role}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
