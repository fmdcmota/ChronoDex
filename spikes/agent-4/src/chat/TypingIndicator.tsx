/**
 * Three bouncing dots in a guide bubble, shown between sending and the first streamed word.
 *
 * Owner: Agent 4. Spike for A4-07.
 */

/**
 * The guide's "typing…" bubble.
 *
 * @returns The indicator row, labelled for screen readers.
 */
export function TypingIndicator() {
  return (
    <div className="flex items-start" role="status" aria-label="The guide is typing">
      <div className="flex gap-1 rounded-2xl rounded-bl-md bg-zinc-200 px-4 py-3">
        {[0, 150, 300].map((delayMs) => (
          <span key={delayMs} style={{ animationDelay: `${delayMs}ms` }} className="h-2 w-2 animate-bounce rounded-full bg-zinc-500" />
        ))}
      </div>
    </div>
  );
}
