/**
 * Small header switch for the period ambience: a note, struck through when muted.
 *
 * Owner: Agent 4. Used by the Time Machine and the chat headers. See ./useAmbience.ts.
 */
'use client';

/** Props for AmbienceToggle. */
export interface AmbienceToggleProps {
  muted: boolean;
  onToggle: () => void;
}

/**
 * The ambience mute switch.
 *
 * @param props - Component props.
 * @param props.muted - Whether the ambience is muted on this device.
 * @param props.onToggle - Flips the setting. Called inside the tap, so audio can start on iOS.
 * @returns The button.
 */
export function AmbienceToggle({ muted, onToggle }: AmbienceToggleProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={!muted}
      aria-label={muted ? 'Period sounds off. Turn on' : 'Period sounds on. Turn off'}
      title={muted ? 'Period sounds off' : 'Period sounds on'}
      className={`relative shrink-0 px-1 text-lg ${muted ? 'text-(--paper)/40' : 'text-(--gold)'}`}
    >
      ♪
      {muted && <span aria-hidden className="absolute top-1/2 left-0 h-[2px] w-full -rotate-45 bg-current" />}
    </button>
  );
}
