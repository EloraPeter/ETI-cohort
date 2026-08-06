import { Container } from "@/components/ui/Container";
import Link from "next/link";
import Image from "next/image";

export function Footer() {
  return (
    <footer className="border-t border-white/5 py-10">
      <Container className="flex flex-col items-center justify-between gap-4 text-sm text-mist sm:flex-row">
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
        <p>&copy; {new Date().getFullYear()} Elora Tech Institute. All rights reserved.</p>
      </Container>
    </footer>
  );
}
