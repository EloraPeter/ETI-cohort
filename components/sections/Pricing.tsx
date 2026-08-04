import Link from "next/link";
import { Check, ArrowRight } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { cohort, pricingInclusions } from "@/lib/content";

export function Pricing() {
  return (
    <section id="pricing" className="py-24 sm:py-32">
      <Container>
        <SectionHeading
          eyebrow="Pricing"
          title="One clear price. No hidden add-ons."
          description="Everything you need for the cohort is included — nothing is upsold to you after you've registered."
        />

        <div className="mx-auto mt-14 max-w-md">
          <div className="glass-panel relative overflow-hidden p-8">
            <div className="absolute -right-16 -top-16 h-40 w-40 rounded-full bg-signal-violet opacity-30 blur-3xl" aria-hidden="true" />

            <p className="font-mono text-xs uppercase tracking-[0.2em] text-signal-400">
              {cohort.title} · {cohort.cadence}
            </p>
            <p className="mt-4 font-display text-5xl font-semibold text-white">{cohort.fee}</p>
            <p className="mt-1 text-sm text-mist">One-time fee · {cohort.duration}</p>

            <ul className="mt-8 space-y-3">
              {pricingInclusions.map((item) => (
                <li key={item} className="flex items-start gap-3 text-sm text-white/90">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-signal-400" aria-hidden="true" />
                  {item}
                </li>
              ))}
            </ul>

            <Link href="/register" className="btn-primary mt-8 w-full">
              Register Now
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <p className="mt-3 text-center text-xs text-mist">Limited slots for the {cohort.cadence} cohort.</p>
          </div>
        </div>
      </Container>
    </section>
  );
}
