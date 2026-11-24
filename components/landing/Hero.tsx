import Link from "next/link";
import { ArrowRight, Sparkles, Search, ShieldCheck, Globe } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { ROUTES } from "@/constants/config";

/**
 * Hero section introducing Terra AI Assistant to call center agents.
 */
export function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-border bg-background">
      {/* Subtle radial accent matching Terra dark+gold identity */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 h-96 w-[44rem] rounded-full bg-primary/10 blur-3xl"
      />

      <div className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <Badge variant="gold" className="mb-6">
            <Sparkles className="h-3.5 w-3.5" />
            Internal Call Center Knowledge Assistant
          </Badge>

          <h1 className="font-display text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl leading-[1.1]">
            Instant Clinical &amp; Product Answers for{" "}
            <span className="terra-gradient-text">Terra Solutions</span>
          </h1>

          <p className="mt-6 text-base sm:text-lg text-foreground-muted leading-relaxed max-w-2xl mx-auto">
            Replace manual spreadsheet searches with a bilingual conversational workspace.
            Retrieve verified details on treatments, aesthetic devices, clinic availability,
            and safety protocols in seconds.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href={ROUTES.chat} className="w-full sm:w-auto">
              <Button
                variant="primary"
                size="lg"
                className="w-full sm:w-auto terra-glow"
                rightIcon={<ArrowRight className="h-4 w-4" />}
              >
                Launch AI Assistant
              </Button>
            </Link>
            <Link href="/#services" className="w-full sm:w-auto">
              <Button variant="outline" size="lg" className="w-full sm:w-auto">
                Explore Products &amp; Services
              </Button>
            </Link>
          </div>
        </div>

        {/* 3 concise value pillars */}
        <div className="mt-16 grid grid-cols-1 gap-4 sm:grid-cols-3 max-w-4xl mx-auto">
          <div className="rounded-xl border border-border bg-background-secondary p-5">
            <Search className="h-5 w-5 text-primary mb-2.5" />
            <h2 className="font-display text-sm font-semibold text-foreground">
              Excel-Backed Truth
            </h2>
            <p className="mt-1 text-xs text-foreground-muted leading-relaxed">
              Indexed directly from Terra&apos;s official spreadsheets with sheet-level source references.
            </p>
          </div>

          <div className="rounded-xl border border-border bg-background-secondary p-5">
            <Globe className="h-5 w-5 text-primary mb-2.5" />
            <h2 className="font-display text-sm font-semibold text-foreground">
              Arabic &amp; English Ready
            </h2>
            <p className="mt-1 text-xs text-foreground-muted leading-relaxed">
              Ask naturally in Arabic or English and receive clear, scannable answers mid-call.
            </p>
          </div>

          <div className="rounded-xl border border-border bg-background-secondary p-5">
            <ShieldCheck className="h-5 w-5 text-primary mb-2.5" />
            <h2 className="font-display text-sm font-semibold text-foreground">
              Zero Fabrication
            </h2>
            <p className="mt-1 text-xs text-foreground-muted leading-relaxed">
              Explicitly flags missing data and directs clinical suitability checks to specialists.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

