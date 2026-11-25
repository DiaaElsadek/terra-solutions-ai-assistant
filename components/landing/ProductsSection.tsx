import { Badge } from "@/components/ui/Badge";
import { getPublicCategorySummaries } from "@/lib/knowledge/public-summary";
import { ProductsExplorerClient } from "./ProductsExplorerClient";

/** Verified sample highlights per category taken strictly from the operational dataset. */
const VERIFIED_HIGHLIGHTS: Record<string, string[]> = {
  fillers: ["Juvederm", "Teosyal RHA", "Radiesse", "Aliaxin"],
  botox: ["Botox 100u", "Dysport", "Nabota", "Xeomin"],
  threads: ["Lifting Threads", "Mono Threads", "Aptos", "PDO"],
  "body-fillers": ["Goldfill", "Jealfil", "Privilege"],
  laser: ["Candela GentleMax Pro+", "Cynosure Elite+", "DEKA", "Quanta Duo"],
  "hair-treatments": ["Dr. CYJ Hair Filler", "PRP + Biotin", "Stem Cells"],
  "face-treatments": ["Mesotherapy", "PRP", "Stem Cell Therapy"],
  "skin-boosters": ["Profhilo", "Jalupro", "Exofecta", "Sculptra"],
  facial: ["Hydrafacial", "Dermapen", "Factor Five", "TCA Peeling"],
  "tattoo-removal": ["PV Laser", "SPECTRA", "DEKA Q-Switch"],
  "pregnancy-safety": ["20-Treatment Matrix", "Pregnancy Rules", "Lactation Rules"],
  slimming: ["Wegovy", "Endolift", "Z-Lipo", "HIFU"],
  "facial-machines": ["Vivace", "Clear + Brilliant", "OxyGeneo", "Plasmage"],
  dental: ["E-Max Veneers", "2D–Diamond Smiles", "Night Guard", "Snap-On"],
};

/**
 * Displays verified product and service categories extracted from the company dataset.
 */
export function ProductsSection() {
  const categories = getPublicCategorySummaries();

  return (
    <section id="services" className="py-16 sm:py-20 bg-background-secondary border-b border-border/80">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mb-9">
          <Badge variant="gold" className="mb-3">
            Verified Knowledge Coverage
          </Badge>
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
            Products, Treatments &amp; Clinic Devices
          </h2>
          <p className="mt-2.5 text-sm sm:text-base text-foreground-muted leading-relaxed">
            Every category below reflects approved Terra Solutions operational records. Select any department to open Terra Solutions Assistant with pre-filtered context.
          </p>
        </div>

        <ProductsExplorerClient
          categories={categories}
          highlights={VERIFIED_HIGHLIGHTS}
        />
      </div>
    </section>
  );
}
