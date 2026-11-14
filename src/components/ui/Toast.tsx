/**
 * A short message that dismisses itself (MASTER.md task A3-03). Owner: Agent 3 (Explorer).
 */
'use client';

import { useEffect } from 'react';

/** How long a toast stays on screen unless told otherwise, in milliseconds. */
export const TOAST_DEFAULT_MS = 2500;

/** Props for Toast. */
export interface ToastProps {
  message: string;
  /** Called once when the time is up, so the parent can stop rendering the toast. */
  onDone: () => void;
  /** How long to show it. Defaults to TOAST_DEFAULT_MS. */
  durationMs?: number;
}

/**
 * Show a message at the top of the screen, then call `onDone`.
 *
 * Side effects: one timer, cleared if the toast unmounts first.
 *
 * @param props - See ToastProps.
 * @param props.message - The text to show.
 * @param props.onDone - Called when the time is up.
 * @param props.durationMs - How long to show it.
 * @returns The element.
 */
export function Toast({ message, onDone, durationMs = TOAST_DEFAULT_MS }: ToastProps) {
  useEffect(() => {
    const id = setTimeout(onDone, durationMs);
    return () => clearTimeout(id);
  }, [onDone, durationMs]);
  return (
    <div className="toast" role="status">
      {message}
    </div>
  );
}
