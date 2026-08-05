import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { curriculum } from "@/lib/content";

export function Curriculum() {
  return (
    <section id="curriculum" className="py-24 sm:py-32">
      <Container>
        <SectionHeading
          eyebrow="Curriculum"
          title="Seven weeks, in order, for a reason"
          description="Each week builds on the last — you won't touch APIs before you can manipulate the DOM, and you won't touch AI tools before you can read the code they write."
        />

        <ol className="mt-16 space-y-4">
          {curriculum.map((week) => (
            <li key={week.week} className="glass-panel flex flex-col gap-4 p-6 sm:flex-row sm:items-start sm:gap-8">
              <div className="font-mono text-sm text-signal-400 sm:w-20 sm:shrink-0">
                Week {String(week.week).padStart(2, "0")}
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">{week.title}</h3>
                <ul className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-sm text-mist">
                  {week.topics.map((topic) => (
                    <li key={topic} className="before:mr-2 before:text-sky-400 before:content-['—']">
                      {topic}
                    </li>
                  ))}
                </ul>
              </div>
            </li>
          ))}
        </ol>
      </Container>
    </section>
  );
}
