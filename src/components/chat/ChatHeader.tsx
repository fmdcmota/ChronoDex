/**
 * Top bar of the chat: back link, the guide's picture, name and role, the read-aloud and ambience
 * switches, and reset.
 *
 * Owner: Agent 4. Part of A4-07 and A4-08.
 */
'use client';

import Link from 'next/link';
import type { Guide } from '@/lib/contracts';
import { Avatar } from './Avatar';
import { BTN_SECONDARY_SMALL, PIXEL_FONT } from '@/components/time-machine/pixel';
import { AmbienceToggle } from '@/components/time-machine/AmbienceToggle';

/** Props for ChatHeader. */
export interface ChatHeaderProps {
  guide: Guide;
  /** Year being viewed, shown after the role, for example "1893". */
  year: number;
  /** Where the back arrow goes. In the app: `/time/[landmarkId]`. */
  backHref: string;
  /** When on, every new reply is played in the guide's voice as it arrives. */
  readAloud: boolean;
  /** Flips read-aloud. Leave it out to hide the switch (showcase build, where voice is off). */
  onToggleReadAloud?: () => void;
  /** The period ambience is muted on this device. */
  ambienceMuted: boolean;
  onToggleAmbience: () => void;
  /** Clears the thread back to the greeting. */
  onReset: () => void;
}

/**
 * Chat header in the style of a messaging app.
 *
 * @param props - Component props.
 * @param props.guide - The era's guide.
 * @param props.year - The year being viewed.
 * @param props.backHref - Where the back arrow goes.
 * @param props.readAloud - Whether new replies are spoken.
 * @param props.onToggleReadAloud - Flips read-aloud. Called inside the tap, so audio can be unlocked. Absent: no switch.
 * @param props.ambienceMuted - Whether the period ambience is muted.
 * @param props.onToggleAmbience - Flips the ambience mute.
 * @param props.onReset - Clears the thread back to the greeting.
 * @returns The header element.
 */
export function ChatHeader({ guide, year, backHref, readAloud, onToggleReadAloud, ambienceMuted, onToggleAmbience, onReset }: ChatHeaderProps) {
  return (
    <header className="flex items-center gap-3 bg-(--ink) px-3 pt-[max(0.5rem,env(safe-area-inset-top))] pb-2 text-(--paper)">
      <Link href={backHref} className={`${PIXEL_FONT} px-1 text-4xl text-(--gold)`} aria-label="Back to the Time Machine">
        ‹
      </Link>
      <Avatar name={guide.name} url={guide.headshotUrl} sizePx={40} />
      <div className="min-w-0 flex-1">
        <div className={`${PIXEL_FONT} truncate text-2xl text-(--gold)`}>{guide.name}</div>
        <div className="truncate text-xs text-(--paper)/70">
          {guide.role}, {year}
        </div>
      </div>
      {onToggleReadAloud && (
        <button
          type="button"
          onClick={onToggleReadAloud}
          aria-pressed={readAloud}
          className={`${BTN_SECONDARY_SMALL} shrink-0 ${readAloud ? 'bg-(--gold)!' : ''}`}
        >
          {readAloud ? '🔊 Voice on' : '🔈 Voice off'}
        </button>
      )}
      <AmbienceToggle muted={ambienceMuted} onToggle={onToggleAmbience} />
      <button type="button" onClick={onReset} className="px-1 text-lg text-(--paper)/70" aria-label="Start the chat over">
        ↺
      </button>
    </header>
  );
}
