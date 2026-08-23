import type { ReactNode } from "react";
import { clsx } from "clsx";

export function Card({
  children,
  className,
  padded = true,
}: {
  children: ReactNode;
  className?: string;
  /** Set false when the content manages its own internal padding
   *  (e.g. a table with its own header row and row padding) rather
   *  than needing the card's default p-5. */
  padded?: boolean;
}) {
  return (
    <div className={clsx("overflow-hidden rounded-xl2 border border-ink-900/10 bg-white", padded && "p-5", className)}>
      {children}
    </div>
  );
}
