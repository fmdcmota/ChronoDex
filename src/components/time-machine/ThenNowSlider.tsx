/**
 * Then/now slider: the present-day reference photo and the era's scene image, one over the other,
 * with a divider the player drags to wipe between them.
 *
 * Owner: Agent 4. Implements A4-06 (MASTER.md section 11). Both images share the same framing
 * (the scene is the reference photo edited to the year, 16:9, section 5.1), so they line up.
 *
 * "Then" is on the left and "now" on the right, reading like a timeline. The divider is a
 * WAI-ARIA slider: arrow keys, Home and End move it, and a drag anywhere on the image moves it.
 */
'use client';

import { useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { THEN_NOW_START_PERCENT, percentAfterKey, percentFromPointer } from './thenNow';

/** Props for ThenNowSlider. */
export interface ThenNowSliderProps {
  /** Era scene image (Era.sceneImageUrl). */
  thenUrl: string;
  /** Present-day photo (Landmark.referencePhotoUrl). */
  nowUrl: string;
  /** The era's year, for the label. */
  year: number;
  /** Landmark name, for alt text. */
  landmarkName: string;
  /** Closes the overlay. */
  onClose: () => void;
}

/**
 * Full-screen overlay comparing then and now.
 *
 * Side effects: none beyond loading the two images.
 *
 * @param props - Component props.
 * @param props.thenUrl - Era scene image.
 * @param props.nowUrl - Present-day reference photo.
 * @param props.year - The era's year, for labels.
 * @param props.landmarkName - For alt text.
 * @param props.onClose - Closes the overlay.
 * @returns The overlay.
 */
export function ThenNowSlider({ thenUrl, nowUrl, year, landmarkName, onClose }: ThenNowSliderProps) {
  const [percent, setPercent] = useState(THEN_NOW_START_PERCENT);
  const box = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const moveTo = (clientX: number) => {
    const rect = box.current?.getBoundingClientRect();
    if (rect) setPercent(percentFromPointer(clientX, rect.left, rect.width));
  };

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    dragging.current = true;
    // Capture so the drag keeps working when the finger leaves the image.
    e.currentTarget.setPointerCapture(e.pointerId);
    moveTo(e.clientX);
  };
  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (dragging.current) moveTo(e.clientX);
  };
  const onPointerUp = () => {
    dragging.current = false;
  };
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const next = percentAfterKey(percent, e.key);
    if (next === null) return;
    e.preventDefault();
    setPercent(next);
  };

  return (
    <div role="dialog" aria-modal="true" aria-label={`${landmarkName}, ${year} and now`} className="absolute inset-0 z-40 flex flex-col justify-center bg-black/95">
      <button
        type="button"
        onClick={onClose}
        className="absolute top-3 right-3 z-10 rounded-full bg-white/15 px-3 py-1 text-sm font-bold"
      >
        Close
      </button>

      <div
        ref={box}
        className="relative aspect-video w-full touch-none select-none overflow-hidden"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={nowUrl} alt={`${landmarkName} today`} draggable={false} className="absolute inset-0 h-full w-full object-cover" />
        {/* The era image on top, clipped to the left of the divider. clip-path avoids resizing the image, so the two stay aligned. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={thenUrl}
          alt={`${landmarkName} in ${year}, AI reconstruction`}
          draggable={false}
          className="absolute inset-0 h-full w-full object-cover"
          style={{ clipPath: `inset(0 ${100 - percent}% 0 0)` }}
        />

        <span className="absolute top-2 left-2 rounded bg-black/70 px-2 py-0.5 text-xs font-bold tabular-nums">{year}</span>
        <span className="absolute top-2 right-2 rounded bg-black/70 px-2 py-0.5 text-xs font-bold">Now</span>

        <div
          role="slider"
          tabIndex={0}
          aria-label="Then and now divider"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(percent)}
          aria-valuetext={`${Math.round(percent)}% ${year}`}
          onKeyDown={onKeyDown}
          className="absolute inset-y-0 w-0.5 -translate-x-1/2 bg-amber-400 outline-none focus-visible:ring-2 focus-visible:ring-white"
          style={{ left: `${percent}%` }}
        >
          <span className="absolute top-1/2 left-1/2 flex h-9 w-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-amber-400 text-sm font-bold text-black">
            ‹›
          </span>
        </div>
      </div>

      <p className="px-4 pt-3 text-center text-xs text-white/60">Drag to compare. The {year} view is an AI reconstruction.</p>
    </div>
  );
}
