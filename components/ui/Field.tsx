import { clsx } from "clsx";

export function Field({
  label,
  htmlFor,
  error,
  children,
  className,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={clsx("flex flex-col gap-1.5", className)}>
      <label htmlFor={htmlFor} className="text-sm font-medium tracking-wide text-ink-900/75">
        {label}
      </label>
      {children}
      {error && (
        <p role="alert" className="text-xs text-rose-400">
          {error}
        </p>
      )}
    </div>
  );
}

export const inputClass =
  "w-full rounded-xl border border-white/[0.12] bg-white/[0.06] px-4 py-3 text-sm text-white placeholder:text-white/35 shadow-sm shadow-black/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] outline-none transition-all duration-200 hover:border-white/[0.18] hover:bg-white/[0.08] focus:border-signal-400/70 focus:bg-white/[0.08] focus:ring-2 focus:ring-signal-400/10 appearance-none";