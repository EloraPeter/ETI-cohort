import { Container } from "@/components/ui/Container";

const points = [
  {
    title: "AI writes code. It doesn't debug your understanding.",
    body: "When AI-generated code breaks in a way it can't fix, you need to read the error yourself. That skill only comes from actually learning the fundamentals.",
  },
  {
    title: "Clients and employers ask questions AI can't answer for you.",
    body: "\"Why did you structure it this way?\" is a question about your judgment, not a prompt. You need to be able to explain — and defend — your own work.",
  },
  {
    title: "The best AI-assisted developers are strong developers first.",
    body: "AI multiplies existing skill. It doesn't replace it. Someone who understands HTML, CSS, and JavaScript gets dramatically more out of ChatGPT, Claude, and DeepSeek than someone who doesn't.",
  },
];

export function WhyAINotEnough() {
  return (
    <section className="border-y border-white/5 bg-ink-800/60 py-24 sm:py-32">
      <Container className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
        <div>
          <p className="eyebrow">The honest part</p>
          <h2 className="mt-3 text-3xl font-semibold sm:text-4xl">
            Why AI isn&apos;t enough on its own
          </h2>
          <p className="mt-4 text-base leading-relaxed text-mist">
            We teach AI tools deliberately, in week six and seven — after the fundamentals, not
            instead of them. Here&apos;s the reasoning behind that order.
          </p>
        </div>

        <div className="space-y-8">
          {points.map((point) => (
            <div key={point.title} className="border-l-2 border-signal-500 pl-6">
              <h3 className="text-base font-semibold text-white">{point.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-mist">{point.body}</p>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
