/**
 * "Next stop" card at the end of the chat thread: the nearest landmark the player has not
 * collected, with distance and direction, and a link back to the map.
 *
 * Owner: Agent 4. Implements the after-chat prompt of A4-09 (MASTER.md sections 1.2 step 11 and 11).
 * The guide may also suggest a landmark in its reply (section 7 chat rules); this card is the
 * dependable version that does not rely on the model.
 */
'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { LandmarkId } from '@/lib/contracts';
import { api, getPlayerId } from '@/lib/client';
import { directionHint, type LandmarkFix } from '@/components/explore/lib/geo-format';
import { nextStop } from './nextStop';
import { PIXEL_FONT, PIXEL_FRAME } from '@/components/time-machine/pixel';

/** Props for NextStopCard. */
export interface NextStopCardProps {
  /** The landmark of the guide being chatted with. */
  landmarkId: LandmarkId;
}

/** What the card knows: still loading, a suggestion, or every landmark collected. */
type Suggestion = { kind: 'loading' } | { kind: 'next'; fix: LandmarkFix } | { kind: 'all_done' };

/**
 * Loads the landmarks and the player's Dex once, then shows the suggestion.
 *
 * Side effects: two GET requests (`/api/landmarks`, `/api/players/[playerId]/dex`). On failure the
 * card renders nothing: it is a nice-to-have, not worth an error message in a chat.
 *
 * @param props - Component props.
 * @param props.landmarkId - The current landmark, always excluded from the suggestion.
 * @returns The card, or null while loading or after a failure.
 */
export function NextStopCard({ landmarkId }: NextStopCardProps) {
  const [suggestion, setSuggestion] = useState<Suggestion | null>({ kind: 'loading' });

  useEffect(() => {
    let live = true;
    Promise.all([api.listLandmarks(), api.getDex(getPlayerId())])
      .then(([landmarks, captures]) => {
        if (!live) return;
        const fix = nextStop(landmarkId, landmarks, captures.map((c) => c.landmarkId));
        setSuggestion(fix ? { kind: 'next', fix } : { kind: 'all_done' });
      })
      .catch(() => live && setSuggestion(null));
    return () => {
      live = false;
    };
  }, [landmarkId]);

  if (!suggestion || suggestion.kind === 'loading') return null;

  if (suggestion.kind === 'all_done') {
    return (
      <Link href="/dex" className={`${PIXEL_FRAME} m-[3px] mx-auto! mt-4! flex max-w-[90%] items-center gap-3 bg-white px-4 py-3 text-sm text-(--ink)`}>
        <span className="flex-1 font-semibold">Every badge collected.</span>
        <span className={`${PIXEL_FONT} text-xl text-(--gold-dark)`}>Dex ›</span>
      </Link>
    );
  }

  return (
    <Link href="/" className={`${PIXEL_FRAME} m-[3px] mx-auto! mt-4! flex max-w-[90%] items-center gap-3 bg-white px-4 py-3 text-sm text-(--ink)`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={suggestion.fix.landmark.spriteUrl} alt="" className="h-10 w-10 shrink-0 object-contain [image-rendering:pixelated]" />
      <span className="min-w-0 flex-1">
        <span className={`${PIXEL_FONT} block text-lg text-(--gold-dark)`}>Next stop</span>
        <span className="block">{directionHint(suggestion.fix)} from here.</span>
      </span>
      <span className={`${PIXEL_FONT} shrink-0 text-xl text-(--ink)`}>Map ›</span>
    </Link>
  );
}
