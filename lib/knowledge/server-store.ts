/**
 * Server-only canonical knowledge store, metadata cache, & raw worksheet row-context loader.
 *
 * Performance & Architecture:
 * - Never parses `Knowlege.xlsx` during incoming chat requests.
 * - Validates and caches `knowledge.canonical.json` and `sheet-rows.json` in memory once per worker.
 * - Exposes index rebuild/invalidation hooks cleanly for future document ingestion runs.
 * - SECURITY: Must never be imported into client components or exposed via public/.
 */

import fs from "node:fs";
import path from "node:path";
import type {
  CanonicalKnowledgeDataset,
  KnowledgeRecord,
  CanonicalClinic,
  KnowledgeConflict,
} from "@/types/knowledge";
import { validateCanonicalDataset } from "./validator";
import { buildGoogleSheetCellLink } from "./source-links";
import { getCanonicalSynonymEntries } from "./synonyms";
import canonicalData from "@/data/canonical/knowledge.canonical.json";

export interface SheetContextRow {
  row: number;
  cells: Record<string, string>;
  isTarget: boolean;
}

export interface SheetContextExcerpt {
  file: string;
  sheet: string;
  rawSheet: string;
  targetRow: number;
  targetCell?: string;
  sourceUrl?: string;
  hasSheetGid: boolean;
  columns: string[];
  rows: SheetContextRow[];
}

export interface KnowledgeCacheMetadata {
  schemaVersion: string;
  generatedAt: string;
  loadedAt: string;
  indexBuildCount: number;
  totalRecords: number;
  synonymEntries: number;
  clinicsCount: number;
  conflictsCount: number;
  excelParsedPerRequest: false;
}

type RawSheetRowsIndex = Record<
  string,
  Array<{ row: number; cells: Record<string, string> }>
>;

let cachedDataset: CanonicalKnowledgeDataset | null = null;
let cachedSheetRows: RawSheetRowsIndex | null = null;
let cacheLoadedAt: string | null = null;
let indexBuildCount = 0;
const rebuildListeners = new Set<() => void>();

function assertServerContext(): void {
  if (typeof window !== "undefined") {
    throw new Error(
      "[Terra Security] Canonical knowledge store must only be accessed on the server."
    );
  }
}

export function registerKnowledgeRebuildListener(fn: () => void): () => void {
  rebuildListeners.add(fn);
  return () => {
    rebuildListeners.delete(fn);
  };
}

export function incrementKnowledgeIndexBuildCount(): void {
  indexBuildCount += 1;
}

/** Load and validate the canonical dataset once per server worker. */
export function getCanonicalDataset(): CanonicalKnowledgeDataset {
  assertServerContext();
  if (cachedDataset) return cachedDataset;

  const dataset = canonicalData as unknown as CanonicalKnowledgeDataset;
  const validation = validateCanonicalDataset(dataset);
  if (!validation.valid) {
    console.error(
      "[Terra Knowledge Validation Error]",
      validation.issues.slice(0, 5)
    );
    throw new Error(
      `Canonical knowledge validation failed (${validation.issues.length} issues).`
    );
  }

  cachedDataset = dataset;
  cacheLoadedAt = new Date().toISOString();
  return cachedDataset;
}

/**
 * Trigger an explicit index rebuild across listeners (e.g. after ingesting new sources
 * or modifying synonym dictionaries) without restarting the server process.
 */
export function triggerKnowledgeIndexRebuild(): KnowledgeCacheMetadata {
  assertServerContext();
  cachedDataset = null;
  cachedSheetRows = null;
  getCanonicalDataset();
  for (const fn of rebuildListeners) {
    fn();
  }
  return getKnowledgeCacheMetadata();
}

export function getKnowledgeCacheMetadata(): KnowledgeCacheMetadata {
  const ds = getCanonicalDataset();
  return {
    schemaVersion: String(ds.schemaVersion || "1.0"),
    generatedAt: String(ds.generatedAt || ""),
    loadedAt: cacheLoadedAt || new Date().toISOString(),
    indexBuildCount,
    totalRecords: ds.records.length,
    synonymEntries: getCanonicalSynonymEntries().length,
    clinicsCount: ds.clinics.length,
    conflictsCount: ds.conflicts.length,
    excelParsedPerRequest: false,
  };
}

function getSheetRowsIndex(): RawSheetRowsIndex {
  assertServerContext();
  if (cachedSheetRows) return cachedSheetRows;
  try {
    const filePath = path.join(
      process.cwd(),
      "data",
      "canonical",
      "sheet-rows.json"
    );
    const raw = fs.readFileSync(filePath, "utf8");
    cachedSheetRows = JSON.parse(raw) as RawSheetRowsIndex;
    return cachedSheetRows;
  } catch {
    return {};
  }
}

export function getCanonicalRecords(): KnowledgeRecord[] {
  return getCanonicalDataset().records;
}

export function getCanonicalClinics(): CanonicalClinic[] {
  return getCanonicalDataset().clinics;
}

export function getCanonicalConflicts(): KnowledgeConflict[] {
  return getCanonicalDataset().conflicts;
}

/**
 * Retrieve ±radius rows around `targetRow` for a worksheet, with exact Excel columns (A, B, C...)
 * and computed Google Sheets deep link (`#gid=...&range=...`).
 */
export function getSheetRowsContext(
  sheetName: string,
  targetRow: number,
  radius = 3,
  targetCell?: string,
  targetRange?: string
): SheetContextExcerpt | null {
  assertServerContext();
  if (!sheetName || targetRow <= 0) return null;

  const index = getSheetRowsIndex();
  const normalizedTarget = sheetName.trim().toLowerCase();
  const matchedRawSheet = Object.keys(index).find(
    (k) => k === sheetName || k.trim().toLowerCase() === normalizedTarget
  );
  if (!matchedRawSheet) return null;

  const allRows = index[matchedRawSheet] || [];
  const filtered = allRows.filter(
    (r) => Math.abs(r.row - targetRow) <= radius
  );
  if (filtered.length === 0) return null;

  const colSet = new Set<string>();
  for (const r of filtered) {
    for (const col of Object.keys(r.cells || {})) {
      colSet.add(col);
    }
  }
  const columns = Array.from(colSet).sort((a, b) =>
    a.length !== b.length ? a.length - b.length : a.localeCompare(b)
  );

  const link = buildGoogleSheetCellLink({
    file: "Knowlege.xlsx",
    sheet: matchedRawSheet.trim(),
    rawSheet: matchedRawSheet,
    row: targetRow,
    cell: targetCell,
    cellRange: targetRange,
  });

  return {
    file: "Knowlege.xlsx",
    sheet: matchedRawSheet.trim(),
    rawSheet: matchedRawSheet,
    targetRow,
    targetCell: targetCell || (columns[0] ? `${columns[0]}${targetRow}` : undefined),
    sourceUrl: link.url,
    hasSheetGid: link.hasSheetGid,
    columns,
    rows: filtered.map((r) => ({
      row: r.row,
      cells: r.cells,
      isTarget: r.row === targetRow,
    })),
  };
}
