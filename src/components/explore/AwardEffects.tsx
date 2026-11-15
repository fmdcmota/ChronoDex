/**
 * The extra shine around a first-time badge on the capture screen: a mild screen flash at the
 * first landing, two diamond rings that expand from the coin, and four twinkling stars once it
 * settles. Timed to the coin animation in globals.css (`award-twirl`, 2.4 s: lands at 0.43 s,
 * lands again at about 0.95 s, settles by 1.6 s).
 *
 * Owner: Agent 3 (Explorer). Pure CSS, stepped frames; players who ask for less motion see none of it.
 */

/** Where the four twinkles sit, in pixels from the centre of the badge, with when each appears. */
const TWINKLES: ReadonlyArray<{ x: number; y: number; delayS: number }> = [
  { x: -88, y: -78, delayS: 1.55 },
  { x: 90, y: -66, delayS: 1.7 },
  { x: -80, y: 72, delayS: 1.85 },
  { x: 84, y: 86, delayS: 2.0 },
];

/**
 * Render the flash, rings and twinkles. Place it inside a `position: relative` stage centred on the badge.
 *
 * @returns Decorative elements.
 */
export function AwardEffects() {
  return (
    <>
      <span className="award-flash" aria-hidden="true" />
      <span className="award-ring" aria-hidden="true" />
      <span className="award-ring" aria-hidden="true" style={{ ['--d' as string]: '0.95s' }} />
      {TWINKLES.map((t, i) => (
        <span
          key={i}
          className="twinkle"
          aria-hidden="true"
          style={{ left: `calc(50% + ${t.x}px)`, top: `calc(50% + ${t.y}px)`, ['--d' as string]: `${t.delayS}s` }}
        />
      ))}
    </>
  );
}
