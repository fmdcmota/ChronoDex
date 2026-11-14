/**
 * Top bar of the chat: back link, the guide's picture, name and role, and the read-aloud switch.
 *
 * Owner: Agent 4. Part of A4-07 and A4-08.
 */
'use client';

import Link from 'next/link';
import type { Guide } from '@/lib/contracts';
import { Avatar } from './Avatar';

/** Props for ChatHeader. */
export interface ChatHeaderProps {
  guide: Guide;
  /** Year being viewed, shown after the role, for example "1893". */
  year: number;
  /** Where the back arrow goes. In the app: `/time/[landmarkId]`. */
  backHref: string;
  /** When on, every new reply is played in the guide's voice as it arrives. */
  readAloud: boolean;
  onToggleReadAloud: () => void;
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
 * @param props.onToggleReadAloud - Flips read-aloud. Called inside the tap, so audio can be unlocked.
 * @param props.onReset - Clears the thread back to the greeting.
 * @returns The header element.
 */
export function ChatHeader({ guide, year, backHref, readAloud, onToggleReadAloud, onReset }: ChatHeaderProps) {
  return (
    <header className="flex items-center gap-3 border-b border-zinc-200 bg-white/95 px-3 py-2 backdrop-blur">
      <Link href={backHref} className="px-1 text-2xl leading-none text-blue-500" aria-label="Back to the Time Machine">
        ‹
      </Link>
      <Avatar name={guide.name} url={guide.headshotUrl} sizePx={40} />
      <div className="min-w-0 flex-1">
        <div className="truncate font-semibold text-zinc-900">{guide.name}</div>
        <div className="truncate text-xs text-zinc-500">
          {guide.role}, {year}
        </div>
      </div>
      <button
        type="button"
        onClick={onToggleReadAloud}
        aria-pressed={readAloud}
        className={`rounded-full px-3 py-1 text-xs font-medium ${readAloud ? 'bg-blue-500 text-white' : 'bg-zinc-100 text-zinc-600'}`}
      >
        {readAloud ? '🔊 Voice on' : '🔈 Voice off'}
      </button>
      <button type="button" onClick={onReset} className="text-xs text-zinc-400" aria-label="Start the chat over">
        ↺
      </button>
    </header>
  );
}
