import type { ButtonHTMLAttributes } from "react";
import { Loader2 } from "lucide-react";
import { clsx } from "clsx";

export type ButtonVariant = "primary" | "secondary" | "danger";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  loading?: boolean;
}

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  // Existing dark treatment used everywhere for the primary action.
  primary: "bg-ink-900 text-white hover:bg-ink-800",
  // Existing bordered/neutral treatment used for secondary actions.
  secondary: "border border-ink-900/10 text-ink-800 hover:bg-paper-50",
  // Visually distinct destructive treatment — new, since no
  // consistent danger style existed before (deactivate/reject used
  // the same neutral bordered look as any other secondary action).
  danger: "border border-rose-300 text-rose-700 hover:bg-rose-50",
};

/** Native <button> only — never a clickable <div>, per accessibility scope. */
export function Button({ variant = "primary", loading = false, disabled, className, children, ...rest }: ButtonProps) {
  return (
    <button
      disabled={disabled || loading}
      className={clsx(
        "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-60",
        VARIANT_CLASSES[variant],
        className
      )}
      {...rest}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : children}
    </button>
  );
}
