import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Container } from "@/components/ui/Container";

export function FinalCTA() {
  return (
    <section className="py-24 sm:py-32">
      <Container>
        <div className="glass-panel relative overflow-hidden px-8 py-16 text-center sm:px-16">
          <div className="absolute inset-0 -z-10 bg-signal-violet opacity-20" aria-hidden="true" />
          <h2 className="text-3xl font-semibold text-white sm:text-4xl">
            Ready to start your tech journey?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base text-mist">
            Limited slots available for the September 2026 cohort. Register today to secure yours.
          </p>
          <Link href="/register" className="btn-primary mt-8">
            Register Today
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </Container>
    </section>
  );
}
