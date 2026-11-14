/**
 * Pixel loading spinner (MASTER.md task A3-03). Owner: Agent 3 (Explorer).
 *
 * A stepped, square spinner (`.ui-spinner` in `src/app/globals.css`). The animation is switched
 * off under `prefers-reduced-motion`, leaving a static square.
 */

/** Props for Spinner. */
export interface SpinnerProps {
  /** Text read out by screen readers. Defaults to "Loading". */
  label?: string;
}

/**
 * A loading indicator.
 *
 * @param props - See SpinnerProps.
 * @param props.label - Screen-reader text.
 * @returns The element.
 */
export function Spinner({ label = 'Loading' }: SpinnerProps) {
  return <span className="ui-spinner" role="status" aria-label={label} />;
}
