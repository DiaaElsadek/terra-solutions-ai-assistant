import { Hero } from "@/components/landing/Hero";
import { FeaturesSection } from "@/components/landing/FeaturesSection";
import { ProductsSection } from "@/components/landing/ProductsSection";
import { CompanyIntro } from "@/components/landing/CompanyIntro";

export default function HomePage() {
  return (
    <>
      <Hero />
      <FeaturesSection />
      <ProductsSection />
      <CompanyIntro />
    </>
  );
}

