"use client";

import { useState } from "react";
import Link from "next/link";
import { clsx } from "clsx";
import {
  ArrowRight,
  FileSpreadsheet,
  Languages,
  ShieldCheck,
  CheckCircle2,
  ExternalLink,
  ShieldAlert,
  Cpu,
  Tag,
} from "lucide-react";
import { TerraMark } from "@/components/branding/TerraMark";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { useAuth } from "@/lib/auth/context";
import { BRAND } from "@/constants/brand";
import { ROUTES } from "@/constants/config";

interface HeroProps {
  overview?: {
    sheetsCount: number;
    recordsCount: number;
    clinicsCount: number;
  };
}

type ShowcaseTab = "pricing" | "safety" | "device";

const SHOWCASE_TABS: Array<{
  id: ShowcaseTab;
  label: string;
  icon: typeof Tag;
}> = [
  { id: "pricing", label: "Pricing & Compare", icon: Tag },
  { id: "safety", label: "Safety Rules", icon: ShieldAlert },
  { id: "device", label: "Clinic Devices", icon: Cpu },
];

const TRUST_PILLARS = [
  {
    icon: FileSpreadsheet,
    title: "Sheet & Row Grounded",
    detail: "Every figure links back to the verified company sheet & cell.",
  },
  {
    icon: Languages,
    title: "Bilingual Support Ready",
    detail: "Natural Egyptian Arabic & English queries during live calls.",
  },
  {
    icon: ShieldCheck,
    title: "Clear Clinical Boundaries",
    detail: "Surfaces pregnancy & lactation rules and specialist handoffs.",
  },
];

/**
 * Executive landing hero featuring live grounded dataset metrics and an
 * interactive 3-tab Terra Solutions Assistant response preview.
 */
export function Hero({
  overview = { sheetsCount: 10, recordsCount: 148, clinicsCount: 4 },
}: HeroProps) {
  const { isAuthenticated, isLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<ShowcaseTab>("pricing");

  return (
    <section className="relative overflow-hidden border-b border-border/80 bg-background">
      {/* Subtle architectural hairline grid */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(203,179,106,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(203,179,106,0.03)_1px,transparent_1px)] bg-[size:48px_48px]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/35 to-transparent"
      />

      <div className="relative mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8 lg:py-20">
        <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-12 lg:gap-10">
          {/* Left column */}
          <div className="lg:col-span-6 space-y-5">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/8 px-3 py-1">
              <TerraMark size="xs" variant="bare" className="[&_svg]:h-3.5" />
              <span className="text-xs font-medium text-terra-gold-light">
                {BRAND.assistant.name}
              </span>
            </div>

            <div className="space-y-2.5">
              <h1 className="font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl lg:text-[44px] lg:leading-[1.1]">
                Company Knowledge.{" "}
                <span className="text-primary">Instantly Verified.</span>
              </h1>
              <p
                dir="rtl"
                className="font-display text-base sm:text-lg font-semibold text-terra-gold-pale/90 text-start"
              >
                كل معلومات Terra Solutions المعتمدة، في مساحة عمل واحدة.
              </p>
            </div>

            <p className="max-w-xl text-sm sm:text-base leading-relaxed text-foreground-muted">
              An internal knowledge assistant built for Terra Solutions call
              center and support teams — turning complex clinic spreadsheets into
              scannable answers, comparisons, and row-verified citations mid-call.
            </p>

            {/* Primary CTAs */}
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <Link href={ROUTES.chat}>
                <Button variant="primary" size="lg" rightIcon={<ArrowRight className="h-4 w-4" />}>
                  {!isLoading && isAuthenticated
                    ? "Open Workspace"
                    : "Launch Assistant"}
                </Button>
              </Link>

              <Link href={!isLoading && isAuthenticated ? "#services" : ROUTES.signIn}>
                <Button variant="outline" size="lg">
                  {!isLoading && isAuthenticated
                    ? "Browse Knowledge Coverage"
                    : "Employee Sign In"}
                </Button>
              </Link>
            </div>

            {/* Verified Operational Footprint */}
            <div className="flex flex-wrap items-center gap-2 pt-1 text-xs text-foreground-muted">
              <span className="rounded-lg border border-border/80 bg-background-secondary/80 px-2.5 py-1 terra-tabular">
                <strong className="text-foreground font-semibold">{overview.recordsCount}</strong>{" "}
                Verified Entries
              </span>
              <span className="rounded-lg border border-border/80 bg-background-secondary/80 px-2.5 py-1 terra-tabular">
                <strong className="text-foreground font-semibold">{overview.sheetsCount}</strong>{" "}
                Excel Worksheets
              </span>
              <span className="rounded-lg border border-border/80 bg-background-secondary/80 px-2.5 py-1 terra-tabular">
                <strong className="text-foreground font-semibold">{overview.clinicsCount}</strong>{" "}
                Partner Clinics
              </span>
            </div>

            {/* Trust pillars */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border-t border-border/70 pt-5">
              {TRUST_PILLARS.map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.title} className="space-y-1.5">
                    <div className="inline-flex items-center gap-2 text-xs font-semibold text-foreground">
                      <Icon className="h-3.5 w-3.5 text-primary shrink-0" />
                      <span>{item.title}</span>
                    </div>
                    <p className="text-xs leading-relaxed text-foreground-muted">
                      {item.detail}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right column: Interactive Authentic Workspace Preview */}
          <div className="lg:col-span-6">
            <div className="terra-panel rounded-2xl p-4 sm:p-5">
              {/* Preview header + interactive scenario switcher */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/75 pb-3 mb-4">
                <div className="flex items-center gap-2">
                  <TerraMark size="xs" variant="badge" />
                  <span className="text-xs font-display font-semibold text-foreground">
                    {BRAND.assistant.shortName}
                  </span>
                </div>

                <div
                  role="tablist"
                  aria-label="Preview response types"
                  className="flex items-center gap-1 rounded-lg border border-border/75 bg-background/70 p-0.5"
                >
                  {SHOWCASE_TABS.map((tab) => {
                    const Icon = tab.icon;
                    const active = activeTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        role="tab"
                        aria-selected={active}
                        onClick={() => setActiveTab(tab.id)}
                        className={clsx(
                          "inline-flex items-center gap-1 rounded-md px-2 py-1 text-[10.5px] font-medium transition-colors cursor-pointer",
                          active
                            ? "bg-primary/15 text-terra-gold-light border border-primary/35"
                            : "text-foreground-muted hover:text-foreground border border-transparent"
                        )}
                      >
                        <Icon className="h-3 w-3 text-primary" />
                        <span className="hidden sm:inline">{tab.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {activeTab === "pricing" && (
                <div className="space-y-4 terra-animate-in">
                  <div className="flex justify-end">
                    <div
                      dir="rtl"
                      className="max-w-[85%] rounded-2xl rounded-te-sm border border-primary/25 bg-[#231B0E] px-4 py-2 text-xs sm:text-[13px] font-medium text-terra-gold-light"
                    >
                      قارن أسعار خيوط Aptos Cat Eye و Aptos Lifting؟
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <TerraMark size="sm" variant="tile" className="hidden sm:inline-flex" />
                    <div className="flex-1 min-w-0 border-s-2 border-primary/30 ps-3.5 space-y-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[11px] font-display font-semibold text-foreground">
                          {BRAND.assistant.shortName}
                        </span>
                        <Badge variant="success" className="text-[10px] py-0">
                          Verified Record
                        </Badge>
                      </div>

                      <p dir="rtl" className="text-xs sm:text-[13px] leading-relaxed text-terra-gold-light">
                        الأسعار الموثقة لخدمات خيوط الشد:{" "}
                        <span className="inline-block rounded-md bg-primary/14 px-1.5 py-px border border-primary/28 text-terra-gold-light font-medium terra-tabular">
                          Aptos Cat Eye 5000 AED
                        </span>{" "}
                        مقارنة بـ{" "}
                        <span className="inline-block rounded-md bg-primary/14 px-1.5 py-px border border-primary/28 text-terra-gold-light font-medium terra-tabular">
                          Aptos Lifting 8000 AED
                        </span>
                        .
                      </p>

                      <div className="overflow-hidden rounded-xl border border-border/80 bg-[#120E08]">
                        <table className="w-full text-[11.5px] border-collapse">
                          <thead className="bg-[#1B150B] text-terra-gold-pale border-b border-border/80">
                            <tr>
                              <th className="px-3 py-1.5 text-start font-display font-semibold">
                                Service
                              </th>
                              <th className="px-3 py-1.5 text-end font-display font-semibold">
                                Verified Price
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border/45">
                            <tr>
                              <td className="px-3 py-2 font-medium text-foreground">
                                Aptos Cat Eye Threads
                              </td>
                              <td className="px-3 py-2 text-end font-mono terra-tabular text-emerald-300 font-semibold">
                                5000 AED
                              </td>
                            </tr>
                            <tr className="bg-white/[0.015]">
                              <td className="px-3 py-2 font-medium text-foreground">
                                Aptos Lifting Threads
                              </td>
                              <td className="px-3 py-2 text-end font-mono terra-tabular text-emerald-300 font-semibold">
                                8000 AED
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/70 bg-background/60 px-3 py-1.5 text-[11px] text-foreground-muted">
                        <span className="inline-flex items-center gap-1.5 truncate">
                          <FileSpreadsheet className="h-3.5 w-3.5 text-primary shrink-0" />
                          <span className="truncate">
                            Filler+Botox+Threads · R180 (A180:C180)
                          </span>
                        </span>
                        <span className="inline-flex items-center gap-1 text-primary font-medium shrink-0">
                          <span>Jump to Cell</span>
                          <ExternalLink className="h-3 w-3" />
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "safety" && (
                <div className="space-y-4 terra-animate-in">
                  <div className="flex justify-end">
                    <div
                      dir="rtl"
                      className="max-w-[85%] rounded-2xl rounded-te-sm border border-primary/25 bg-[#231B0E] px-4 py-2 text-xs sm:text-[13px] font-medium text-terra-gold-light"
                    >
                      هل البوتوكس مسموح للحامل؟
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <TerraMark size="sm" variant="tile" className="hidden sm:inline-flex" />
                    <div className="flex-1 min-w-0 border-s-2 border-primary/30 ps-3.5 space-y-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[11px] font-display font-semibold text-foreground">
                          {BRAND.assistant.shortName}
                        </span>
                        <Badge variant="danger" className="text-[10px] py-0">
                          Safety Rule · Verified
                        </Badge>
                      </div>

                      <dl className="grid grid-cols-2 gap-px rounded-xl border border-border/80 bg-border/45 overflow-hidden text-xs">
                        <div className="bg-[#120E08] p-2.5 space-y-1">
                          <dt className="text-[10.5px] text-foreground-muted">During Pregnancy</dt>
                          <dd className="font-semibold text-red-300 flex items-center gap-1">
                            <ShieldAlert className="h-3.5 w-3.5 shrink-0" />
                            <span>Not Permitted</span>
                          </dd>
                        </div>
                        <div className="bg-[#120E08] p-2.5 space-y-1">
                          <dt className="text-[10.5px] text-foreground-muted">Clinic Action</dt>
                          <dd className="font-semibold text-terra-gold-light flex items-center gap-1">
                            <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0" />
                            <span>Refer to Specialist</span>
                          </dd>
                        </div>
                      </dl>

                      <div className="flex items-center justify-between gap-2 rounded-lg border border-border/70 bg-background/60 px-3 py-1.5 text-[11px] text-foreground-muted">
                        <span className="inline-flex items-center gap-1.5 truncate">
                          <FileSpreadsheet className="h-3.5 w-3.5 text-primary shrink-0" />
                          <span>pregnancy and lactation · Sheet Tab Linked</span>
                        </span>
                        <ExternalLink className="h-3 w-3 text-primary shrink-0" />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "device" && (
                <div className="space-y-4 terra-animate-in">
                  <div className="flex justify-end">
                    <div className="max-w-[85%] rounded-2xl rounded-te-sm border border-primary/25 bg-[#231B0E] px-4 py-2 text-xs sm:text-[13px] font-medium text-terra-gold-light">
                      Candela GentleMax Pro Plus specifications
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <TerraMark size="sm" variant="tile" className="hidden sm:inline-flex" />
                    <div className="flex-1 min-w-0 border-s-2 border-primary/30 ps-3.5 space-y-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[11px] font-display font-semibold text-foreground">
                          {BRAND.assistant.shortName}
                        </span>
                        <Badge variant="success" className="text-[10px] py-0">
                          Verified Record
                        </Badge>
                      </div>

                      <div className="rounded-xl border border-border/80 bg-[#120E08] p-3 space-y-1.5 text-xs">
                        <div className="font-display font-semibold text-foreground">
                          Candela GentleMax Pro Plus
                        </div>
                        <p className="text-terra-gold-light/90 leading-relaxed">
                          Dual-wavelength laser hair removal system documented in the clinic Laser schedule alongside clinic availability notes.
                        </p>
                      </div>

                      <div className="flex items-center justify-between gap-2 rounded-lg border border-border/70 bg-background/60 px-3 py-1.5 text-[11px] text-foreground-muted">
                        <span className="inline-flex items-center gap-1.5 truncate">
                          <FileSpreadsheet className="h-3.5 w-3.5 text-primary shrink-0" />
                          <span>Laser · Cell A15:A19 (gid=326362711)</span>
                        </span>
                        <ExternalLink className="h-3 w-3 text-primary shrink-0" />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
