import {
  Sparkles,
  Radio,
  Bot,
  FolderGit2,
  Users,
  BadgeCheck,
  MessageCircleHeart,
} from "lucide-react";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { features } from "@/lib/content";

const icons = [Sparkles, Radio, Bot, FolderGit2, Users, BadgeCheck, MessageCircleHeart];

export function WhyChooseETI() {
  return (
    <section className="py-24 sm:py-32">
      <Container>
        <SectionHeading
          eyebrow="Why ETI"
          title="Built so you actually finish, and actually build"
          description="Every part of the cohort is designed around one outcome: you leave able to build real things, not just having watched someone else build them."
        />

        <div className="mt-16 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, i) => {
            const Icon = icons[i % icons.length] ?? Sparkles;
            return (
              <div key={feature.title} className="glass-panel p-6 transition-colors hover:bg-white/[0.06]">
                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-signal-violet">
                  <Icon className="h-5 w-5 text-white" aria-hidden="true" />
                </div>
                <h3 className="mt-5 text-lg font-semibold text-white">{feature.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-mist">{feature.description}</p>
              </div>
            );
          })}
        </div>
      </Container>
    </section>
  );
}
