import Link from "next/link";
import { Building2, CheckCircle2, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ROUTES } from "@/constants/config";
import { getKnowledgeRecords, getKnowledgeSheetCount } from "@/lib/knowledge/data";

/** Verified partner clinics referenced inside the supplied Excel dataset. */
const VERIFIED_CLINICS = [
  { name: "Well Touch", scope: "Q-Switch PV Laser Tattoo Removal & Z-Lipo / Z-Wave Slimming" },
  { name: "New Age", scope: "DEKA Q-Switch Tattoo Removal (with Dr. Mitra)" },
  { name: "Demadent + VIP", scope: "PV Laser + SPECTRA Tattoo Removal & Microblading Consultation" },
  { name: "One Touch", scope: "Q-Switch Ultralight, Cool Shaping, Lipozero, HIFU & InBody" },
] as const;

/**
 * Company introduction built solely from verified Terra Solutions details.
 */
export function CompanyIntro() {
  const totalRecords = getKnowledgeRecords().length;
  const totalSheets = getKnowledgeSheetCount();

  return (
    <section id="about" className="py-20 bg-background">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-2 lg:items-center">
          {/* Left column */}
          <div>
            <Badge variant="gold" className="mb-4">
              About Terra Solutions
            </Badge>
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-foreground tracking-tight">
              Built for Fast, Accurate Call Center Operations
            </h2>
            <p className="mt-4 text-base text-foreground-muted leading-relaxed">
              Terra Solutions delivers Call Center, Chat Support, and BPO services in Egypt,
              supporting aesthetic and dental clinics with trained customer support specialists.
            </p>
            <p className="mt-3 text-base text-foreground-muted leading-relaxed">
              Instead of navigating {totalSheets} separate Excel sheets mid-call, Terra AI Assistant
              unifies {totalRecords} structured knowledge sections into one fast conversational tool —
              helping agents answer customer inquiries consistently while respecting clinical boundaries.
            </p>

            <ul className="mt-6 space-y-3">
              {[
                "Structured product tables, device specs, and pre/post-care protocols",
                "Dedicated pregnancy and lactation safety matrix for quick screening",
                "Clear source attribution back to the original company spreadsheet",
              ].map((point) => (
                <li
                  key={point}
                  className="flex items-start gap-2.5 text-sm text-terra-gold-light"
                >
                  <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  <span>{point}</span>
                </li>
              ))}
            </ul>

            <div className="mt-8">
              <Link href={ROUTES.chat}>
                <Button
                  variant="primary"
                  size="lg"
                  rightIcon={<ArrowRight className="h-4 w-4" />}
                >
                  Start Using Terra AI
                </Button>
              </Link>
            </div>
          </div>

          {/* Right column: Verified clinics covered in dataset */}
          <div className="rounded-2xl border border-border bg-background-secondary p-6 sm:p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/15 border border-primary/30 text-primary">
                <Building2 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-display text-lg font-semibold text-foreground">
                  Clinics Referenced in Knowledge Base
                </h3>
                <p className="text-xs text-foreground-muted">
                  Verified from Tattoo Removal &amp; Slimming operational sheets
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {VERIFIED_CLINICS.map((clinic) => (
                <div
                  key={clinic.name}
                  className="rounded-xl border border-border bg-background-tertiary/70 p-4"
                >
                  <div className="font-display text-sm font-semibold text-primary">
                    {clinic.name}
                  </div>
                  <p className="mt-1 text-xs text-foreground-muted leading-relaxed">
                    {clinic.scope}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

