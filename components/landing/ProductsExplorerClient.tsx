"use client";

import { useState } from "react";
import Link from "next/link";
import { clsx } from "clsx";
import {
  Droplets,
  Stethoscope,
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
import type { KnowledgeCategoryInfo } from "@/types/knowledge";
import { Badge } from "@/components/ui/Badge";
import { ROUTES } from "@/constants/config";

const ICON_MAP: Record<string, LucideIcon> = {
  Droplets,
  Sparkles: Stethoscope,
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

type GroupId = "all" | "injectables" | "devices" | "skin-safety";

const GROUPS: Array<{ id: GroupId; label: string; categoryIds?: string[] }> = [
  { id: "all", label: "All Departments" },
  {
    id: "injectables",
    label: "Injectables & Threads",
    categoryIds: ["fillers", "botox", "threads", "body-fillers", "skin-boosters"],
  },
  {
    id: "devices",
    label: "Laser & Slimming",
    categoryIds: ["laser", "facial-machines", "slimming", "tattoo-removal"],
  },
  {
    id: "skin-safety",
    label: "Skin, Hair, Dental & Safety",
    categoryIds: [
      "facial",
      "face-treatments",
      "hair-treatments",
      "dental",
      "pregnancy-safety",
    ],
  },
];

interface ProductsExplorerClientProps {
  categories: KnowledgeCategoryInfo[];
  highlights: Record<string, string[]>;
}

/**
 * Interactive grouped catalog explorer presenting verified operational categories cleanly
 * without an overwhelming repetitive wall of uniform cards.
 */
export function ProductsExplorerClient({
  categories,
  highlights,
}: ProductsExplorerClientProps) {
  const [activeGroup, setActiveGroup] = useState<GroupId>("all");

  const activeGroupSpec = GROUPS.find((g) => g.id === activeGroup);
  const visible =
    activeGroup === "all" || !activeGroupSpec?.categoryIds
      ? categories
      : categories.filter((c) => activeGroupSpec.categoryIds!.includes(c.id));

  return (
    <div className="space-y-6">
      <div
        role="tablist"
        aria-label="Filter knowledge categories by department"
        className="flex flex-wrap items-center gap-2"
      >
        {GROUPS.map((g) => {
          const isSelected = activeGroup === g.id;
          return (
            <button
              key={g.id}
              type="button"
              role="tab"
              aria-selected={isSelected}
              onClick={() => setActiveGroup(g.id)}
              className={clsx(
                "rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors cursor-pointer",
                isSelected
                  ? "border-primary/50 bg-primary/14 text-terra-gold-light"
                  : "border-border bg-background px-3.5 text-foreground-muted hover:border-primary/35 hover:text-foreground"
              )}
            >
              {g.label}
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {visible.map((cat) => {
          const IconComponent = ICON_MAP[cat.icon] || Stethoscope;
          const catHighlights = highlights[cat.id] || [];

          return (
            <Link
              key={cat.id}
              href={`${ROUTES.chat}?q=${encodeURIComponent(cat.nameEn)}`}
              className="group terra-panel rounded-xl p-5 flex flex-col justify-between gap-4 transition-all duration-150 hover:border-border-hover hover:bg-card-hover"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 border border-primary/25 text-primary">
                    <IconComponent className="h-4 w-4" />
                  </div>
                  <Badge variant="muted" className="terra-tabular">
                    {cat.recordCount} {cat.recordCount === 1 ? "entry" : "entries"}
                  </Badge>
                </div>

                <div>
                  <div className="flex items-baseline justify-between gap-2">
                    <h3 className="font-display text-sm sm:text-[15px] font-semibold text-foreground group-hover:text-primary transition-colors">
                      {cat.nameEn}
                    </h3>
                    <span className="text-xs font-medium text-terra-gold-pale shrink-0" dir="rtl">
                      {cat.nameAr}
                    </span>
                  </div>
                  <p className="mt-1.5 text-xs text-foreground-muted leading-relaxed line-clamp-2">
                    {cat.description}
                  </p>
                </div>

                {catHighlights.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-0.5">
                    {catHighlights.slice(0, 4).map((item) => (
                      <span
                        key={item}
                        className="rounded-md bg-background px-2 py-0.5 text-[11px] text-foreground-muted border border-border/80"
                      >
                        {item}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-border/60 flex items-center justify-between text-xs font-medium text-primary">
                <span>Query {cat.nameEn}</span>
                <ArrowUpRight className="h-3.5 w-3.5 transition-transform duration-150 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

