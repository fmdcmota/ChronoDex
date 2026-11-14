/**
 * Live list of a generation job's stages: what is happening, which model is doing it, how long it took.
 *
 * Owner: Agent 4. Implements A4-05 (MASTER.md section 11, section 5.3 rule 6 "Show the work").
 * This is the "made with fal" story for the judges, so every stage shows its model id.
 */
'use client';

import { useState } from 'react';
import type { Job, JobStage } from '@/lib/contracts';
import { PANEL_DARK, SECTION_LABEL } from './pixel';

/** Props for ProgressSheet. */
export interface ProgressSheetProps {
  job: Job;
  /** Current time in ms since the epoch, so running stages can show elapsed time. Pass Date.now() from a ticking parent. */
  nowMs: number;
  /**
   * Start as a one-line pill. Used for the video tier: it runs for minutes while the player is
   * already looking around, so the full list would hide the view. Tapping the pill expands it.
   */
  startCollapsed?: boolean;
}

/** Icon per stage state. */
const STATE_ICON: Record<JobStage['state'], string> = {
  pending: '○',
  running: '◐',
  done: '●',
  failed: '✕',
  skipped: '–',
};

/**
 * Seconds a stage took, or has taken so far.
 *
 * @param stage - The stage.
 * @param nowMs - Current time for running stages.
 * @returns Whole seconds, or null when the stage has not started.
 */
export function stageSeconds(stage: Pick<JobStage, 'startedAt' | 'finishedAt'>, nowMs: number): number | null {
  if (!stage.startedAt) return null;
  const startMs = Date.parse(stage.startedAt);
  const endMs = stage.finishedAt ? Date.parse(stage.finishedAt) : nowMs;
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) return null;
  return Math.max(0, Math.round((endMs - startMs) / 1000));
}

/** After this long in the queue, say the generator may be offline (the worker runs on a laptop, section 2). */
export const QUEUE_SLOW_S = 60;

/**
 * What to tell the player while a job waits for the worker to claim it.
 *
 * Why: the worker is a separate process (MASTER.md section 2). When it is down a job stays queued
 * for ever, and a list of grey stages with "0/5" looks frozen. This says what is happening.
 *
 * @param job - The active job.
 * @param nowMs - Current time.
 * @returns A sentence while the job is queued, else null.
 */
export function queueNote(job: Pick<Job, 'state' | 'createdAt'>, nowMs: number): string | null {
  if (job.state !== 'queued') return null;
  const waitedMs = nowMs - Date.parse(job.createdAt);
  if (Number.isFinite(waitedMs) && waitedMs >= QUEUE_SLOW_S * 1000) {
    return 'Still waiting for the studio. It may be offline; anything already made still works.';
  }
  return 'Waiting in line for the studio…';
}

/**
 * The stage list.
 *
 * @param props - Component props.
 * @param props.job - The active job.
 * @param props.nowMs - Current time, for running stages.
 * @param props.startCollapsed - Start as a one-line pill that expands on tap.
 * @returns The sheet.
 */
export function ProgressSheet({ job, nowMs, startCollapsed = false }: ProgressSheetProps) {
  const [collapsed, setCollapsed] = useState(startCollapsed);
  const doneCount = job.stages.filter((s) => s.state === 'done' || s.state === 'skipped').length;
  const running = job.stages.find((s) => s.state === 'running');
  const waiting = queueNote(job, nowMs);

  if (collapsed) {
    return (
      <button
        type="button"
        onClick={() => setCollapsed(false)}
        aria-label="Show generation progress"
        className={`${PANEL_DARK} flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs`}
      >
        <span className="animate-spin" aria-hidden>◐</span>
        <span className="min-w-0 flex-1 truncate">{running?.label ?? waiting ?? 'Waiting for the studio'}</span>
        <span className="tabular-nums text-(--paper)/70">{doneCount}/{job.stages.length}</span>
      </button>
    );
  }

  return (
    <section aria-label="Generation progress" className={`${PANEL_DARK} p-3`}>
      <div className="mb-2 flex items-baseline justify-between text-xs">
        <span className={SECTION_LABEL}>Travelling back</span>
        <button type="button" onClick={() => setCollapsed(true)} className="tabular-nums text-(--paper)/70" aria-label="Hide generation progress">
          {doneCount}/{job.stages.length} ▴
        </button>
      </div>
      {waiting && <p className="m-0! mb-2! text-xs text-(--paper)/80">{waiting}</p>}
      <ol className="space-y-1.5">
        {job.stages.map((stage) => {
          const seconds = stageSeconds(stage, nowMs);
          return (
            <li key={stage.key} className={`flex gap-2 text-sm ${stage.state === 'pending' ? 'text-(--paper)/50' : ''}`}>
              <span className={`w-4 text-center ${stage.state === 'running' ? 'animate-spin' : ''} ${stage.state === 'failed' ? 'text-(--brick)' : ''}`} aria-label={stage.state}>
                {STATE_ICON[stage.state]}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block leading-tight">{stage.label}</span>
                {stage.model && <span className="block truncate font-mono text-[10px] text-(--paper)/60">{stage.model}</span>}
                {stage.error && <span className="block text-[11px] text-(--brick)">{stage.error}</span>}
              </span>
              {seconds !== null && <span className="text-xs tabular-nums text-(--paper)/70">{seconds}s</span>}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
