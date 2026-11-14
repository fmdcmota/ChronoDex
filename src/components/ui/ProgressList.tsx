/**
 * A list of steps with a state icon each, for example "Uploading photo" (MASTER.md task A3-03).
 * Owner: Agent 3 (Explorer).
 */

/** Where a step is. Same words as JobStage.state in the contracts, so job stages map straight in. */
export type ProgressState = 'pending' | 'running' | 'done' | 'failed' | 'skipped';

/** One step. */
export interface ProgressItem {
  /** Stable key for React. */
  key: string;
  /** What the step does, in plain words. */
  label: string;
  state: ProgressState;
  /** Small grey text after the label, for example "2.1 s". */
  detail?: string;
}

/** Props for ProgressList. */
export interface ProgressListProps {
  items: readonly ProgressItem[];
}

/** The symbol and screen-reader word for each state. Colour is never the only signal. */
const STATE_MARK: Record<ProgressState, { mark: string; word: string }> = {
  pending: { mark: '·', word: 'waiting' },
  running: { mark: '▸', word: 'in progress' },
  done: { mark: '✓', word: 'done' },
  failed: { mark: '✕', word: 'failed' },
  skipped: { mark: '–', word: 'skipped' },
};

/**
 * Render the steps, one line each.
 *
 * @param props - See ProgressListProps.
 * @param props.items - The steps, in order.
 * @returns The element.
 */
export function ProgressList({ items }: ProgressListProps) {
  return (
    <ul className="ui-progress">
      {items.map((item) => (
        <li key={item.key} className={`ui-progress-item ui-progress-${item.state}`}>
          <span className="ui-progress-mark" aria-hidden="true">
            {STATE_MARK[item.state].mark}
          </span>
          <span>
            {item.label}
            <span className="sr-only"> ({STATE_MARK[item.state].word})</span>
          </span>
          {item.detail && <span className="muted"> {item.detail}</span>}
        </li>
      ))}
    </ul>
  );
}
