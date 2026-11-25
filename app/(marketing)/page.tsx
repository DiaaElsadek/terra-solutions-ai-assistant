import { Hero } from "@/components/landing/Hero";
import { HowItWorksSection } from "@/components/landing/HowItWorksSection";
import { FeaturesSection } from "@/components/landing/FeaturesSection";
import { ProductsSection } from "@/components/landing/ProductsSection";
import { CompanyIntro } from "@/components/landing/CompanyIntro";
import { getPublicDatasetOverview } from "@/lib/knowledge/public-summary";

export default function HomePage() {
  const overview = getPublicDatasetOverview();

  return (
    <>
      <Hero overview={overview} />
      <HowItWorksSection />
      <FeaturesSection />
      <ProductsSection />
      <CompanyIntro />
    </>
  );
}
