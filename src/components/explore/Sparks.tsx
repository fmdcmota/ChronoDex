/**
 * A burst of square 8-bit sparks that fly out of a point and fade, in stepped frames.
 *
 * Owner: Agent 3 (Explorer). Used by the badge award and the new-badge twirl on the Dex. Pure CSS
 * (`.sparks` in globals.css); each spark only needs its angle. Players who ask for less motion
 * see no sparks.
 */

/**
 * Render a burst of sparks centred on its parent, which must be `position: relative`.
 *
 * @param props - Component props.
 * @param props.count - How many sparks, spread evenly round the circle. Defaults to 10.
 * @param props.radiusPx - How far they fly, in CSS pixels. Defaults to 78.
 * @param props.delayS - Seconds to wait before the burst, so it can be timed to a landing. Defaults to 0.45.
 * @returns A decorative element.
 */
export function Sparks({ count = 10, radiusPx = 78, delayS = 0.45 }: { count?: number; radiusPx?: number; delayS?: number }) {
  return (
    <span className="sparks" aria-hidden="true" style={{ ['--r' as string]: `${radiusPx}px`, ['--d' as string]: `${delayS}s` }}>
      {Array.from({ length: count }, (_, i) => (
        <span key={i} style={{ ['--a' as string]: `${Math.round((i * 360) / count)}deg` }} />
      ))}
    </span>
  );
}
