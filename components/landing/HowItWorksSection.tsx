import {
  MessageSquare,
  Search,
  ShieldCheck,
  TableProperties,
} from "lucide-react";

const WORKFLOW_STEPS = [
  {
    step: "01",
    icon: MessageSquare,
    title: "Ask Naturally",
    detail: "Employees type in Arabic, English, or mixed phrasing mid-call.",
  },
  {
    step: "02",
    icon: Search,
    title: "Knowledge Lookup",
    detail: "Hybrid search matches official clinic sheets, aliases, and rules.",
  },
  {
    step: "03",
    icon: ShieldCheck,
    title: "Grounding Check",
    detail: "Discloses missing prices and blocks undocumented service claims.",
  },
  {
    step: "04",
    icon: TableProperties,
    title: "Structured Answer",
    detail: "Outputs scannable tables, metrics, and exact Google Sheet cell links.",
  },
] as const;

/**
 * Clean 4-step operational workflow strip illustrating how Terra Solutions Assistant
 * answers call-center inquiries without exposing internal engineering complexity.
 */
export function HowItWorksSection() {
  return (
    <section className="py-12 sm:py-16 bg-background-secondary border-b border-border/80">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-primary">
              Operational Workflow
            </p>
            <h2 className="mt-1 font-display text-xl sm:text-2xl font-bold text-foreground tracking-tight">
              From Customer Question to Verified Source in Seconds
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-foreground-muted max-w-md">
            Designed around live customer calls so agents scan facts cleanly without switching tabs.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {WORKFLOW_STEPS.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.step}
                className="terra-panel rounded-xl p-4 space-y-2.5"
              >
                <div className="flex items-center justify-between">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-primary/25 bg-primary/10 text-primary">
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="font-mono text-[11px] font-semibold text-primary/70 terra-tabular">
                    {item.step}
                  </span>
                </div>
                <h3 className="font-display text-sm font-semibold text-foreground">
                  {item.title}
                </h3>
                <p className="text-xs leading-relaxed text-foreground-muted">
                  {item.detail}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

