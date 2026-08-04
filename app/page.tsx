import { Header } from "@/components/sections/Header";
import { Hero } from "@/components/sections/Hero";
import { WhyChooseETI } from "@/components/sections/WhyChooseETI";
import { Curriculum } from "@/components/sections/Curriculum";
import { StudentProjects } from "@/components/sections/StudentProjects";
import { WhyAINotEnough } from "@/components/sections/WhyAINotEnough";
import { Pricing } from "@/components/sections/Pricing";
import { Testimonials } from "@/components/sections/Testimonials";
import { FAQ } from "@/components/sections/FAQ";
import { FinalCTA } from "@/components/sections/FinalCTA";
import { Footer } from "@/components/sections/Footer";

export default function HomePage() {
  return (
    <>
      <Header />
      <main>
        <Hero />
        <WhyChooseETI />
        <Curriculum />
        <StudentProjects />
        <WhyAINotEnough />
        <Pricing />
        <Testimonials />
        <FAQ />
        <FinalCTA />
      </main>
      <Footer />
    </>
  );
}
