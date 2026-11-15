/**
 * The Emma duck: a small duck in a mortarboard that wanders across the map screen now and then,
 * for charm (a nod to Emmanuel College's pond ducks).
 *
 * Owner: Agent 3 (Explorer). Not in MASTER.md: added at the human's request on 15 Nov 2026, built
 * to be removed cleanly.
 *
 * HOW TO REMOVE IT (any one of these):
 * 1. Quickest: set DUCK_ENABLED below to false. The component renders nothing.
 * 2. Remove the `<DuckWalker />` line and its import from MapScreen.tsx.
 * 3. Delete this file and public/sprites/duck/, then do 2. Nothing else
 *    refers to the duck (the sprite code in spikes/agent-3 is a separate, optional source).
 * 4. Or `git revert` the single commit that added it.
 *
 * Behaviour: it waits a random 8 to 25 seconds, then walks in from one side at a random height in
 * the middle band of the screen (clear of the top buttons and the bottom bar), sometimes stops
 * for a moment on the way, and walks off the other side, and repeats. It never catches a tap.
 * It does not run for players who ask for reduced motion, nor while the tab is hidden.
 *
 * Why the styles are inside this file: the repo's Turbopack config sends every `.css` file through
 * Tailwind, which breaks CSS modules (their class names come out empty), and global CSS may only be
 * imported from the root layout. A `<style>` element with unique `emma-duck` class names keeps the
 * whole feature in one file.
 *
 * Why direct DOM animation and no React state: the walk is purely visual, so a ref, the Web
 * Animations API and timers keep it out of React's render path and cause no re-renders.
 */
'use client';

import { useEffect, useRef } from 'react';

/**
 * The duck's styles, all under the unique `emma-duck` prefix so they cannot touch anything else.
 * The mover is positioned by JavaScript; the sprite is a 2-frame sheet (24 px art per frame, shown
 * at 2x so pixels stay sharp) whose frames swap twice a second while walking.
 */
const DUCK_CSS = `
.emma-duck { position: fixed; left: 0; top: 0; z-index: 5; width: 48px; height: 48px; pointer-events: none; visibility: hidden; }
.emma-duck-sprite { width: 48px; height: 48px; background: url('/sprites/duck/walk.png') 0 0 / 96px 48px no-repeat; image-rendering: pixelated; }
.emma-duck-left { transform: scaleX(-1); }
.emma-duck-walking { animation: emma-duck-waddle 0.42s steps(1, end) infinite; }
@keyframes emma-duck-waddle { 0% { background-position: 0 0; } 50% { background-position: -48px 0; } }
`;

/** Master switch. False removes the duck without deleting anything. */
const DUCK_ENABLED = true;

/** On-screen size of the duck in CSS pixels (a 24 px art frame at 2x). */
const DUCK_SIZE_PX = 48;
/** Walking speed range, CSS pixels per second. */
const SPEED_PX_S = [34, 52] as const;
/** Random wait between walks, milliseconds. */
const WAIT_MS = [8000, 25000] as const;
/** The first walk comes sooner, so the duck is noticed. */
const FIRST_WAIT_MS = [4000, 9000] as const;
/** Chance that the duck stops once in the middle of a walk. */
const PAUSE_CHANCE = 0.55;
/** How long a mid-walk stop lasts, milliseconds. */
const PAUSE_MS = [1200, 2600] as const;
/** The duck keeps this far from the top (buttons) and the bottom (hint and capture button). */
const TOP_CLEAR_PX = 190;
const BOTTOM_CLEAR_PX = 230;

/**
 * A random number in a range.
 *
 * @param range - Minimum and maximum, inclusive.
 * @returns A uniformly random value between them.
 */
function between(range: readonly [number, number]): number {
  return range[0] + Math.random() * (range[1] - range[0]);
}

/**
 * Render the wandering duck. Place it once inside the map screen. Renders a single empty
 * decorative element, hidden until a walk starts.
 *
 * @returns The duck, or null when DUCK_ENABLED is false.
 */
export function DuckWalker() {
  const moverRef = useRef<HTMLDivElement>(null);
  const spriteRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mover = moverRef.current;
    const sprite = spriteRef.current;
    if (!DUCK_ENABLED || !mover || !sprite) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let animation: Animation | undefined;

    /** Set the picture walking or standing. */
    const setWalking = (walking: boolean) => sprite.classList.toggle('emma-duck-walking', walking);

    /** Wait, then walk again. */
    const schedule = (waitMs: number) => {
      timer = setTimeout(walk, waitMs);
    };

    /** One crossing of the screen. */
    const walk = () => {
      if (cancelled) return;
      if (document.hidden) return schedule(3000);
      const width = window.innerWidth;
      const height = window.innerHeight;
      const bandTop = TOP_CLEAR_PX;
      const bandBottom = Math.max(bandTop + 1, height - BOTTOM_CLEAR_PX);
      const y = bandTop + Math.random() * (bandBottom - bandTop);
      const rightward = Math.random() < 0.5;
      const startX = rightward ? -DUCK_SIZE_PX : width;
      const endX = rightward ? width : -DUCK_SIZE_PX;
      const speed = between(SPEED_PX_S);
      const walkS = Math.abs(endX - startX) / speed;

      // Optional stop at a random point between a quarter and 70 % of the way.
      const pause = Math.random() < PAUSE_CHANCE;
      const pauseMs = pause ? between(PAUSE_MS) : 0;
      const stopFraction = 0.25 + Math.random() * 0.45;
      const stopX = startX + (endX - startX) * stopFraction;
      const toStopMs = walkS * 1000 * stopFraction;
      const afterMs = walkS * 1000 * (1 - stopFraction);
      const totalMs = pause ? toStopMs + pauseMs + afterMs : walkS * 1000;

      sprite.classList.toggle('emma-duck-left', !rightward);
      mover.style.visibility = 'visible';
      setWalking(true);
      const at = (x: number) => ({ transform: `translate(${x}px, ${y}px)` });
      const keyframes = pause
        ? [
            { ...at(startX), offset: 0 },
            { ...at(stopX), offset: toStopMs / totalMs },
            { ...at(stopX), offset: (toStopMs + pauseMs) / totalMs },
            { ...at(endX), offset: 1 },
          ]
        : [at(startX), at(endX)];
      animation = mover.animate(keyframes, { duration: totalMs, easing: 'linear', fill: 'forwards' });

      if (pause) {
        // Stand still (frame 0) for the pause, then walk on.
        window.setTimeout(() => !cancelled && setWalking(false), toStopMs);
        window.setTimeout(() => !cancelled && setWalking(true), toStopMs + pauseMs);
      }
      animation.finished
        .then(() => {
          if (cancelled) return;
          mover.style.visibility = 'hidden';
          setWalking(false);
          schedule(between(WAIT_MS));
        })
        .catch(() => undefined); // cancelled on unmount
    };

    schedule(between(FIRST_WAIT_MS));
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      animation?.cancel();
    };
  }, []);

  if (!DUCK_ENABLED) return null;
  return (
    <>
      <style>{DUCK_CSS}</style>
      <div className="emma-duck" ref={moverRef} aria-hidden="true">
        <div className="emma-duck-sprite" ref={spriteRef} />
      </div>
    </>
  );
}
