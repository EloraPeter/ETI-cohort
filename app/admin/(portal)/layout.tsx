"use client";

import type { ReactNode } from "react";
import { AdminAuthProvider } from "@/lib/admin/AdminAuthContext";
import { AdminShell } from "@/components/admin/AdminShell";

/**
 * Scoped to this route group only — /admin (login) stays outside it,
 * and the other 8 admin pages stay on their existing per-page
 * auth-guard pattern for now (Phase A migrates exactly two pages,
 * per the approved plan). Moving dashboard/payments into this group
 * does not change their URLs: Next.js route groups (parenthesized
 * folder names) are excluded from the path.
 */
export default function AdminPortalLayout({ children }: { children: ReactNode }) {
  return (
    <AdminAuthProvider>
      <AdminShell>{children}</AdminShell>
    </AdminAuthProvider>
  );
}
