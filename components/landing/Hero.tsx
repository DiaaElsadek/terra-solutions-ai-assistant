"use client";

import Link from "next/link";
import {
  ArrowRight,
  FileSpreadsheet,
  Languages,
  ShieldCheck,
  CheckCircle2,
  ExternalLink,
} from "lucide-react";
import { TerraMark } from "@/components/branding/TerraMark";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { useAuth } from "@/lib/auth/context";
import { BRAND } from "@/constants/brand";
import { ROUTES } from "@/constants/config";

const TRUST_PILLARS = [
  {
    icon: FileSpreadsheet,
    title: "Excel & Clinic Grounded",
    detail: "Direct answers from approved company sheets with row citations.",
  },
  {
    icon: Languages,
    title: "Bilingual Support Ready",
    detail: "Seamless Arabic and English understanding during live calls.",
  },
  {
    icon: ShieldCheck,
    title: "Verified Consistency",
    detail: "Safety rules, contraindications, prices, and devices in one workspace.",
  },
];

/**
 * Editorial landing hero matching the Terra Solutions Assistant workspace visual system
 * and rendering an authentic live-workspace response preview.
 */
export function Hero() {
  const { isAuthenticated, isLoading } = useAuth();

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

      <div className="relative mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-20 lg:px-8 lg:py-24">
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-12 lg:gap-10">
          {/* Left column */}
          <div className="lg:col-span-6 space-y-5">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/8 px-3 py-1">
              <TerraMark size="xs" variant="bare" className="[&_svg]:h-3.5" />
              <span className="text-xs font-medium text-terra-gold-light">
                {BRAND.assistant.name}
              </span>
            </div>

            <div className="space-y-2.5">
              <h1 className="font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl lg:text-[42px] lg:leading-[1.12]">
                Your Knowledge.{" "}
                <span className="text-primary">One Intelligent Workspace.</span>
              </h1>
              <p
                dir="rtl"
                className="font-display text-base sm:text-lg font-semibold text-terra-gold-pale/90 text-start"
              >
                كل معلومات Terra Solutions، في مكان واحد.
              </p>
            </div>

            <p className="max-w-xl text-sm sm:text-base leading-relaxed text-foreground-muted">
              An intelligent workspace that helps our team access company
              services, offers, devices, and clinic information with clarity
              and speed.
            </p>

            {/* Primary CTAs */}
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <Link href={ROUTES.chat}>
                <Button variant="primary" size="lg">
                  <span>
                    {!isLoading && isAuthenticated
                      ? "Open Workspace"
                      : "Launch Assistant"}
                  </span>
                  <ArrowRight className="h-4 w-4" />
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

            {/* Trust pillars */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border-t border-border/70 pt-6">
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

          {/* Right column: Authentic Chat Workspace Preview */}
          <div className="lg:col-span-6">
            <div className="rounded-2xl border border-border bg-background-secondary/95 p-4 sm:p-5 terra-subtle-shadow">
              {/* Chrome bar */}
              <div className="flex items-center justify-between border-b border-border/75 pb-3 mb-4">
                <div className="flex items-center gap-2.5">
                  <TerraMark size="xs" variant="badge" />
                  <span className="text-xs font-display font-semibold text-foreground">
                    {BRAND.assistant.shortName}
                  </span>
                </div>
                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-medium text-emerald-300">
                  <CheckCircle2 className="h-3 w-3" />
                  Verified Catalog
                </span>
              </div>

              {/* Employee Arabic query */}
              <div className="flex justify-end mb-4">
                <div
                  dir="rtl"
                  className="max-w-[85%] rounded-2xl rounded-te-sm border border-primary/25 bg-[#231B0E] px-4 py-2 text-xs sm:text-[13px] font-medium text-terra-gold-light"
                >
                  قارن أسعار خيوط Aptos Cat Eye و Aptos Lifting؟
                </div>
              </div>

              {/* Editorial briefing preview matching real chat UI */}
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
                    الأسعار الموثقة لخدمات خيوط الشد في الجدول المعتمد:{" "}
                    <span className="inline-block rounded-md bg-primary/14 px-1.5 py-px border border-primary/28 text-terra-gold-light font-medium">
                      Aptos Cat Eye 5000 AED
                    </span>{" "}
                    مقارنة بـ{" "}
                    <span className="inline-block rounded-md bg-primary/14 px-1.5 py-px border border-primary/28 text-terra-gold-light font-medium">
                      Aptos Lifting 8000 AED
                    </span>
                    .
                  </p>

                  {/* Mini Comparison Table matching ResponseTable */}
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
                          <td className="px-3 py-2 text-end font-mono tabular-nums text-terra-gold-light">
                            5000 AED
                          </td>
                        </tr>
                        <tr className="bg-white/[0.015]">
                          <td className="px-3 py-2 font-medium text-foreground">
                            Aptos Lifting Threads
                          </td>
                          <td className="px-3 py-2 text-end font-mono tabular-nums text-terra-gold-light">
                            8000 AED
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Secondary Sources Pill Preview */}
                  <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/70 bg-background/60 px-3 py-1.5 text-[11px] text-foreground-muted">
                    <span className="inline-flex items-center gap-1.5 truncate">
                      <FileSpreadsheet className="h-3.5 w-3.5 text-primary shrink-0" />
                      <span className="truncate">
                        Sources (2) · Filler+Botox+Threads (R180)
                      </span>
                    </span>
                    <span className="inline-flex items-center gap-1 text-primary font-medium shrink-0">
                      <span>Inspect Row</span>
                      <ExternalLink className="h-3 w-3" />
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
