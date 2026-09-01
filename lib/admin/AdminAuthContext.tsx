"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { PageSkeleton } from "@/components/PageSkeleton";

interface AdminAuthContextValue {
  accessToken: string;
  authedFetch: (url: string, init?: RequestInit) => Promise<Response>;
  signOut: () => Promise<void>;
}

const AdminAuthContext = createContext<AdminAuthContextValue | null>(null);

/**
 * Client-side session/UX helper only — NOT the security boundary.
 * Every admin API route still independently calls verifyAdminRequest()
 * server-side; nothing here changes that. This exists purely because
 * the getSession/redirect/authedFetch/signOut block was identical,
 * copy-pasted code in every one of the 10 admin pages — a bug in this
 * file can at worst show a spinner too long or redirect to the wrong
 * place; it cannot grant access to anything the server wouldn't
 * already allow on its own.
 *
 * Faithfully reproduces the existing per-page behavior:
 *   - no session -> redirect to /admin
 *   - a fetch made via authedFetch returns 401 -> redirect to /admin
 *     (every page's load function already did this check individually;
 *     centralizing it here means callers no longer repeat it)
 *   - sign out -> supabase.auth.signOut() + redirect to /admin
 *   - nothing renders until the session check resolves, so there is
 *     no flash of protected content before the redirect (same as the
 *     existing per-page `if (checkingAuth) return <spinner />` guard)
 */
export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const supabase = createClient();

  const [checkingAuth, setCheckingAuth] = useState(true);
  const [accessToken, setAccessToken] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        router.replace("/admin");
        return;
      }
      setAccessToken(data.session.access_token);
      setCheckingAuth(false);
    });
    // Intentionally run once on mount, same as every page's original
    // auth-guard effect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    router.replace("/admin");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const authedFetch = useCallback(
    async (url: string, init?: RequestInit) => {
      const res = await fetch(url, {
        ...init,
        headers: { ...init?.headers, Authorization: `Bearer ${accessToken}` },
      });
      if (res.status === 401) {
        router.replace("/admin");
      }
      return res;
    },
    [accessToken, router]
  );

  if (checkingAuth || !accessToken) {
    return <PageSkeleton />;
  }

  return <AdminAuthContext.Provider value={{ accessToken, authedFetch, signOut }}>{children}</AdminAuthContext.Provider>;
}

export function useAdminAuth(): AdminAuthContextValue {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) {
    throw new Error("useAdminAuth must be used within AdminAuthProvider (i.e. inside app/admin/(portal)/layout.tsx)");
  }
  return ctx;
}
