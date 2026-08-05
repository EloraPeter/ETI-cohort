import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { studentProjects } from "@/lib/content";

export function StudentProjects() {
  return (
    <section id="projects" className="py-24 sm:py-32">
      <Container>
        <SectionHeading
          eyebrow="What you'll build"
          title="Six projects. All shipped, all yours."
          description="By week seven, these aren't exercises sitting in a folder — they're deployed, linkable projects for your portfolio."
        />

        <div className="mt-16 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {studentProjects.map((project) => (
            <div
              key={project.title}
              className="group relative aspect-[4/3] overflow-hidden rounded-xl2 border border-white/10 bg-ink-800"
            >
              <div className="absolute inset-0 bg-brand-gradient opacity-[0.12] transition-opacity duration-300 group-hover:opacity-25" />
              <div className="absolute inset-0 section-grid-bg opacity-40" aria-hidden="true" />
              <div className="absolute inset-x-0 bottom-0 p-5">
                <p className="font-mono text-xs uppercase tracking-wide text-sky-400">{project.tag}</p>
                <h3 className="mt-1 text-base font-semibold text-white">{project.title}</h3>
              </div>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
