import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PartyPopper, CalendarDays, Hourglass, IdCard } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { createAdminClient } from "@/lib/supabase/admin";

export const metadata: Metadata = { title: "Welcome to ETI", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const nextSteps = [
  "Save your Student ID below — you'll need it for support requests.",
  "Check your email for a copy of this confirmation.",
  "Keep an eye on your inbox for class scheduling details closer to the start date.",
  "Make sure your laptop is set up and ready before week one.",
];

export default async function OnboardingPage({ params }: { params: Promise<{ studentId: string }> }) {
  const { studentId } = await params;
  const supabase = createAdminClient();

  const { data: student } = await supabase
    .from("students")
    .select("*")
    .eq("student_code", studentId)
    .single();

  if (!student) notFound();

  const { data: cohort } = await supabase.from("cohorts").select("*").eq("id", student.cohort_id).single();

  const startsOnFormatted = cohort
    ? new Date(cohort.starts_on).toLocaleDateString("en-NG", { day: "numeric", month: "long", year: "numeric" })
    : null;

  return (
    <main className="section-grid-bg min-h-screen py-20 sm:py-28">
      <Container className="max-w-xl text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gold-500">
          <PartyPopper className="h-8 w-8 text-ink-900" aria-hidden="true" />
        </div>

        <h1 className="mt-6 text-3xl font-semibold text-white sm:text-4xl">
          Congratulations, {student.full_name.split(" ")[0]}!
        </h1>
        <p className="mt-4 text-base leading-relaxed text-mist">
          Your payment is confirmed and your seat in {cohort?.name ?? "the cohort"} is secured. Build the
          skills needed to create real-world digital solutions — we&apos;re glad to have you.
        </p>

        <div className="glass-panel mt-10 grid grid-cols-1 gap-4 p-6 text-left sm:grid-cols-3 sm:p-8">
          <div>
            <IdCard className="h-5 w-5 text-sky-400" aria-hidden="true" />
            <p className="mt-2 text-xs uppercase tracking-wide text-mist">Student ID</p>
            <p className="mt-1 font-mono text-sm font-semibold text-white">{student.student_code}</p>
          </div>
          {cohort && (
            <>
              <div>
                <CalendarDays className="h-5 w-5 text-sky-400" aria-hidden="true" />
                <p className="mt-2 text-xs uppercase tracking-wide text-mist">Starts</p>
                <p className="mt-1 text-sm font-semibold text-white">{startsOnFormatted}</p>
              </div>
              <div>
                <Hourglass className="h-5 w-5 text-sky-400" aria-hidden="true" />
                <p className="mt-2 text-xs uppercase tracking-wide text-mist">Duration</p>
                <p className="mt-1 text-sm font-semibold text-white">{cohort.duration_weeks} weeks</p>
              </div>
            </>
          )}
        </div>

        <div className="glass-panel mt-6 p-6 text-left sm:p-8">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-sky-400">Next steps</h2>
          <ul className="mt-4 space-y-3">
            {nextSteps.map((step) => (
              <li key={step} className="flex items-start gap-3 text-sm text-white/90">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-signal-500" aria-hidden="true" />
                {step}
              </li>
            ))}
          </ul>
        </div>
      </Container>
    </main>
  );
}
