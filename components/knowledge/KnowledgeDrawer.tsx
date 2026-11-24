"use client";

import { useState, useMemo } from "react";
import { X, Search, ArrowRight, FileSpreadsheet } from "lucide-react";
import { clsx } from "clsx";
import type { KnowledgeCategory } from "@/types/knowledge";
import { knowledgeEngine } from "@/lib/knowledge";
import { Badge } from "@/components/ui/Badge";
import { RichText } from "@/components/ui/RichText";

interface KnowledgeDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onAskQuestion: (question: string) => void;
}

/**
 * Slide-over drawer allowing call center agents to browse verified categories
 * and search knowledge records directly while on a call.
 */
export function KnowledgeDrawer({
  isOpen,
  onClose,
  onAskQuestion,
}: KnowledgeDrawerProps) {
  const [query, setQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<
    KnowledgeCategory | "all"
  >("all");

  const categories = useMemo(
    () => knowledgeEngine.getCategoriesWithCounts().filter((c) => c.recordCount > 0),
    []
  );

  const visibleRecords = useMemo(() => {
    if (query.trim()) {
      return knowledgeEngine
        .search(query, {
          category: selectedCategory === "all" ? undefined : selectedCategory,
          limit: 15,
        })
        .map((r) => r.record);
    }

    if (selectedCategory !== "all") {
      return knowledgeEngine.getByCategory(selectedCategory);
    }

    return knowledgeEngine.getAllRecords().slice(0, 15);
  }, [query, selectedCategory]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end"
      role="dialog"
      aria-modal="true"
      aria-label="Knowledge Base Explorer"
    >
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-xs"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="relative z-10 flex h-full w-full max-w-md flex-col border-l border-border bg-background-secondary shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-4 py-3.5">
          <div>
            <h2 className="font-display text-base font-semibold text-foreground">
              Knowledge Base Explorer
            </h2>
            <p className="text-xs text-foreground-muted">
              {knowledgeEngine.getRecordCount()} indexed records from official sheets
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close knowledge explorer"
            className="p-1.5 rounded-lg text-foreground-muted hover:text-foreground hover:bg-background-tertiary transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Search + category pills */}
        <div className="p-3.5 border-b border-border space-y-3">
          <div className="relative flex items-center">
            <Search className="pointer-events-none absolute left-3 h-4 w-4 text-foreground-muted/60" />
            <input
              type="text"
              dir="auto"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filter records (English or Arabic)…"
              className="w-full h-10 rounded-lg bg-input-bg border border-border pl-9 pr-3 text-xs text-foreground placeholder:text-foreground-muted/50 focus:outline-none focus:border-primary"
            />
          </div>

          <div className="flex gap-1.5 overflow-x-auto pb-1">
            <button
              type="button"
              onClick={() => setSelectedCategory("all")}
              className={clsx(
                "shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium border transition-colors",
                selectedCategory === "all"
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background-tertiary text-foreground-muted border-border hover:text-foreground"
              )}
            >
              All
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={clsx(
                  "shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium border transition-colors",
                  selectedCategory === cat.id
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background-tertiary text-foreground-muted border-border hover:text-foreground"
                )}
              >
                {cat.nameEn} ({cat.recordCount})
              </button>
            ))}
          </div>
        </div>

        {/* Records */}
        <div className="flex-1 overflow-y-auto p-3.5 space-y-2.5">
          {visibleRecords.length === 0 ? (
            <p className="py-10 text-center text-xs text-foreground-muted">
              No records match your filter.
            </p>
          ) : (
            visibleRecords.map((record) => (
              <div
                key={record.id}
                className="rounded-xl border border-border bg-background-tertiary/70 p-3.5 space-y-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <h3
                    dir="auto"
                    className="font-display text-xs font-semibold text-foreground"
                  >
                    {record.title}
                  </h3>
                  <Badge variant="muted" className="shrink-0 text-[10px]">
                    <FileSpreadsheet className="h-2.5 w-2.5" />
                    {record.source.sheet}
                  </Badge>
                </div>

                <p
                  dir="auto"
                  className="text-xs text-foreground-muted line-clamp-3 leading-relaxed"
                >
                  <RichText
                    text={record.content
                      .replace(/\|/g, " · ")
                      .replace(/\*\*/g, "")}
                  />
                </p>

                <button
                  type="button"
                  onClick={() => {
                    onAskQuestion(`Tell me about ${record.title}`);
                    onClose();
                  }}
                  className="inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:text-primary-hover transition-colors"
                >
                  <span>Ask in Chat</span>
                  <ArrowRight className="h-3 w-3" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

