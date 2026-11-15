/**
 * Sources drawer: what the Historian wrote about this year, and where it came from.
 *
 * Owner: Agent 4. Implements A4-09 (MASTER.md section 11) and assumption A9: generated views are
 * labelled as AI reconstructions and each era lists its sources, which answers the judge who asks
 * "how do you know?". Data is already on the Era (summary, funFacts, sources). A4-b: picture credits (author and
 * licence of the present-day photo and the period images, required by CC BY and CC BY-SA) come from
 * GET /api/media/credits/[eraId].
 */
'use client';

import type { Era } from '@/lib/contracts';
import { safeSourceUrl, sourceHost } from './sources';
import { usePictureCredits } from './usePictureCredits';
import { BTN_SECONDARY, PANEL_DARK, SECTION_LABEL } from './pixel';

/** Props for SourcesDrawer. */
export interface SourcesDrawerProps {
  era: Pick<Era, 'id' | 'year' | 'title' | 'summary' | 'funFacts' | 'sources'>;
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
  const credits = usePictureCredits(era.id);
  return (
    <div className="absolute inset-0 z-40 flex flex-col justify-end">
      <button type="button" aria-label="Close sources" onClick={onClose} className="absolute inset-0 bg-(--ink)/60" />
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="sources-title"
        className={`${PANEL_DARK} relative max-h-[80%] overflow-y-auto px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))]`}
      >
        <div className="mb-3 flex items-center gap-3">
          <h2 id="sources-title" className="flex-1 text-(--gold)">
            {era.title ?? era.year} <span className="text-(--paper)/60">· {era.year}</span>
          </h2>
          <button type="button" onClick={onClose} className={BTN_SECONDARY}>
            Close
          </button>
        </div>

        {era.summary && <p className="text-sm leading-relaxed text-(--paper)/90">{era.summary}</p>}

        {era.funFacts.length > 0 && (
          <>
            <h3 className={`${SECTION_LABEL} mt-4 mb-1`}>Fun facts</h3>
            <ul className="list-disc space-y-1 pl-5 text-sm text-(--paper)/85">
              {era.funFacts.map((fact, i) => (
                <li key={i}>{fact}</li>
              ))}
            </ul>
          </>
        )}

        <h3 className={`${SECTION_LABEL} mt-4 mb-1`}>Sources</h3>
        {era.sources.length === 0 ? (
          <p className="text-sm text-(--paper)/70">No sources listed for this year yet.</p>
        ) : (
          <ol className="space-y-2 text-sm">
            {era.sources.map((s, i) => {
              const href = safeSourceUrl(s.url);
              return (
                <li key={i}>
                  {href ? (
                    <a href={href} target="_blank" rel="noopener noreferrer" className="text-(--gold) underline underline-offset-2">
                      {s.title}
                    </a>
                  ) : (
                    <span>{s.title}</span>
                  )}
                  {href && <span className="block text-xs text-(--paper)/40">{sourceHost(href)}</span>}
                </li>
              );
            })}
          </ol>
        )}

        {credits.length > 0 && (
          <>
            <h3 className={`${SECTION_LABEL} mt-4 mb-1`}>Pictures</h3>
            <ul className="space-y-2 text-sm">
              {credits.map((c, i) => {
                const page = c.pageUrl ? safeSourceUrl(c.pageUrl) : null;
                const deed = c.licenceUrl ? safeSourceUrl(c.licenceUrl) : null;
                return (
                  <li key={i}>
                    {page ? (
                      <a href={page} target="_blank" rel="noopener noreferrer" className="text-(--gold) underline underline-offset-2">
                        {c.title}
                      </a>
                    ) : (
                      <span>{c.title}</span>
                    )}
                    <span className="block text-xs text-(--paper)/60">
                      {c.role === 'reference' ? 'Shown in Then/Now and used by the AI. ' : 'Guided the AI reconstruction. '}
                      {c.author},{' '}
                      {deed ? (
                        <a href={deed} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">
                          {c.licence}
                        </a>
                      ) : (
                        c.licence
                      )}
                    </span>
                  </li>
                );
              })}
            </ul>
          </>
        )}

        <p className="mt-5! text-xs text-(--paper)/60">
          The views of {era.year} are AI reconstructions based on these sources and a present-day photo. The guide is a
          fictional person. Details may be wrong.
        </p>
      </section>
    </div>
  );
}
