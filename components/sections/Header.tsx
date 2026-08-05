import Link from "next/link";
import { Container } from "@/components/ui/Container";

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
        <Link href="/" className="font-display text-base font-semibold text-white">
          Elora<span className="text-signal-400">Tech</span>
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

        <Link href="/register" className="btn-primary !px-5 !py-2.5 !text-xs sm:!px-6 sm:!text-sm">
          Register Now
        </Link>
      </Container>
    </header>
  );
}
