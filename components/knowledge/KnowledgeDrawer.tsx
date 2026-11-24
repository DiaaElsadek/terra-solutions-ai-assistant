"use client";

import { useState, useEffect, useCallback } from "react";
import {
  X,
  Search,
  ArrowRight,
  ArrowLeft,
  FileSpreadsheet,
  Building2,
  Link2,
} from "lucide-react";
import { clsx } from "clsx";
import type {
  KnowledgeCategory,
  KnowledgeCategoryInfo,
  KnowledgeRecord,
  CanonicalClinic,
} from "@/types/knowledge";
import { Badge } from "@/components/ui/Badge";
import { Spinner } from "@/components/ui/Spinner";
import { RichText } from "@/components/ui/RichText";

interface KnowledgeDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onAskQuestion: (question: string) => void;
}

interface KnowledgeApiResponse {
  categories: KnowledgeCategoryInfo[];
  clinics: CanonicalClinic[];
  totalRecords: number;
  records: Array<KnowledgeRecord & { _matchReasons?: string[] }>;
}

/**
 * Server-backed Knowledge Explorer drawer.
 * Fetches canonical records, clinics, and related entries from `/api/knowledge`
 * without bundling raw datasets into client JS.
 */
export function KnowledgeDrawer({
  isOpen,
  onClose,
  onAskQuestion,
}: KnowledgeDrawerProps) {
  const [tab, setTab] = useState<"records" | "clinics">("records");
  const [query, setQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<
    KnowledgeCategory | "all"
  >("all");
  const [selectedClinic, setSelectedClinic] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [data, setData] = useState<KnowledgeApiResponse | null>(null);
  const [detailRecord, setDetailRecord] = useState<KnowledgeRecord | null>(
    null
  );
  const [relatedRecords, setRelatedRecords] = useState<KnowledgeRecord[]>([]);

  const fetchList = useCallback(async () => {
    if (!isOpen) return;
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (query.trim()) params.set("q", query.trim());
      if (selectedCategory !== "all") params.set("category", selectedCategory);
      if (selectedClinic) params.set("clinicId", selectedClinic);

      const res = await fetch(`/api/knowledge?${params.toString()}`);
      if (res.ok) {
        const json = (await res.json()) as KnowledgeApiResponse;
        setData(json);
      }
    } finally {
      setIsLoading(false);
    }
  }, [isOpen, query, selectedCategory, selectedClinic]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void fetchList();
    }, 150);
    return () => clearTimeout(timer);
  }, [fetchList]);

  const openDetail = async (id: string) => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/knowledge?id=${encodeURIComponent(id)}`);
      if (res.ok) {
        const json = (await res.json()) as {
          record: KnowledgeRecord;
          related: KnowledgeRecord[];
        };
        setDetailRecord(json.record);
        setRelatedRecords(json.related || []);
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  const categories = data?.categories || [];
  const clinics = data?.clinics || [];
  const records = data?.records || [];

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
              {data?.totalRecords ?? "…"} canonical records · Server-backed
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

        {/* Detail View */}
        {detailRecord ? (
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <button
              type="button"
              onClick={() => setDetailRecord(null)}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to results
            </button>

            <div className="space-y-2">
              <div className="flex flex-wrap gap-1.5">
                <Badge variant="gold">{detailRecord.recordType}</Badge>
                <Badge variant="muted">
                  <FileSpreadsheet className="h-3 w-3" />
                  {detailRecord.source.file} · {detailRecord.source.sheet} (Rows{" "}
                  {detailRecord.source.rows.join(", ")})
                </Badge>
              </div>
              <h3
                dir="auto"
                className="font-display text-base font-bold text-foreground"
              >
                {detailRecord.name}
              </h3>
            </div>

            <div
              dir="auto"
              className="rounded-xl border border-border bg-background-tertiary/70 p-3.5 text-xs text-terra-gold-light whitespace-pre-wrap leading-relaxed"
            >
              <RichText text={detailRecord.description} />
            </div>

            {Object.keys(detailRecord.attributes).length > 0 && (
              <div className="rounded-xl border border-border bg-background-tertiary/40 p-3 space-y-1.5">
                <div className="text-[11px] font-semibold text-primary">
                  Verified Attributes
                </div>
                {Object.entries(detailRecord.attributes).map(([k, v]) => (
                  <div key={k} className="text-xs text-foreground-muted">
                    <strong className="text-foreground">{k}:</strong>{" "}
                    <RichText text={v} />
                  </div>
                ))}
              </div>
            )}

            {relatedRecords.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-primary">
                  <Link2 className="h-3.5 w-3.5" />
                  Related Records
                </div>
                <div className="space-y-1.5">
                  {relatedRecords.map((rel) => (
                    <button
                      key={rel.id}
                      type="button"
                      onClick={() => void openDetail(rel.id)}
                      className="w-full text-start rounded-lg border border-border bg-background-tertiary/50 hover:border-primary/50 p-2.5 text-xs transition-colors"
                    >
                      <div className="font-medium text-foreground">{rel.name}</div>
                      <div className="text-[10px] text-foreground-muted">
                        {rel.source.sheet} · R{rel.source.row}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={() => {
                onAskQuestion(`Tell me about ${detailRecord.name}`);
                onClose();
              }}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary-hover transition-colors"
            >
              <span>Ask Assistant About This</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : (
          <>
            {/* Mode Tabs + Filter */}
            <div className="p-3.5 border-b border-border space-y-3">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setTab("records");
                    setSelectedClinic("");
                  }}
                  className={clsx(
                    "flex-1 rounded-lg py-1.5 text-xs font-medium border transition-colors",
                    tab === "records"
                      ? "bg-primary/15 border-primary text-primary"
                      : "bg-background-tertiary border-border text-foreground-muted"
                  )}
                >
                  Products &amp; Services
                </button>
                <button
                  type="button"
                  onClick={() => setTab("clinics")}
                  className={clsx(
                    "flex-1 rounded-lg py-1.5 text-xs font-medium border transition-colors inline-flex items-center justify-center gap-1.5",
                    tab === "clinics"
                      ? "bg-primary/15 border-primary text-primary"
                      : "bg-background-tertiary border-border text-foreground-muted"
                  )}
                >
                  <Building2 className="h-3.5 w-3.5" />
                  Clinics ({clinics.length})
                </button>
              </div>

              {tab === "records" && (
                <>
                  <div className="relative flex items-center">
                    <Search className="pointer-events-none absolute left-3 h-4 w-4 text-foreground-muted/60" />
                    <input
                      type="text"
                      dir="auto"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Search records (English or Arabic)…"
                      className="w-full h-10 rounded-lg bg-input-bg border border-border pl-9 pr-3 text-xs text-foreground placeholder:text-foreground-muted/50 focus:outline-none focus:border-primary"
                    />
                  </div>

                  <div className="flex gap-1.5 overflow-x-auto pb-1">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedCategory("all");
                        setSelectedClinic("");
                      }}
                      className={clsx(
                        "shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium border transition-colors",
                        selectedCategory === "all" && !selectedClinic
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
                        onClick={() => {
                          setSelectedCategory(cat.id);
                          setSelectedClinic("");
                        }}
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
                </>
              )}
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-3.5 space-y-2.5">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Spinner size="md" className="text-primary" />
                </div>
              ) : tab === "clinics" ? (
                clinics.map((clinic) => (
                  <div
                    key={clinic.id}
                    className="rounded-xl border border-border bg-background-tertiary/70 p-3.5 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <h3 className="font-display text-sm font-semibold text-primary">
                        {clinic.name}
                      </h3>
                      <Badge variant="muted" className="text-[10px]">
                        {clinic.devices.length} devices
                      </Badge>
                    </div>
                    <p className="text-xs text-foreground-muted">
                      <strong>Services:</strong> {clinic.services.join(", ")}
                    </p>
                    {clinic.devices.map((d, idx) => (
                      <p key={idx} className="text-[11px] text-terra-gold-light">
                        • {d.device} ({d.service})
                      </p>
                    ))}
                    <div className="pt-1 flex gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedClinic(clinic.id);
                          setTab("records");
                        }}
                        className="text-[11px] font-medium text-primary hover:underline"
                      >
                        View Linked Records
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          onAskQuestion(
                            `Find verified details about ${clinic.name} clinic.`
                          );
                          onClose();
                        }}
                        className="text-[11px] font-medium text-terra-gold-pale hover:underline"
                      >
                        Ask in Chat
                      </button>
                    </div>
                  </div>
                ))
              ) : records.length === 0 ? (
                <p className="py-10 text-center text-xs text-foreground-muted">
                  No records match your filter.
                </p>
              ) : (
                records.map((record) => (
                  <div
                    key={record.id}
                    className="rounded-xl border border-border bg-background-tertiary/70 p-3.5 space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => void openDetail(record.id)}
                        dir="auto"
                        className="text-start font-display text-xs font-semibold text-foreground hover:text-primary transition-colors"
                      >
                        {record.name}
                      </button>
                      <Badge variant="muted" className="shrink-0 text-[10px]">
                        <FileSpreadsheet className="h-2.5 w-2.5" />
                        {record.source.sheet} R{record.source.row}
                      </Badge>
                    </div>

                    <p
                      dir="auto"
                      className="text-xs text-foreground-muted line-clamp-3 leading-relaxed"
                    >
                      <RichText
                        text={record.description
                          .replace(/\|/g, " · ")
                          .replace(/\*\*/g, "")}
                      />
                    </p>

                    <div className="flex items-center justify-between pt-1">
                      <button
                        type="button"
                        onClick={() => void openDetail(record.id)}
                        className="text-[11px] font-medium text-foreground-muted hover:text-foreground transition-colors"
                      >
                        Inspect Record &amp; Related
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          onAskQuestion(`Tell me about ${record.name}`);
                          onClose();
                        }}
                        className="inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:text-primary-hover transition-colors"
                      >
                        <span>Ask in Chat</span>
                        <ArrowRight className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
