import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { RegistrationForm } from "@/components/RegistrationForm";
import { cohort } from "@/lib/content";

export const metadata: Metadata = {
  title: "Register",
  description: `Register for the ${cohort.cadence} ${cohort.title} at Elora Tech Institute. ${cohort.duration}, ${cohort.fee}, limited slots.`,
};

export default function RegisterPage() {
  return (
    <main className="section-grid-bg min-h-screen py-20 sm:py-28">
      <Container className="max-w-2xl">
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-mist hover:text-white">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to home
        </Link>

        <div className="mt-8">
          <p className="eyebrow">{cohort.cadence} Cohort</p>
          <h1 className="mt-3 text-3xl font-semibold sm:text-4xl">Register for the {cohort.title}</h1>
          <p className="mt-3 text-sm leading-relaxed text-mist">
            Takes about 3 minutes. Our admissions team will follow up by email or phone with
            payment instructions and next steps.
          </p>
        </div>

        <div className="glass-panel mt-10 p-6 sm:p-10">
          <RegistrationForm />
        </div>

        <p className="mt-6 text-center text-sm text-mist">
          Already started your enrollment?{" "}
          <Link href="/recovery" className="font-medium text-signal-400 underline">
            Continue your enrollment
          </Link>
        </p>
      </Container>
    </main>
  );
}
