import Hero from "@/components/Hero";
import Features from "@/components/Features";
import WhyChoose from "@/components/WhyChoose";
import GetStarted from "@/components/GetStarted";
import Pricing from "@/components/Pricing";
import FAQ from "@/components/FAQ";
import CTA from "@/components/CTA";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col">
      <Hero />
      <Features />
      <WhyChoose />
      <GetStarted />
      <Pricing />
      <FAQ />
      <CTA />
    </main>
  );
}
