import { Hero } from '@/sections/Hero';
import { HowItWorks } from '@/sections/HowItWorks';
import { Features } from '@/sections/Features';
import { Themes } from '@/sections/Themes';
import { Scoring } from '@/sections/Scoring';
import { CtaBanner } from '@/sections/CtaBanner';
import { Footer } from '@/sections/Footer';

export default function HomePage() {
  return (
    <>
      <Hero />
      <HowItWorks />
      <Features />
      <Themes />
      <Scoring />
      <CtaBanner />
      <Footer />
    </>
  );
}
