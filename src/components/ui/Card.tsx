/**
 * Paper card with a pixel frame (MASTER.md task A3-03). Owner: Agent 3 (Explorer).
 */
import type { ReactNode } from 'react';

/** Props for Card. */
export interface CardProps {
  /** Heading shown in the pixel font. Optional. */
  title?: string;
  children: ReactNode;
}

/**
 * A framed paper panel for grouped content.
 *
 * @param props - See CardProps.
 * @param props.title - Optional heading.
 * @param props.children - The card's content.
 * @returns The element.
 */
export function Card({ title, children }: CardProps) {
  return (
    <section className="ui-card">
      {title && <h2>{title}</h2>}
      {children}
    </section>
  );
}
