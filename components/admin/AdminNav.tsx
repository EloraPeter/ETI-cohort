"use client";

import Link from "next/link";
import { LogOut } from "lucide-react";

const ADMIN_NAV_ITEMS = [
  { href: "/admin/dashboard", label: "Registrations" },
  { href: "/admin/payments", label: "Payments" },
  { href: "/admin/instructors", label: "Instructors" },
  { href: "/admin/cohorts", label: "Cohorts" },
  { href: "/admin/resources", label: "Resources" },
] as const;

/**
 * Shared admin section nav + sign-out control. Extracted from the
 * identical inline `<Link>` blocks that were copy-pasted onto every
 * admin page across Phases 3–4 — same links, same styling, just
 * duplicated five times. This is a drop-in visual/structural
 * replacement only; it doesn't change which routes exist or how
 * auth works.
 */
export function AdminNav({ current, onSignOut }: { current: string; onSignOut: () => void }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <nav aria-label="Admin sections" className="flex flex-wrap items-center gap-1 rounded-lg bg-ink-900/5 p-1">
        {ADMIN_NAV_ITEMS.map((item) => {
          const active = item.href === current;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={
                active
                  ? "rounded-md bg-white px-3 py-1.5 text-sm font-medium text-ink-900 shadow-sm"
                  : "rounded-md px-3 py-1.5 text-sm font-medium text-ink-700 hover:text-ink-900"
              }
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
      <button
        onClick={onSignOut}
        className="inline-flex items-center gap-2 rounded-lg border border-ink-900/10 bg-white px-4 py-2 text-sm font-medium text-ink-800 hover:bg-paper-50"
      >
        <LogOut className="h-4 w-4" aria-hidden="true" />
        <span className="hidden sm:inline">Sign out</span>
      </button>
    </div>
  );
}
