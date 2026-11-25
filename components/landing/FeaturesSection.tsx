import {
  Database,
  Languages,
  Table2,
  Zap,
  FileSpreadsheet,
  ShieldCheck,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";

const CAPABILITIES = [
  {
    icon: Database,
    title: "Centralized Company Knowledge",
    titleAr: "قاعدة معرفة موحدة",
    description:
      "Services, aesthetic devices, treatment comparisons, packages, and safety sheets consolidated into one workspace.",
  },
  {
    icon: Languages,
    title: "Bilingual Arabic & English",
    titleAr: "دعم عربي وإنجليزي سلس",
    description:
      "Understands natural Egyptian Arabic, Modern Standard Arabic, and English queries with accurate RTL/LTR formatting.",
  },
  {
    icon: Table2,
    title: "Structured Executive Briefings",
    titleAr: "إجابات منظمة وسهلة القراءة",
    description:
      "Complex details render cleanly as comparison tables, price metrics, bullet guidance, and safety callouts.",
  },
  {
    icon: Zap,
    title: "Built for Live Call Speed",
    titleAr: "مصمم لسرعة المكالمات",
    description:
      "One-click number copy, category prompt starters, keyboard shortcuts, and clear missing-info disclosure.",
  },
  {
    icon: FileSpreadsheet,
    title: "Source-Verified Citations",
    titleAr: "مصادر موثقة بالصف والخلية",
    description:
      "Inspect exact workbook file, sheet name, row number, and spreadsheet link directly behind every retrieved answer.",
  },
  {
    icon: ShieldCheck,
    title: "Consistent Clinical Boundaries",
    titleAr: "توجيه دقيق أثناء الاستفسارات",
    description:
      "Enforces pregnancy/lactation screening rules and directs medical evaluations clearly to clinic specialists.",
  },
] as const;

/**
 * Real verified workspace capabilities section aligned visually with the chat workspace.
 */
export function FeaturesSection() {
  return (
    <section
      id="capabilities"
      className="py-16 sm:py-20 bg-background border-b border-border/80"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mb-10 sm:mb-12">
          <Badge variant="gold" className="mb-3">
            Workspace Capabilities
          </Badge>
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
            Engineered Around Call Center &amp; Support Workflows
          </h2>
          <p className="mt-2.5 text-sm sm:text-base text-foreground-muted leading-relaxed">
            Every visual element is designed so agents retrieve verified answers
            accurately while speaking with customers.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {CAPABILITIES.map((cap) => {
            const Icon = cap.icon;
            return (
              <div
                key={cap.title}
                className="terra-panel rounded-xl p-5 space-y-3 hover:border-border-hover transition-colors"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-primary/25 bg-primary/10 text-primary">
                    <Icon className="h-4 w-4" />
                  </span>
                  <span
                    dir="rtl"
                    className="text-[11px] font-medium text-terra-gold-pale/85"
                  >
                    {cap.titleAr}
                  </span>
                </div>
                <div className="space-y-1.5">
                  <h3 className="font-display text-sm sm:text-[15px] font-semibold text-foreground">
                    {cap.title}
                  </h3>
                  <p className="text-xs sm:text-[13px] text-foreground-muted leading-relaxed">
                    {cap.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

