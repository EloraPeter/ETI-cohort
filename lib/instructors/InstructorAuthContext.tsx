"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ROUTES } from "@/lib/routes";
import { PageSkeleton } from "@/components/PageSkeleton";
import type { Instructor } from "@/lib/supabase/types";

type InstructorIdentity = Pick<Instructor, "full_name" | "profile_photo_url" | "status">;

interface InstructorAuthContextValue {
  accessToken: string;
  /** Lightweight identity for shell chrome (top bar avatar/name) only —
   *  fetched once via the existing GET /api/instructor/profile route,
   *  not a new endpoint. Pages that need the richer instructor/completion
   *  payload (dashboard, profile) still fetch it themselves; this is
   *  purely so every page under the shell can render the same top bar
   *  without each one separately knowing who's signed in. */
  identity: InstructorIdentity | null;
  authedFetch: (url: string, init?: RequestInit) => Promise<Response>;
  signOut: () => Promise<void>;
}

const InstructorAuthContext = createContext<InstructorAuthContextValue | null>(null);

/**
 * Client-side session/UX helper only — NOT the security boundary.
 * Every instructor API route still independently calls
 * verifyInstructorRequest() (and, for cohort-scoped routes,
 * isInstructorAssignedToCohort()) server-side; nothing here changes
 * that. This exists purely because the getSession/redirect/
 * authedFetch/signOut block was identical, copy-pasted code across
 * all 4 authenticated instructor pages — a bug in this file can at
 * worst show a spinner too long or redirect to the wrong place; it
 * cannot grant access to anything the server wouldn't already allow.
 *
 * Faithfully reproduces the existing per-page behavior:
 *   - no session -> redirect to /instructor/login
 *   - a fetch made via authedFetch returns 401 -> redirect to
 *     /instructor/login (every page's load function already did this
 *     check individually; centralizing it here means callers no
 *     longer repeat it)
 *   - sign out -> supabase.auth.signOut() + redirect to /instructor/login
 *   - nothing renders until the session check resolves, so there is
 *     no flash of protected content before the redirect
 */
export function InstructorAuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const supabase = createClient();

  const [checkingAuth, setCheckingAuth] = useState(true);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [identity, setIdentity] = useState<InstructorIdentity | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        router.replace(ROUTES.instructorLogin);
        return;
      }
      setAccessToken(data.session.access_token);
      setCheckingAuth(false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    router.replace(ROUTES.instructorLogin);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const authedFetch = useCallback(
    async (url: string, init?: RequestInit) => {
      const res = await fetch(url, {
        ...init,
        headers: { ...init?.headers, Authorization: `Bearer ${accessToken}` },
      });
      if (res.status === 401) {
        // By this point the browser already has a valid Supabase session
        // (getSession() passed on mount) — a 401 here specifically means
        // verifyInstructorRequest rejected it server-side, which today only
        // happens for a deactivated account. Carry that context to login
        // rather than bouncing silently.
        router.replace(`${ROUTES.instructorLogin}?reason=inactive`);
      }
      return res;
    },
    [accessToken, router]
  );

  // Fire-and-forget identity fetch for the top bar, once a token exists.
  useEffect(() => {
    if (!accessToken) return;
    fetch("/api/instructor/profile", { headers: { Authorization: `Bearer ${accessToken}` } })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.instructor) {
          setIdentity({
            full_name: data.instructor.full_name,
            profile_photo_url: data.instructor.profile_photo_url,
            status: data.instructor.status,
          });
        }
      })
      .catch(() => {
        // Non-fatal — the top bar just falls back to a generic icon.
      });
  }, [accessToken]);

  if (checkingAuth || !accessToken) {
    return <PageSkeleton />;
  }

  return (
    <InstructorAuthContext.Provider value={{ accessToken, identity, authedFetch, signOut }}>
      {children}
    </InstructorAuthContext.Provider>
  );
}

export function useInstructorAuth(): InstructorAuthContextValue {
  const ctx = useContext(InstructorAuthContext);
  if (!ctx) {
    throw new Error("useInstructorAuth must be used within InstructorAuthProvider (i.e. inside app/instructor/(portal)/layout.tsx)");
  }
  return ctx;
}
