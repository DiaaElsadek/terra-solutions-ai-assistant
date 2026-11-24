/**
 * Server-side Knowledge Explorer API.
 * Serves normalized records, categories, clinics, related records, conflict info,
 * and exact spreadsheet row/cell excerpts (`?sheet=...&row=...`) with deep links.
 */

import { NextResponse } from "next/server";
import { knowledgeRetriever } from "@/lib/knowledge/retriever";
import { getSheetRowsContext } from "@/lib/knowledge/server-store";
import { buildGoogleSheetCellLink } from "@/lib/knowledge/source-links";
import {
  checkRateLimit,
  extractClientKey,
  sanitizeUserText,
} from "@/lib/security/api-guard";
import type {
  KnowledgeCategory,
  KnowledgeRecord,
  KnowledgeRecordType,
} from "@/types/knowledge";

function withSourceLink(record: KnowledgeRecord): KnowledgeRecord {
  const link = buildGoogleSheetCellLink(record.source);
  if (!link.url) return record;
  return {
    ...record,
    source: {
      ...record.source,
      url: link.url,
      hasSheetGid: link.hasSheetGid,
    },
  };
}

export async function GET(request: Request) {
  const clientKey = extractClientKey(request);
  const rate = checkRateLimit(clientKey, 60);
  if (!rate.allowed) {
    return NextResponse.json(
      { error: "Rate limit exceeded." },
      { status: 429 }
    );
  }

  const { searchParams } = new URL(request.url);
  const sheetParam = searchParams.get("sheet");
  const rowParam = searchParams.get("row");

  if (sheetParam && rowParam) {
    const rowNum = Number.parseInt(rowParam, 10);
    if (!Number.isFinite(rowNum) || rowNum <= 0) {
      return NextResponse.json({ error: "Invalid row number." }, { status: 400 });
    }
    const cell = searchParams.get("cell")?.trim() || undefined;
    const range = searchParams.get("range")?.trim() || undefined;
    const excerpt = getSheetRowsContext(sheetParam, rowNum, 3, cell, range);
    if (!excerpt) {
      return NextResponse.json(
        { error: "Worksheet row context not found." },
        { status: 404 }
      );
    }
    return NextResponse.json({ sheetContext: excerpt });
  }

  const id = searchParams.get("id")?.trim();

  if (id) {
    const record = knowledgeRetriever.getById(id);
    if (!record) {
      return NextResponse.json({ error: "Record not found." }, { status: 404 });
    }
    const enriched = withSourceLink(record);
    const related = knowledgeRetriever.getRelated(record, 5).map(withSourceLink);
    const sheetContext = getSheetRowsContext(
      record.source.rawSheet || record.source.sheet,
      record.source.row,
      3,
      record.source.cell,
      record.source.cellRange
    );
    return NextResponse.json({ record: enriched, related, sheetContext });
  }

  const q = sanitizeUserText(searchParams.get("q") || "").slice(0, 200);
  const category = (searchParams.get("category")?.trim() || "all") as
    | KnowledgeCategory
    | "all";
  const recordType = (searchParams.get("recordType")?.trim() || "all") as
    | KnowledgeRecordType
    | "all";
  const clinicId = searchParams.get("clinicId")?.trim() || "";

  const categories = knowledgeRetriever
    .getCategoriesWithCounts()
    .filter((c) => c.recordCount > 0);
  const clinics = knowledgeRetriever.getClinics();
  const conflicts = knowledgeRetriever.getConflicts();

  if (q) {
    const retrieval = knowledgeRetriever.retrieve(q, {
      category: category === "all" ? undefined : category,
      recordType: recordType === "all" ? undefined : recordType,
      clinicId: clinicId || undefined,
      limit: 25,
    });
    return NextResponse.json({
      categories,
      clinics,
      conflicts,
      totalRecords: knowledgeRetriever.getAllRecords().length,
      records: retrieval.results.map((r) => ({
        ...withSourceLink(r.record),
        _score: r.score,
        _matchReasons: r.matchReasons,
      })),
    });
  }

  let filtered = knowledgeRetriever.getAllRecords();
  if (category !== "all") {
    filtered = filtered.filter((r) => r.category === category);
  }
  if (recordType !== "all") {
    filtered = filtered.filter((r) => r.recordType === recordType);
  }
  if (clinicId) {
    filtered = filtered.filter((r) => r.clinicIds.includes(clinicId));
  }

  return NextResponse.json({
    categories,
    clinics,
    conflicts,
    totalRecords: knowledgeRetriever.getAllRecords().length,
    records: filtered.slice(0, 40).map(withSourceLink),
  });
}
