import Link from "next/link";
import {
  Droplets,
  Sparkles,
  Layers,
  User,
  Zap,
  Scissors,
  Heart,
  Droplet,
  Flower2,
  Eraser,
  ShieldCheck,
  Activity,
  Cpu,
  SmilePlus,
  ArrowUpRight,
  type LucideIcon,
} from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { getPublicCategorySummaries } from "@/lib/knowledge/public-summary";
import { ROUTES } from "@/constants/config";

const ICON_MAP: Record<string, LucideIcon> = {
  Droplets,
  Sparkles,
  Layers,
  User,
  Zap,
  Scissors,
  Heart,
  Droplet,
  Flower2,
  Eraser,
  ShieldCheck,
  Activity,
  Cpu,
  SmilePlus,
};

/** Verified sample highlights per category taken strictly from the Excel dataset. */
const VERIFIED_HIGHLIGHTS: Record<string, string[]> = {
  fillers: ["Juvederm", "Teosyal RHA", "Radiesse", "Aliaxin", "Neauvia"],
  botox: ["Botox 100u", "Dysport", "Nabota", "Xeomin"],
  threads: ["Lifting Threads", "Mono Threads", "Aptos", "PDO"],
  "body-fillers": ["Goldfill", "Jealfil", "Privilege"],
  laser: ["Candela GentleMax Pro+", "Cynosure Elite+", "DEKA", "Quanta Duo"],
  "hair-treatments": ["Dr. CYJ Hair Filler", "PRP + Biotin", "Stem Cells", "Mesotherapy"],
  "face-treatments": ["Mesotherapy", "PRP", "Stem Cell Therapy"],
  "skin-boosters": ["Profhilo", "Jalupro", "Exofecta", "Sculptra"],
  facial: ["Hydrafacial", "Dermapen", "Factor Five", "TCA Peeling"],
  "tattoo-removal": ["PV Laser", "SPECTRA", "DEKA Q-Switch", "Ultralight"],
  "pregnancy-safety": ["20-Treatment Safety Matrix", "Pregnancy Rules", "Lactation Rules"],
  slimming: ["Wegovy", "Endolift", "Z-Lipo", "HIFU", "Venus Legacy"],
  "facial-machines": ["Vivace", "Clear + Brilliant", "OxyGeneo", "Plasmage", "CO2"],
  dental: ["E-Max Veneers", "2D–Diamond Smiles", "Night Guard", "Snap-On Smile"],
};

/**
 * Displays verified product and service categories extracted from the company dataset.
 */
export function ProductsSection() {
  const categories = getPublicCategorySummaries();

  return (
    <section id="services" className="py-20 bg-background-secondary border-b border-border">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mb-12">
          <Badge variant="gold" className="mb-3">
            Verified Knowledge Catalog
          </Badge>
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-foreground tracking-tight">
            Products, Treatments &amp; Clinic Devices
          </h2>
          <p className="mt-3 text-base text-foreground-muted leading-relaxed">
            Every category below is indexed directly from Terra Solutions&apos; operational
            knowledge spreadsheets. Select any category to query Terra Solutions Assistant directly.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((cat) => {
            const IconComponent = ICON_MAP[cat.icon] || Sparkles;
            const highlights = VERIFIED_HIGHLIGHTS[cat.id] || [];

            return (
              <Card key={cat.id} hoverable className="flex flex-col justify-between">
                <CardHeader>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 border border-primary/30 text-primary">
                      <IconComponent className="h-5 w-5" />
                    </div>
                    <Badge variant="muted">
                      {cat.recordCount} {cat.recordCount === 1 ? "record" : "records"}
                    </Badge>
                  </div>

                  <CardTitle className="flex items-baseline justify-between gap-2">
                    <span>{cat.nameEn}</span>
                    <span className="text-xs font-normal text-terra-gold-pale" dir="rtl">
                      {cat.nameAr}
                    </span>
                  </CardTitle>

                  <CardDescription className="mt-2">
                    {cat.description}
                  </CardDescription>

                  {highlights.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-1.5">
                      {highlights.map((item) => (
                        <span
                          key={item}
                          className="rounded-md bg-background-tertiary px-2 py-0.5 text-[11px] text-foreground-muted border border-border"
                        >
                          {item}
                        </span>
                      ))}
                    </div>
                  )}
                </CardHeader>

                <CardFooter>
                  <Link
                    href={`${ROUTES.chat}?q=${encodeURIComponent(cat.nameEn)}`}
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary-hover transition-colors"
                  >
                    Ask Assistant about {cat.nameEn}
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  </Link>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}

