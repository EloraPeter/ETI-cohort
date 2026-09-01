import { Loader2 } from "lucide-react";

/**
 * Only for the shell/authentication loading state — the brief moment
 * before a session check resolves, currently a bare centered spinner
 * on an empty page in both AdminAuthContext and InstructorAuthContext.
 * Not for page-level data-loading states that already have their own
 * meaningful UI (tables, cards, etc.) — those stay exactly as they are.
 */
export function PageSkeleton() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-paper-50">
      <Loader2 className="h-6 w-6 animate-spin text-ink-900" aria-hidden="true" />
    </main>
  );
}
