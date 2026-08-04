import { Container } from "@/components/ui/Container";

export function Footer() {
  return (
    <footer className="border-t border-white/5 py-10">
      <Container className="flex flex-col items-center justify-between gap-4 text-sm text-mist sm:flex-row">
        <p className="font-display text-white">
          Elora<span className="text-signal-400">Tech</span> Institute
        </p>
        <p>&copy; {new Date().getFullYear()} Elora Tech Institute. All rights reserved.</p>
      </Container>
    </footer>
  );
}
