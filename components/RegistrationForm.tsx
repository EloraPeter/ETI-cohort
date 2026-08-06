"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, ArrowRight } from "lucide-react";
import { Field, inputClass } from "@/components/ui/Field";
import { PaymentMethodSelector } from "@/components/PaymentMethodSelector";
import {
  registrationSchema,
  type RegistrationInput,
  genderOptions,
  educationOptions,
  experienceOptions,
  hearAboutOptions,
} from "@/lib/validations/registration";
import { cohort } from "@/lib/content";

export function RegistrationForm() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [pendingPaymentId, setPendingPaymentId] = useState<string | null>(null);
  const [startingCheckout, setStartingCheckout] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<RegistrationInput>({
    resolver: zodResolver(registrationSchema),
  });

  const selectedPaymentMethod = watch("paymentMethod");

  async function startPaystackCheckout(paymentId: string) {
    setStartingCheckout(true);
    setServerError(null);
    try {
      const res = await fetch("/api/payments/paystack/initialize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentId }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok || !body?.authorizationUrl) {
        setPendingPaymentId(paymentId);
        setServerError(body?.error ?? "Couldn't start the Paystack checkout. Please try again.");
        setStartingCheckout(false);
        return;
      }
      window.location.href = body.authorizationUrl;
    } catch {
      setPendingPaymentId(paymentId);
      setServerError("Couldn't reach the server. Check your connection and try again.");
      setStartingCheckout(false);
    }
  }

  async function onSubmit(values: RegistrationInput) {
    setServerError(null);
    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      const body = await res.json().catch(() => null);

      if (!res.ok) {
        setServerError(body?.error ?? "Something went wrong. Please try again.");
        return;
      }

      if (body.method === "Paystack") {
        await startPaystackCheckout(body.paymentId);
      } else {
        router.push(`/pay/bank-transfer/${body.paymentId}`);
      }
    } catch {
      setServerError("Couldn't reach the server. Check your connection and try again.");
    }
  }

  const busy = isSubmitting || startingCheckout;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8" noValidate>
      {serverError && (
        <div role="alert" className="rounded-lg border border-error/30 bg-error/10 px-4 py-3 text-sm text-error">
          {serverError}
          {pendingPaymentId && (
            <button
              type="button"
              onClick={() => startPaystackCheckout(pendingPaymentId)}
              disabled={startingCheckout}
              className="ml-2 font-semibold underline underline-offset-2 disabled:opacity-60"
            >
              Try again
            </button>
          )}
        </div>
      )}

      <fieldset className="grid gap-5 sm:grid-cols-2">
        <legend className="sr-only">Personal details</legend>

        <Field label="Full name" htmlFor="fullName" error={errors.fullName?.message} className="sm:col-span-2">
          <input id="fullName" className={inputClass} placeholder="Jane Doe" {...register("fullName")} />
        </Field>

        <Field label="Email address" htmlFor="email" error={errors.email?.message}>
          <input id="email" type="email" className={inputClass} placeholder="jane@email.com" {...register("email")} />
        </Field>

        <Field label="Phone number" htmlFor="phone" error={errors.phone?.message}>
          <input id="phone" type="tel" className={inputClass} placeholder="080..." {...register("phone")} />
        </Field>

        <Field label="Age" htmlFor="age" error={errors.age?.message}>
          <input id="age" type="number" className={inputClass} placeholder="21" {...register("age")} />
        </Field>

        <Field label="Gender" htmlFor="gender" error={errors.gender?.message}>
          <select id="gender" className={inputClass} defaultValue="" {...register("gender")}>
            <option value="" disabled>
              Select
            </option>
            {genderOptions.map((o) => (
              <option key={o} value={o} className="bg-[#0F172A] text-white"> 
                {o}
              </option>
            ))}
          </select>
        </Field>

        <Field label="State" htmlFor="state" error={errors.state?.message}>
          <input id="state" className={inputClass} placeholder="Delta" {...register("state")} />
        </Field>

        <Field label="City" htmlFor="city" error={errors.city?.message}>
          <input id="city" className={inputClass} placeholder="Asaba" {...register("city")} />
        </Field>

        <Field label="Occupation" htmlFor="occupation" error={errors.occupation?.message}>
          <input id="occupation" className={inputClass} placeholder="Student, trader, etc." {...register("occupation")} />
        </Field>

        <Field label="Education level" htmlFor="educationLevel" error={errors.educationLevel?.message}>
          <select id="educationLevel" className={inputClass} defaultValue="" {...register("educationLevel")}>
            <option value="" disabled>
              Select
            </option>
            {educationOptions.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        </Field>
      </fieldset>

      <fieldset className="grid gap-5 sm:grid-cols-2">
        <legend className="sr-only">Readiness</legend>

        <Field label="Do you own a laptop?" htmlFor="ownsLaptop" error={errors.ownsLaptop?.message}>
          <select id="ownsLaptop" className={inputClass} defaultValue="" {...register("ownsLaptop")}>
            <option value="" disabled>
              Select
            </option>
            <option value="Yes">Yes</option>
            <option value="No">No</option>
          </select>
        </Field>

        <Field label="Previous coding experience" htmlFor="codingExperience" error={errors.codingExperience?.message}>
          <select id="codingExperience" className={inputClass} defaultValue="" {...register("codingExperience")}>
            <option value="" disabled>
              Select
            </option>
            {experienceOptions.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        </Field>

        <Field label="How did you hear about ETI?" htmlFor="hearAboutETI" error={errors.hearAboutETI?.message} className="sm:col-span-2">
          <select id="hearAboutETI" className={inputClass} defaultValue="" {...register("hearAboutETI")}>
            <option value="" disabled>
              Select
            </option>
            {hearAboutOptions.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        </Field>

        <Field
          label="Why do you want to join this cohort?"
          htmlFor="motivation"
          error={errors.motivation?.message}
          className="sm:col-span-2"
        >
          <textarea
            id="motivation"
            rows={4}
            className={inputClass}
            placeholder="Tell us what you're hoping to get out of the cohort..."
            {...register("motivation")}
          />
        </Field>
      </fieldset>

      <PaymentMethodSelector
        registerField={register("paymentMethod")}
        selected={selectedPaymentMethod}
        error={errors.paymentMethod?.message}
      />

      <div className="flex items-start gap-3 rounded-lg border border-white/10 bg-white/[0.03] p-4">
        <input
          id="agreesToTerms"
          type="checkbox"
          className="mt-0.5 h-4 w-4 rounded border-white/20 bg-transparent accent-signal-500"
          {...register("agreesToTerms")}
        />
        <label htmlFor="agreesToTerms" className="text-sm text-mist">
          I confirm the information above is accurate and I agree to be contacted by Elora Tech
          Institute about the {cohort.title} ({cohort.fee}).
        </label>
      </div>
      {errors.agreesToTerms && (
        <p role="alert" className="text-xs text-error">
          {errors.agreesToTerms.message}
        </p>
      )}

      <button type="submit" disabled={busy} className="btn-primary w-full disabled:opacity-60">
        {busy ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            {startingCheckout ? "Redirecting to Paystack..." : "Submitting..."}
          </>
        ) : (
          <>
            Submit Registration
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </>
        )}
      </button>
    </form>
  );
}
