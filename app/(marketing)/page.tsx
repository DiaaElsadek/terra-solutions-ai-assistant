import { Hero } from "@/components/landing/Hero";
import { ProductsSection } from "@/components/landing/ProductsSection";
import { CompanyIntro } from "@/components/landing/CompanyIntro";

export default function HomePage() {
  return (
    <>
      <Hero />
      <ProductsSection />
      <CompanyIntro />
    </>
  );
}

