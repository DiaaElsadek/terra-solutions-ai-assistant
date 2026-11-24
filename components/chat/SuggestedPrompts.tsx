"use client";

import {
  Package,
  Cpu,
  Tag,
  GitCompareArrows,
  Building2,
  MessageCircle,
  type LucideIcon,
} from "lucide-react";
import { SUGGESTED_PROMPTS } from "@/constants/prompts";

const PROMPT_ICONS: Record<string, LucideIcon> = {
  Package,
  Cpu,
  Tag,
  GitCompareArrows,
  Building2,
  MessageCircle,
};

interface SuggestedPromptsProps {
  onSelect: (promptText: string) => void;
  disabled?: boolean;
}

/**
 * Call-center quick prompt cards shown when starting a new conversation.
 */
export function SuggestedPrompts({
  onSelect,
  disabled = false,
}: SuggestedPromptsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full max-w-2xl">
      {SUGGESTED_PROMPTS.map((item) => {
        const Icon = PROMPT_ICONS[item.icon] || MessageCircle;
        return (
          <button
            key={item.text}
            type="button"
            disabled={disabled}
            onClick={() => onSelect(item.text)}
            className="group text-start rounded-xl border border-border bg-background-secondary p-3.5 transition-all duration-150 hover:border-primary/50 hover:bg-background-tertiary disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-ring"
          >
            <div className="flex items-start gap-2.5">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary group-hover:bg-primary/20 transition-colors">
                <Icon className="h-4 w-4" />
              </span>
              <div className="space-y-1 min-w-0">
                <p className="text-xs font-medium text-foreground leading-snug">
                  {item.text}
                </p>
                <p
                  dir="rtl"
                  className="text-[11px] text-foreground-muted/75 leading-snug"
                >
                  {item.textAr}
                </p>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}

