/**
 * Row of year buttons for one landmark, one per era, with a dot showing each era's state.
 *
 * Owner: Agent 4. Implements part of A4-02 (MASTER.md section 11).
 */
'use client';

import type { AssetState, Era, EraId } from '@/lib/contracts';

/** Props for YearBar. */
export interface YearBarProps {
  eras: Pick<Era, 'id' | 'year' | 'state'>[];
  selectedId: EraId | null;
  onSelect: (eraId: EraId) => void;
}

/** Dot colour per core-tier state: ready is solid, in progress pulses, never visited is hollow. */
const DOT_CLASS: Record<AssetState, string> = {
  ready: 'bg-emerald-400',
  queued: 'bg-amber-300 animate-pulse',
  generating: 'bg-amber-300 animate-pulse',
  failed: 'bg-red-500',
  missing: 'border border-white/70',
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
    <nav aria-label="Choose a year" className="flex gap-2 overflow-x-auto px-3 py-2">
      {eras.map((era) => {
        const selected = era.id === selectedId;
        return (
          <button
            key={era.id}
            type="button"
            onClick={() => onSelect(era.id)}
            aria-pressed={selected}
            className={`flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-sm font-bold tabular-nums ${
              selected ? 'bg-amber-400 text-black' : 'bg-white/10 text-white'
            }`}
          >
            <span className={`inline-block h-2 w-2 rounded-full ${DOT_CLASS[era.state]}`} aria-hidden />
            {era.year}
          </button>
        );
      })}
    </nav>
  );
}
