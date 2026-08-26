"use client";

import type { ReactNode } from "react";
import { InstructorAuthProvider } from "@/lib/instructors/InstructorAuthContext";
import { InstructorShell } from "@/components/instructor/InstructorShell";

/**
 * Scoped to this route group only — /instructor/login and
 * /instructor/account/setup stay outside it (they run before a
 * session exists, so wrapping them in InstructorAuthProvider would
 * immediately redirect them back to login). Moving the 4 authenticated
 * pages into this group does not change their URLs: Next.js route
 * groups (parenthesized folder names) are excluded from the path.
 */
export default function InstructorPortalLayout({ children }: { children: ReactNode }) {
  return (
    <InstructorAuthProvider>
      <InstructorShell>{children}</InstructorShell>
    </InstructorAuthProvider>
  );
}
