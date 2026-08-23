"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, Menu, X } from "lucide-react";
import { ADMIN_NAV_ITEMS } from "@/lib/admin/navItems";
import { useAdminAuth } from "@/lib/admin/AdminAuthContext";

function NavLinks({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  return (
    <nav aria-label="Admin sections" className="flex flex-col gap-1">
      {ADMIN_NAV_ITEMS.map((item) => {
        const active = item.href === pathname;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            onClick={onNavigate}
            className={
              active
                ? "rounded-lg bg-white px-3 py-2 text-sm font-medium text-ink-900 shadow-sm"
                : "rounded-lg px-3 py-2 text-sm font-medium text-ink-700 hover:bg-white/60 hover:text-ink-900"
            }
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { signOut } = useAdminAuth();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const triggerRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);

  const closeDrawer = useCallback(() => {
    setDrawerOpen(false);
    triggerRef.current?.focus();
  }, []);

  // Lock background scroll and move focus into the drawer while open;
  // "no background interaction" is enforced by the backdrop below
  // (a full-screen click target) plus the focus trap here.
  useEffect(() => {
    if (!drawerOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    drawerRef.current?.querySelector<HTMLElement>("a, button")?.focus();
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [drawerOpen]);

  // Escape closes; Tab is trapped within the drawer while it's open.
  useEffect(() => {
    if (!drawerOpen) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        closeDrawer();
        return;
      }
      if (e.key !== "Tab" || !drawerRef.current) return;
      const focusable = drawerRef.current.querySelectorAll<HTMLElement>("a, button");
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!first || !last) return;
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [drawerOpen, closeDrawer]);

  return (
    <div className="min-h-screen bg-paper-50">
      {/* Mobile/tablet top bar — hidden on desktop, where the sidebar is always visible */}
      <div className="flex items-center justify-between border-b border-ink-900/10 bg-white px-4 py-3 lg:hidden">
        <button
          ref={triggerRef}
          onClick={() => setDrawerOpen(true)}
          aria-expanded={drawerOpen}
          aria-controls="admin-mobile-drawer"
          aria-label="Open admin navigation"
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-ink-800 hover:bg-paper-50 focus:outline-none focus:ring-2 focus:ring-signal-500"
        >
          <Menu className="h-5 w-5" aria-hidden="true" />
        </button>
        <span className="text-sm font-semibold text-ink-900">Elora Tech Institute — Admin</span>
        <div className="w-9" aria-hidden="true" />
      </div>

      {/* Mobile/tablet drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            aria-label="Close admin navigation"
            onClick={closeDrawer}
            className="absolute inset-0 bg-ink-950/40 motion-reduce:transition-none"
          />
          <div
            id="admin-mobile-drawer"
            ref={drawerRef}
            role="dialog"
            aria-modal="true"
            aria-label="Admin navigation"
            className="absolute inset-y-0 left-0 w-72 max-w-[85vw] bg-paper-50 p-4 shadow-xl motion-reduce:transition-none"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-ink-900">Elora Tech Institute — Admin</span>
              <button
                onClick={closeDrawer}
                aria-label="Close admin navigation"
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-ink-700 hover:bg-white focus:outline-none focus:ring-2 focus:ring-signal-500"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
            <div className="mt-4">
              <NavLinks pathname={pathname} onNavigate={closeDrawer} />
            </div>
            <button
              onClick={() => {
                closeDrawer();
                signOut();
              }}
              className="mt-4 inline-flex w-full items-center gap-2 rounded-lg border border-ink-900/10 bg-white px-3 py-2 text-sm font-medium text-ink-800 hover:bg-paper-50 focus:outline-none focus:ring-2 focus:ring-signal-500"
            >
              <LogOut className="h-4 w-4" aria-hidden="true" />
              Sign out
            </button>
          </div>
        </div>
      )}

      <div className="lg:flex">
        {/* Desktop sidebar */}
        <aside className="hidden w-64 shrink-0 border-r border-ink-900/10 bg-white/60 p-4 lg:block">
          <div className="px-2">
            <p className="text-sm font-semibold text-ink-900">Elora Tech Institute</p>
            <p className="text-xs text-ink-700/70">Admin</p>
          </div>
          <div className="mt-6">
            <NavLinks pathname={pathname} />
          </div>
          <button
            onClick={signOut}
            className="mt-6 inline-flex w-full items-center gap-2 rounded-lg border border-ink-900/10 bg-white px-3 py-2 text-sm font-medium text-ink-800 hover:bg-paper-50 focus:outline-none focus:ring-2 focus:ring-signal-500"
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
            Sign out
          </button>
        </aside>

        <main className="min-w-0 flex-1 py-8">{children}</main>
      </div>
    </div>
  );
}
