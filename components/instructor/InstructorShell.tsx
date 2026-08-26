"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import { LogOut, User, UserCircle, ChevronDown } from "lucide-react";
import { useInstructorAuth } from "@/lib/instructors/InstructorAuthContext";
import { ROUTES } from "@/lib/routes";

function ProfileMenu() {
  const { identity, signOut } = useInstructorAuth();
  const [open, setOpen] = useState(false);

  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const close = useCallback(() => {
    setOpen(false);
    triggerRef.current?.focus();
  }, []);

  // Close on outside click, Escape, or focus leaving the menu entirely.
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node) && e.target !== triggerRef.current) {
        setOpen(false);
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") close();
    }
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKeyDown);
    menuRef.current?.querySelector<HTMLElement>("a, button")?.focus();
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, close]);

  const firstName = identity?.full_name?.split(" ")[0] ?? "Account";

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls="instructor-profile-menu"
        className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm font-medium text-ink-800 hover:bg-white focus:outline-none focus:ring-2 focus:ring-signal-500"
      >
        {identity?.profile_photo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={identity.profile_photo_url} alt="" className="h-7 w-7 rounded-full object-cover" />
        ) : (
          <UserCircle className="h-7 w-7 text-ink-700" aria-hidden="true" />
        )}
        <span className="hidden sm:inline">{firstName}</span>
        <ChevronDown className="h-3.5 w-3.5 text-ink-700/60" aria-hidden="true" />
      </button>

      {open && (
        <div
          id="instructor-profile-menu"
          ref={menuRef}
          role="menu"
          aria-label="Account menu"
          className="absolute right-0 z-20 mt-2 w-44 rounded-lg border border-ink-900/10 bg-white p-1 shadow-lg motion-reduce:transition-none"
        >
          <Link
            href={ROUTES.instructorProfile}
            role="menuitem"
            onClick={close}
            className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-ink-800 hover:bg-paper-50 focus:outline-none focus:ring-2 focus:ring-signal-500"
          >
            <User className="h-4 w-4" aria-hidden="true" />
            Profile
          </Link>
          <button
            role="menuitem"
            onClick={() => {
              close();
              signOut();
            }}
            className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-ink-800 hover:bg-paper-50 focus:outline-none focus:ring-2 focus:ring-signal-500"
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}

export function InstructorShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-paper-50">
      <header className="border-b border-ink-900/10 bg-white/60">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 sm:px-6">
          <Link href={ROUTES.instructorDashboard} className="text-sm font-semibold text-ink-900 focus:outline-none focus:ring-2 focus:ring-signal-500 rounded">
            Elora Tech Institute
          </Link>
          <ProfileMenu />
        </div>
      </header>
      <main>{children}</main>
    </div>
  );
}
