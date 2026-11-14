/**
 * Bottom sheet that slides over a full-screen page (MASTER.md task A3-03).
 * Owner: Agent 3 (Explorer).
 *
 * Used for short messages that must not hide the screen behind them, for example "you are 230 m
 * from the Royal Albert Hall" over the camera. The Map's landmark card has its own older `.sheet`
 * styles and is not affected by this component.
 */
import type { ReactNode } from 'react';

/** Props for Sheet. */
export interface SheetProps {
  /** Heading, also used as the dialog's accessible name. */
  title: string;
  /** Called when the player taps the close button. Omit for a sheet that cannot be dismissed. */
  onClose?: () => void;
  children: ReactNode;
}

/**
 * A sheet fixed to the bottom of the screen, above the phone's safe area.
 *
 * @param props - See SheetProps.
 * @param props.title - Heading and accessible name.
 * @param props.onClose - Called by the close button. Omit for an undismissable sheet.
 * @param props.children - The sheet's content.
 * @returns The element.
 */
export function Sheet({ title, onClose, children }: SheetProps) {
  return (
    <div className="ui-sheet" role="dialog" aria-label={title}>
      {onClose && (
        <button type="button" className="sheet-close" aria-label="Close" onClick={onClose}>
          ×
        </button>
      )}
      <h2>{title}</h2>
      {children}
    </div>
  );
}
