import type { LucideIcon } from "lucide-react";

/**
 * Shared empty-state panel. Extracted from the same
 * "rounded-xl2 border ... text-center text-sm text-ink-700" block
 * that was repeated inline across admin and instructor pages —
 * dashed border distinguishes an intentionally-empty state from a
 * populated card at a glance.
 *
 * Pass `bare` when this sits inside a container that already has its
 * own border/background (e.g. a table wrapper) so the two borders
 * don't nest visually.
 */
export function EmptyState({ message, icon: Icon, bare = false }: { message: string; icon?: LucideIcon; bare?: boolean }) {
  return (
    <div
      className={
        bare
          ? "px-5 py-16 text-center"
          : "rounded-xl2 border border-dashed border-ink-900/15 bg-white px-5 py-16 text-center"
      }
    >
      {Icon && <Icon className="mx-auto mb-3 h-6 w-6 text-ink-700/40" aria-hidden="true" />}
      <p className="text-sm text-ink-700">{message}</p>
    </div>
  );
}
