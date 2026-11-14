/**
 * Sources drawer: what the Historian wrote about this year, and where it came from.
 *
 * Owner: Agent 4. Implements A4-09 (MASTER.md section 11) and assumption A9: generated views are
 * labelled as AI reconstructions and each era lists its sources, which answers the judge who asks
 * "how do you know?". Data is already on the Era (summary, funFacts, sources); no network call.
 */
'use client';

import type { Era } from '@/lib/contracts';
import { safeSourceUrl, sourceHost } from './sources';

/** Props for SourcesDrawer. */
export interface SourcesDrawerProps {
  era: Pick<Era, 'year' | 'title' | 'summary' | 'funFacts' | 'sources'>;
  onClose: () => void;
}

/**
 * Bottom sheet over the Time Machine. Tapping the dimmed area or "Close" shuts it.
 *
 * Side effects: none. Source links open in a new tab with no opener.
 *
 * @param props - Component props.
 * @param props.era - The era whose notes are shown.
 * @param props.onClose - Closes the drawer.
 * @returns The drawer.
 */
export function SourcesDrawer({ era, onClose }: SourcesDrawerProps) {
  return (
    <div className="absolute inset-0 z-40 flex flex-col justify-end">
      <button type="button" aria-label="Close sources" onClick={onClose} className="absolute inset-0 bg-black/60" />
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="sources-title"
        className="relative max-h-[80%] overflow-y-auto rounded-t-2xl bg-zinc-900 px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))]"
      >
        <div className="mb-3 flex items-center gap-3">
          <h2 id="sources-title" className="flex-1 text-base font-bold">
            {era.title ?? era.year} <span className="font-normal text-white/50 tabular-nums">· {era.year}</span>
          </h2>
          <button type="button" onClick={onClose} className="rounded-full bg-white/15 px-3 py-1 text-sm font-bold">
            Close
          </button>
        </div>

        {era.summary && <p className="text-sm leading-relaxed text-white/85">{era.summary}</p>}

        {era.funFacts.length > 0 && (
          <>
            <h3 className="mt-4 mb-1 text-xs font-bold tracking-wide text-amber-400 uppercase">Fun facts</h3>
            <ul className="list-disc space-y-1 pl-5 text-sm text-white/85">
              {era.funFacts.map((fact, i) => (
                <li key={i}>{fact}</li>
              ))}
            </ul>
          </>
        )}

        <h3 className="mt-4 mb-1 text-xs font-bold tracking-wide text-amber-400 uppercase">Sources</h3>
        {era.sources.length === 0 ? (
          <p className="text-sm text-white/60">No sources listed for this year yet.</p>
        ) : (
          <ol className="space-y-2 text-sm">
            {era.sources.map((s, i) => {
              const href = safeSourceUrl(s.url);
              return (
                <li key={i}>
                  {href ? (
                    <a href={href} target="_blank" rel="noopener noreferrer" className="text-sky-300 underline underline-offset-2">
                      {s.title}
                    </a>
                  ) : (
                    <span>{s.title}</span>
                  )}
                  {href && <span className="block text-xs text-white/40">{sourceHost(href)}</span>}
                </li>
              );
            })}
          </ol>
        )}

        <p className="mt-5 text-xs text-white/50">
          The views of {era.year} are AI reconstructions based on these sources and a present-day photo. The guide is a
          fictional person. Details may be wrong.
        </p>
      </section>
    </div>
  );
}
