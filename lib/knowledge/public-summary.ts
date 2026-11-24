/**
 * Sanitized public marketing metadata for `/` landing page.
 * Exposes ONLY high-level category counts and clinic names — never raw
 * spreadsheet contents, internal agent notes, prices, or device specs.
 */

import type { KnowledgeCategoryInfo } from "@/types/knowledge";
import { CATEGORIES } from "./categories";
import { getCanonicalDataset } from "./server-store";

export interface PublicClinicSummary {
  id: string;
  name: string;
  services: string[];
}

export function getPublicCategorySummaries(): KnowledgeCategoryInfo[] {
  const dataset = getCanonicalDataset();
  const counts: Record<string, number> = {};
  for (const r of dataset.records) {
    counts[r.category] = (counts[r.category] || 0) + 1;
  }

  return Object.entries(CATEGORIES)
    .filter(([id]) => id !== "clinics")
    .map(([id, info]) => ({
      ...info,
      recordCount: counts[id] || 0,
    }))
    .filter((c) => c.recordCount > 0);
}

export function getPublicClinicSummaries(): PublicClinicSummary[] {
  const dataset = getCanonicalDataset();
  return dataset.clinics.map((c) => ({
    id: c.id,
    name: c.name,
    services: c.services,
  }));
}

export function getPublicDatasetOverview(): {
  sheetsCount: number;
  recordsCount: number;
  clinicsCount: number;
} {
  const dataset = getCanonicalDataset();
  return {
    sheetsCount: dataset.stats.excelSheets,
    recordsCount: dataset.stats.canonicalRecords,
    clinicsCount: dataset.stats.clinicsCount,
  };
}

