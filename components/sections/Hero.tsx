import Link from "next/link";
import { CalendarDays, Hourglass, Wallet, ArrowRight } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { CodeTerminal } from "./CodeTerminal";
import { cohort } from "@/lib/content";

const badges = [
  { icon: CalendarDays, label: `Starts ${cohort.cadence}` },
  { icon: Hourglass, label: cohort.duration },
  { icon: Wallet, label: cohort.fee },
];

export function Hero() {
  return (
    <section className="section-grid-bg relative overflow-hidden pt-32 pb-24 sm:pt-40 sm:pb-32">
      <div className="absolute inset-0 -z-10 bg-glow-radial" aria-hidden="true" />

      <Container className="grid gap-16 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
        <div>
          <p className="eyebrow">Elora Tech Institute · {cohort.cadence} Cohort</p>

          <h1 className="mt-5 text-4xl font-semibold leading-[1.08] sm:text-5xl lg:text-6xl">
            Become a{" "}
            <span className="bg-brand-gradient bg-clip-text text-transparent">Web Developer</span>{" "}
            in Just 7 Weeks
          </h1>

          <p className="mt-6 max-w-xl text-lg leading-relaxed text-mist">
            Master HTML, CSS, JavaScript, and AI tools like ChatGPT, Claude, and DeepSeek to build
            modern websites faster — while understanding every line of code.
          </p>

          <div className="mt-9 flex flex-wrap items-center gap-4">
            <Link href="/register" className="btn-primary">
              Register Now
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <a href="#curriculum" className="btn-secondary">
              View Curriculum
            </a>
          </div>

          <ul className="mt-10 flex flex-wrap gap-3" aria-label="Cohort details">
            {badges.map(({ icon: Icon, label }) => (
              <li
                key={label}
                className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-white/90 backdrop-blur-md"
              >
                <Icon className="h-4 w-4 text-signal-400" aria-hidden="true" />
                {label}
              </li>
            ))}
          </ul>
        </div>

        <div className="flex justify-center lg:justify-end">
          <CodeTerminal />
        </div>
      </Container>
    </section>
  );
}
