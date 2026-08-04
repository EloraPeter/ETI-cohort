import { Plus } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { faqs } from "@/lib/content";

export function FAQ() {
  return (
    <section id="faq" className="py-24 sm:py-32">
      <Container className="max-w-3xl">
        <SectionHeading eyebrow="FAQ" title="Questions worth answering upfront" />

        <div className="mt-12 divide-y divide-white/10 border-y border-white/10">
          {faqs.map((item) => (
            <details key={item.q} className="group py-5">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-left text-sm font-medium text-white sm:text-base">
                {item.q}
                <Plus
                  className="h-4 w-4 shrink-0 text-signal-400 transition-transform duration-200 group-open:rotate-45"
                  aria-hidden="true"
                />
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-mist">{item.a}</p>
            </details>
          ))}
        </div>
      </Container>
    </section>
  );
}
