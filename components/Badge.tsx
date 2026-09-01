import type { ReactNode } from "react";
import { clsx } from "clsx";

export type BadgeVariant = "success" | "warning" | "error" | "neutral";

/**
 * Thin wrapper around the existing badge-success/warning/error CSS
 * classes (app/globals.css) — not a new visual language. "neutral"
 * mirrors the same shape (inline-flex, gap-1.5, rounded-full, px-3,
 * py-1, text-xs, font-medium) for the cases that aren't a
 * success/warning/error state but still need the same pill treatment
 * (e.g. "Configured" vs "Not configured").
 */
export function Badge({ variant, children, className }: { variant: BadgeVariant; children: ReactNode; className?: string }) {
  if (variant === "neutral") {
    return (
      <span className={clsx("inline-flex items-center gap-1.5 rounded-full bg-ink-900/5 px-3 py-1 text-xs font-medium text-ink-800", className)}>
        {children}
      </span>
    );
  }
  return <span className={clsx(`badge-${variant}`, className)}>{children}</span>;
}
