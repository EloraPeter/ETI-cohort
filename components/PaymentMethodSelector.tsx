import { CreditCard, Landmark, Check } from "lucide-react";
import type { UseFormRegisterReturn } from "react-hook-form";
import { clsx } from "clsx";
import { paymentMethods } from "@/lib/content";

const icons = { Paystack: CreditCard, "Bank Transfer": Landmark } as const;

export function PaymentMethodSelector({
  registerField,
  selected,
  error,
}: {
  registerField: UseFormRegisterReturn;
  selected?: string;
  error?: string;
}) {
  return (
    <fieldset>
      <legend className="text-sm font-medium text-white/90">How would you like to pay?</legend>
      <div className="mt-3 grid gap-4 sm:grid-cols-2">
        {paymentMethods.map((option) => {
          const Icon = icons[option.value];
          const isSelected = selected === option.value;
          return (
            <label
              key={option.value}
              className={clsx(
                "relative flex cursor-pointer flex-col gap-2 rounded-xl2 border p-5 transition-colors",
                isSelected
                  ? "border-signal-500 bg-signal-500/10"
                  : "border-white/10 bg-white/[0.03] hover:border-white/20"
              )}
            >
              <input type="radio" value={option.value} className="sr-only" {...registerField} />
              <div className="flex items-center justify-between">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-signal-500/15">
                  <Icon className="h-4 w-4 text-signal-400" aria-hidden="true" />
                </div>
                {isSelected && (
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-signal-500">
                    <Check className="h-3 w-3 text-white" aria-hidden="true" />
                  </span>
                )}
              </div>
              <p className="text-sm font-semibold text-white">{option.title}</p>
              <p className="text-xs leading-relaxed text-mist">{option.description}</p>
            </label>
          );
        })}
      </div>
      {error && (
        <p role="alert" className="mt-2 text-xs text-error">
          {error}
        </p>
      )}
    </fieldset>
  );
}
