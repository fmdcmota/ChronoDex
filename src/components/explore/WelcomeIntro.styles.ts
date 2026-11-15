/**
 * Styles of the welcome intro (WelcomeIntro.tsx), rendered in a <style> tag by the component.
 *
 * Owner: Agent 3 (Explorer). Written by Agent 2 at the human's request, 15 Nov 2026.
 * Why a string and not a CSS module: next.config.ts sends every *.css file through Tailwind as global CSS
 * (`as: "*.css"`), so a .module.css loses its class map and every className comes out empty. Every class and
 * keyframe is prefixed `ci-` so nothing collides with globals.css. Timings match INTRO_TIMING in lib/intro.ts:
 * the dive's clouds take 3.6 s, the camera falls for 5.2 s starting at 0.5 s.
 */
export const INTRO_CSS = `
.ci-root {
  position: fixed;
  inset: 0;
  /* Above the map HUD (10), sheets and the mock tag (50). */
  z-index: 60;
  display: grid;
  place-items: center;
  overflow: hidden;
  font-family: var(--font-pixel);
  color: var(--paper);
  /* Taps reach the button only; the map below stays still while the intro is up. */
  touch-action: none;
}

/* Night sky with stars, see-through so the spinning globe shows behind it. */
.ci-sky {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(1.5px 1.5px at 12% 18%, #fff 98%, transparent),
    radial-gradient(1px 1px at 28% 72%, #fff 98%, transparent),
    radial-gradient(1.5px 1.5px at 46% 9%, #fff 98%, transparent),
    radial-gradient(1px 1px at 63% 81%, #fff 98%, transparent),
    radial-gradient(1.5px 1.5px at 78% 27%, #fff 98%, transparent),
    radial-gradient(1px 1px at 91% 62%, #fff 98%, transparent),
    radial-gradient(1px 1px at 8% 88%, #fff 98%, transparent),
    radial-gradient(1.5px 1.5px at 55% 45%, #fff9 98%, transparent),
    radial-gradient(ellipse at 50% 120%, #4a3f8acc 0%, transparent 60%),
    linear-gradient(180deg, #120f24e6 0%, #1e1a2bb3 45%, #2b2550a6 100%);
  transition: opacity 1.4s ease;
}

/* A white-out that thickens, then clears: the moment of falling through the cloud deck. */
.ci-fog {
  position: absolute;
  inset: 0;
  background: radial-gradient(ellipse at 50% 50%, #ffffff 0%, #eef0ff 55%, #d9dcf5 100%);
  opacity: 0;
  pointer-events: none;
}

.ci-clouds {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

/* A chunky cartoon cloud from hard-edged ellipses, with a flat pixel shadow under it. */
.ci-cloud {
  position: absolute;
  left: var(--x);
  top: var(--y);
  width: 300px;
  height: 140px;
  margin: -70px 0 0 -150px;
  /* Hard-edged puffs, each kept inside the box (a puff that overflows is clipped flat and the cloud looks boxy). */
  background:
    radial-gradient(38px 32px at 112px 60px, #fff 97%, transparent),
    radial-gradient(70px 60px at 150px 66px, #fff 97%, transparent),
    radial-gradient(62px 48px at 85px 88px, #fff 97%, transparent),
    radial-gradient(56px 44px at 218px 90px, #fff 97%, transparent),
    radial-gradient(130px 26px at 150px 112px, #f1efff 97%, transparent);
  filter: drop-shadow(0 7px 0 #b9b3dd);
  transform: scale(var(--s));
  opacity: 0.95;
  animation: ci-drift var(--drift) ease-in-out var(--delay) infinite alternate;
  will-change: transform, opacity;
}

@keyframes ci-drift {
  from { transform: translateX(-14px) scale(var(--s)); }
  to { transform: translateX(14px) scale(var(--s)); }
}

/* Title block */
.ci-card {
  position: relative;
  display: grid;
  justify-items: center;
  gap: 10px;
  padding: 0 16px;
  text-align: center;
  transition: opacity 0.6s ease, transform 0.6s ease;
}

.ci-kicker {
  font-size: 20px;
  letter-spacing: 0.22em;
  color: var(--gold);
  text-shadow: 2px 2px 0 var(--ink);
}

.ci-title {
  margin: 0;
  font-size: clamp(56px, 17vw, 112px);
  line-height: 0.9;
  letter-spacing: 0.04em;
  color: var(--paper);
  text-shadow:
    4px 4px 0 var(--brick),
    8px 8px 0 var(--ink);
  animation: ci-hover 3.2s ease-in-out infinite alternate;
}

@keyframes ci-hover {
  from { transform: translateY(-3px); }
  to { transform: translateY(3px); }
}

.ci-tagline {
  max-width: 30ch;
  margin: 4px 0 18px;
  font-family: var(--font-body);
  font-size: 16px;
  line-height: 1.4;
  color: #f6efd9e6;
  text-shadow: 0 1px 2px #000a;
}

.ci-enter {
  font-family: var(--font-pixel);
  font-size: 26px;
  letter-spacing: 0.08em;
  padding: 12px 22px;
  color: var(--ink);
  background: var(--gold);
  border: none;
  box-shadow: var(--pixel-frame), 0 6px 0 4px var(--gold-dark), 0 0 28px 6px #f2b43c66;
  cursor: pointer;
  animation: ci-beckon 1.6s ease-in-out infinite;
}

.ci-enter:active {
  transform: translateY(4px);
  box-shadow: var(--pixel-frame), 0 2px 0 4px var(--gold-dark);
}

.ci-enter:disabled {
  cursor: progress;
  animation: none;
  filter: saturate(0.7);
}

.ci-enter:focus-visible {
  outline: 3px dashed var(--paper);
  outline-offset: 8px;
}

@keyframes ci-beckon {
  0%, 100% { box-shadow: var(--pixel-frame), 0 6px 0 4px var(--gold-dark), 0 0 18px 2px #f2b43c55; }
  50% { box-shadow: var(--pixel-frame), 0 6px 0 4px var(--gold-dark), 0 0 36px 10px #f2b43c99; }
}

.ci-cursor {
  animation: ci-blink 0.8s steps(1) infinite;
}

@keyframes ci-blink {
  50% { opacity: 0; }
}


/* Shown under the clouds during the dive when there is no location to land on. */
.ci-note {
  position: absolute;
  /* Mid-screen, where the fog is thickest, so it never sits on the map's buttons as the overlay fades. */
  top: 50%;
  left: 16px;
  right: 16px;
  text-align: center;
  font-family: var(--font-body);
  font-size: 14px;
  color: var(--ink);
  text-shadow: 0 0 6px #fff;
}

/* ---- The dive -------------------------------------------------------------------------------------------- */

.ci-dive .ci-sky {
  opacity: 0;
}

.ci-dive .ci-card {
  opacity: 0;
  transform: translateY(-40px) scale(0.96);
  pointer-events: none;
}

/* The clouds pull in towards the centre, then burst past the camera and away. */
.ci-dive .ci-cloud {
  animation: ci-burst 3.6s cubic-bezier(0.5, 0, 0.3, 1) forwards;
}

@keyframes ci-burst {
  0% { transform: translate(0, 0) scale(var(--s)); opacity: 0.94; }
  30% { transform: translate(calc(var(--dx) * -18vw), calc(var(--dy) * -14vh)) scale(calc(var(--s) * 1.7)); opacity: 1; }
  100% { transform: translate(calc(var(--dx) * 95vw), calc(var(--dy) * 85vh)) scale(calc(var(--s) * 4.5)); opacity: 0; }
}

.ci-dive .ci-fog {
  animation: ci-whiteout 3.6s ease-in-out forwards;
}

@keyframes ci-whiteout {
  0% { opacity: 0; }
  28% { opacity: 0.92; }
  42% { opacity: 0.92; }
  100% { opacity: 0; }
}

/* The last moment: the overlay itself goes, leaving the map. */
.ci-leaving {
  opacity: 0;
  transition: opacity 0.5s ease;
}

@media (prefers-reduced-motion: reduce) {
  .ci-cloud,
  .ci-title,
  .ci-enter,
  .ci-cursor,
  .ci-dive .ci-cloud,
  .ci-dive .ci-fog {
    animation: none;
  }

  .ci-dive .ci-cloud {
    opacity: 0;
    transition: opacity 0.3s ease;
  }
}
`;
