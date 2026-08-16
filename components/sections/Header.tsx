import Link from "next/link";
import Image from "next/image";
import { GraduationCap } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { ROUTES } from "@/lib/routes";

const navLinks = [
  { href: "#curriculum", label: "Curriculum" },
  { href: "#projects", label: "Projects" },
  { href: "#pricing", label: "Pricing" },
  { href: "#faq", label: "FAQ" },
];

export function Header() {
  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-white/5 bg-ink-900/70 backdrop-blur-xl">
      <Container className="flex h-16 items-center justify-between">
        <Link href="/" className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Image
              src="/eti-logo1.jpg"
              alt="ETI Logo"
              width={45}
              height={45}
              className="h-[45px] w-[45px] rounded-[3px] bg-[#1D4ED8] object-cover flex-shrink-0"
            />

            <div className="font-display text-left font-semibold text-white leading-[1.2]">
              <div className="text-base">
                Elora<span className="text-[#F59E0B]">Tech</span>
              </div>

              <p className="m-0 text-[10px] font-normal uppercase tracking-[0.25em] text-white/50">
                Institute
              </p>
            </div>
          </div>
        </Link>

        <nav aria-label="Primary" className="hidden items-center gap-8 md:flex">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm text-mist transition-colors hover:text-white"
            >
              {link.label}
            </a>
          ))}
        </nav>

        {/* Visible at every breakpoint (not just md:flex like the anchor nav
            above) — existing students need this on mobile too. */}
        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            href={ROUTES.login}
            className="flex items-center gap-1.5 rounded-lg border border-white/15 px-3 py-2 text-xs font-medium text-white/80 transition-colors hover:bg-white/[0.06] hover:text-white sm:px-4 sm:text-sm"
          >
            <GraduationCap className="h-3.5 w-3.5 sm:h-4 sm:w-4" aria-hidden="true" />
            <span className="hidden sm:inline">Student Portal</span>
            <span className="sm:hidden">Portal</span>
          </Link>
          <Link href="/register" className="btn-primary !px-5 !py-2.5 !text-xs sm:!px-6 sm:!text-sm">
            Register Now
          </Link>
        </div>
      </Container>
    </header>
  );
}
