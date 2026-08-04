import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { Container } from "@/components/ui/Container";

export const metadata: Metadata = {
  title: "Registration received",
  robots: { index: false, follow: false },
};

export default function RegistrationSuccessPage() {
  return (
    <main className="section-grid-bg flex min-h-screen items-center justify-center py-20">
      <Container className="max-w-lg text-center">
        <div className="glass-panel p-10 sm:p-14">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-signal-violet">
            <CheckCircle2 className="h-7 w-7 text-white" aria-hidden="true" />
          </div>

          <h1 className="mt-6 text-2xl font-semibold sm:text-3xl">Congratulations!</h1>
          <p className="mt-4 text-base leading-relaxed text-mist">
            Your application has been received successfully. Our admissions team will contact you
            shortly with payment instructions and the next steps.
          </p>

          <Link href="/" className="btn-secondary mt-8 inline-flex">
            Back to home
          </Link>
        </div>
      </Container>
    </main>
  );
}
