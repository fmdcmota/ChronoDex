/**
 * Row of year buttons for one landmark, one per era, with a dot showing each era's state.
 *
 * Owner: Agent 4. Implements part of A4-02 (MASTER.md section 11).
 */
'use client';

import type { AssetState, Era, EraId } from '@/lib/contracts';
import { PIXEL_FONT, PIXEL_FRAME } from './pixel';

/** Props for YearBar. */
export interface YearBarProps {
  eras: Pick<Era, 'id' | 'year' | 'state'>[];
  selectedId: EraId | null;
  onSelect: (eraId: EraId) => void;
}

/**
 * Marker per core-tier state: ready is solid, in progress pulses, never visited is hollow.
 * In progress is an ink dot, not gold, so it still shows on the selected (gold) chip. Ready and
 * failed get an ink ring for the same reason.
 */
const DOT_CLASS: Record<AssetState, string> = {
  ready: 'bg-(--verdigris) ring-2 ring-(--ink)',
  queued: 'bg-(--ink-soft) animate-pulse',
  generating: 'bg-(--ink-soft) animate-pulse',
  failed: 'bg-(--brick) ring-2 ring-(--ink)',
  missing: 'border-2 border-current',
};

/**
 * Horizontally scrolling year buttons, oldest first.
 *
 * @param props - Component props.
 * @param props.eras - The landmark's eras, ascending by year.
 * @param props.selectedId - The era being viewed.
 * @param props.onSelect - Called with the era id when a year is tapped.
 * @returns The year bar.
 */
export function YearBar({ eras, selectedId, onSelect }: YearBarProps) {
  return (
    <nav aria-label="Choose a year" className="flex gap-3 overflow-x-auto px-4 py-3">
      {eras.map((era) => {
        const selected = era.id === selectedId;
        return (
          <button
            key={era.id}
            type="button"
            onClick={() => onSelect(era.id)}
            aria-pressed={selected}
            className={`${PIXEL_FONT} ${PIXEL_FRAME} m-[3px] flex shrink-0 items-center gap-2 px-3 py-1.5 text-2xl ${
              selected ? 'bg-(--gold) text-(--ink)' : 'bg-(--paper) text-(--ink-soft)'
            }`}
          >
            <span className={`inline-block h-2.5 w-2.5 ${DOT_CLASS[era.state]}`} aria-hidden />
            {era.year}
          </button>
        );
      })}
    </nav>
  );
}
