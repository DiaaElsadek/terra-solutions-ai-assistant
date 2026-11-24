"use client";

import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  FileSpreadsheet,
  Languages,
  ShieldCheck,
  ExternalLink,
  CheckCircle2,
} from "lucide-react";
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
    detail: "Seamless Arabic and English understanding for live call handling.",
  },
  {
    icon: ShieldCheck,
    title: "Consistent Team Answers",
    detail: "Safety rules, contraindications, prices, and offers in one place.",
  },
];

/**
 * Editorial landing hero introducing Terra Solutions Assistant alongside
 * a grounded workspace briefing preview card.
 */
export function Hero() {
  const { isAuthenticated, isLoading } = useAuth();

  return (
    <section className="relative overflow-hidden border-b border-border/80 bg-background">
      {/* Subtle architectural hairline grid */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(203,179,106,0.035)_1px,transparent_1px),linear-gradient(to_bottom,rgba(203,179,106,0.035)_1px,transparent_1px)] bg-[size:48px_48px]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/35 to-transparent"
      />

      <div className="relative mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-20 lg:px-8 lg:py-24">
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-12 lg:gap-10">
          {/* Left column: Clear product positioning */}
          <div className="lg:col-span-6 space-y-6">
            <Badge variant="gold" className="px-3 py-1 text-xs">
              Terra Solutions · Internal Support Workspace
            </Badge>

            <h1 className="font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl lg:text-[42px] lg:leading-[1.14]">
              Verified Answers for{" "}
              <span className="text-primary">Every Customer Call</span>
            </h1>

            <p className="max-w-xl text-sm sm:text-base leading-relaxed text-foreground-muted">
              {BRAND.assistant.name} gives call center agents and customer support
              teams instant access to treatments, device specs, package pricing,
              partner clinics, and safety guidelines — without manual
              spreadsheet searching.
            </p>

            {/* Primary CTAs */}
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <Link href={!isLoading && isAuthenticated ? ROUTES.chat : ROUTES.chat}>
                <Button variant="primary" size="lg">
                  <span>
                    {!isLoading && isAuthenticated
                      ? "Open Workspace"
                      : "Launch Assistant"}
                  </span>
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>

              <Link href={!isLoading && isAuthenticated ? "#products" : ROUTES.signIn}>
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

          {/* Right column: Authentic workspace briefing preview */}
          <div className="lg:col-span-6">
            <div className="rounded-2xl border border-border bg-background-secondary/90 p-4 sm:p-5 terra-subtle-shadow">
              {/* Preview chrome bar */}
              <div className="flex items-center justify-between border-b border-border/70 pb-3 mb-4">
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-md border border-primary/25 bg-[#221C10]">
                    <Image
                      src="/images/T_logo.svg"
                      alt=""
                      width={16}
                      height={16}
                      className="h-3.5 w-3.5 object-contain"
                    />
                  </span>
                  <span className="text-xs font-semibold text-foreground">
                    {BRAND.assistant.name}
                  </span>
                </div>
                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-medium text-emerald-300">
                  <CheckCircle2 className="h-3 w-3" />
                  Verified Catalog
                </span>
              </div>

              {/* Sample employee question */}
              <div className="flex justify-end mb-4">
                <div
                  dir="rtl"
                  className="max-w-[85%] rounded-2xl rounded-ee-sm border border-primary/25 bg-[#221C10] px-4 py-2.5 text-xs sm:text-[13px] font-medium text-terra-gold-light"
                >
                  سعر خيوط Aptos Cat Eye كام؟
                </div>
              </div>

              {/* Sample briefing response */}
              <div className="border-s-2 border-primary/35 ps-3.5 space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[11px] font-semibold text-foreground">
                    {BRAND.assistant.shortName}
                  </span>
                  <span className="rounded-full border border-primary/20 bg-primary/8 px-2 py-0.5 text-[10px] text-primary">
                    Direct Source Match
                  </span>
                </div>

                <p dir="rtl" className="text-xs sm:text-[13px] leading-relaxed text-foreground">
                  سعر جلسة{" "}
                  <strong className="text-terra-gold-light font-semibold">
                    Aptos Cat Eye Threads
                  </strong>{" "}
                  هو{" "}
                  <strong className="text-terra-gold-light font-semibold">
                    5000 AED
                  </strong>{" "}
                  وفقًا لجدول خدمات الخيوط المعتمد.
                </p>

                {/* Highlight card */}
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="rounded-xl border border-border/80 bg-background-tertiary/75 px-3 py-2">
                    <div className="text-[10px] uppercase tracking-wider text-foreground-muted">
                      Service
                    </div>
                    <div className="mt-0.5 text-xs font-semibold text-foreground">
                      Aptos Cat Eye
                    </div>
                  </div>
                  <div className="rounded-xl border border-primary/25 bg-primary/8 px-3 py-2">
                    <div className="text-[10px] uppercase tracking-wider text-primary/80">
                      Listed Price
                    </div>
                    <div className="mt-0.5 text-xs font-semibold text-terra-gold-light">
                      5000 AED
                    </div>
                  </div>
                </div>

                {/* Source strip preview */}
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/70 bg-background/60 px-3 py-2 text-[11px] text-foreground-muted">
                  <span className="inline-flex items-center gap-1.5 truncate">
                    <FileSpreadsheet className="h-3.5 w-3.5 text-primary shrink-0" />
                    <span className="truncate">
                      Filler+Botox+Threads · Row 180
                    </span>
                  </span>
                  <span className="inline-flex items-center gap-1 text-primary font-medium shrink-0">
                    <span>Open Row</span>
                    <ExternalLink className="h-3 w-3" />
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
