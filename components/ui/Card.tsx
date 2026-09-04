import type { ReactNode, ElementType } from "react";
import { clsx } from "clsx";

export function Card({
  children,
  className,
  padded = true,
  as: Component = "div",
}: {
  children: ReactNode;
  className?: string;
  /** Set false when the content manages its own internal padding
   *  (e.g. a table with its own header row and row padding) rather
   *  than needing the card's default p-5. */
  padded?: boolean;
  /** Pass "section" to preserve semantic sectioning where a card
   *  wraps a genuinely distinct region of a page (e.g. the
   *  student-detail sections) — a small, deliberate extension rather
   *  than a new variant system. */
  as?: ElementType;
}) {
  return (
    <Component className={clsx("overflow-hidden rounded-xl2 border border-ink-900/10 bg-white", padded && "p-5", className)}>
      {children}
    </Component>
  );
}
