/**
 * React hook: picture credits for an era, from GET /api/media/credits/[eraId].
 *
 * Owner: Agent 4. Task A4-b. CC BY and CC BY-SA require author and licence where the picture is used, so the
 * Sources drawer and the Then/Now slider show them. A failed request (mock mode with no server, offline) gives an
 * empty list: credits are never worth an error on screen.
 */
'use client';

import { useEffect, useState } from 'react';
import type { PictureCredit } from '@/lib/media/credits';

/** Answers for this page's lifetime, so reopening the drawer does not ask again. */
const known = new Map<string, PictureCredit[]>();

/**
 * Fetch an era's credits once per page.
 *
 * @param eraId - The era id.
 * @returns The credits, or an empty list until they arrive or on failure. Never throws.
 */
async function loadCredits(eraId: string): Promise<PictureCredit[]> {
  try {
    const res = await fetch(`/api/media/credits/${encodeURIComponent(eraId)}`);
    const body = res.ok ? ((await res.json()) as { credits?: PictureCredit[] }) : null;
    return Array.isArray(body?.credits) ? body.credits : [];
  } catch {
    return [];
  }
}

/**
 * The credits for an era's third-party pictures.
 *
 * @param eraId - The era, or null.
 * @returns The credits; empty while loading, on failure, or when there are none.
 */
export function usePictureCredits(eraId: string | null | undefined): PictureCredit[] {
  const [, setTick] = useState(0);
  const cached = eraId ? known.get(eraId) : undefined;
  useEffect(() => {
    if (!eraId || cached) return;
    let live = true;
    void loadCredits(eraId).then((credits) => {
      known.set(eraId, credits);
      if (live) setTick((n) => n + 1);
    });
    return () => {
      live = false;
    };
  }, [eraId, cached]);
  return cached ?? [];
}

/**
 * One-line credit text, for example "David Richfield, CC BY-SA 4.0".
 *
 * @param credit - The credit.
 * @returns Author and licence joined by a comma.
 */
export function creditLine(credit: Pick<PictureCredit, 'author' | 'licence'>): string {
  return `${credit.author}, ${credit.licence}`;
}
