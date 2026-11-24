"use client";

import { useState } from "react";
import { clsx } from "clsx";
import {
  Sparkles,
  Tag,
  Cpu,
  Building2,
  GitCompareArrows,
  ShieldAlert,
  ArrowUpRight,
} from "lucide-react";
import {
  SUGGESTED_PROMPTS,
  WELCOME_PROMPT_CATEGORIES,
  type StarterPromptItem,
  type WelcomePromptCategoryId,
} from "@/constants/prompts";

interface SuggestedPromptsProps {
  onSelect: (prompt: string) => void;
  disabled?: boolean;
}

const ICONS: Record<StarterPromptItem["icon"], typeof Sparkles> = {
  Sparkles,
  Tag,
  Cpu,
  Building2,
  GitCompareArrows,
  ShieldAlert,
};

/**
 * Category-filterable starter questions grounded in Terra Solutions'
 * internal operational knowledge catalog.
 */
export function SuggestedPrompts({
  onSelect,
  disabled = false,
}: SuggestedPromptsProps) {
  const [selectedCategory, setSelectedCategory] =
    useState<WelcomePromptCategoryId>("all");

  const visiblePrompts =
    selectedCategory === "all"
      ? SUGGESTED_PROMPTS
      : SUGGESTED_PROMPTS.filter((p) => p.category === selectedCategory);

  return (
    <div className="w-full max-w-3xl space-y-4">
      {/* Category filter pills */}
      <div
        className="flex flex-wrap items-center justify-center gap-1.5"
        role="tablist"
        aria-label="Filter starter questions by topic"
      >
        {WELCOME_PROMPT_CATEGORIES.map((category) => {
          const isSelected = selectedCategory === category.id;
          return (
            <button
              key={category.id}
              type="button"
              role="tab"
              aria-selected={isSelected}
              onClick={() => setSelectedCategory(category.id)}
              className={clsx(
                "rounded-full border px-3 py-1 text-[11px] font-medium transition-colors cursor-pointer",
                isSelected
                  ? "border-primary/50 bg-primary/14 text-terra-gold-light"
                  : "border-border/80 bg-background-secondary/70 text-foreground-muted hover:border-primary/30 hover:text-foreground"
              )}
            >
              {category.label}
            </button>
          );
        })}
      </div>

      {/* Prompt cards grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {visiblePrompts.map((prompt) => {
          const Icon = ICONS[prompt.icon];
          return (
            <button
              key={prompt.id}
              type="button"
              disabled={disabled}
              onClick={() => onSelect(prompt.query)}
              className="group flex items-start gap-3 rounded-xl border border-border/80 bg-background-secondary/65 p-3.5 text-start transition-all duration-150 hover:border-primary/45 hover:bg-background-tertiary/90 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer terra-subtle-shadow"
            >
              <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-primary transition-colors group-hover:border-primary/40 group-hover:bg-primary/15">
                <Icon className="h-4 w-4" />
              </span>

              <span className="min-w-0 flex-1 space-y-1">
                <span className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-medium uppercase tracking-wider text-primary/80">
                    {prompt.categoryLabel}
                  </span>
                  <ArrowUpRight className="h-3.5 w-3.5 text-foreground-muted/40 transition-transform duration-150 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-primary" />
                </span>
                <span
                  dir="auto"
                  className="block text-[13px] font-medium text-foreground leading-snug group-hover:text-terra-gold-light transition-colors"
                >
                  {prompt.textAr}
                </span>
                <span className="block text-[11px] text-foreground-muted leading-snug">
                  {prompt.text}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
