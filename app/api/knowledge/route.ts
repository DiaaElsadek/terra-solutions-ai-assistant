/**
 * Server-side Knowledge Explorer API.
 * Serves normalized records, categories, clinics, related records, and conflict info
 * to the authenticated /chat Knowledge Explorer without exposing raw files in public/.
 */

import { NextResponse } from "next/server";
import { knowledgeRetriever } from "@/lib/knowledge/retriever";
import {
  checkRateLimit,
  extractClientKey,
  sanitizeUserText,
} from "@/lib/security/api-guard";
import type { KnowledgeCategory, KnowledgeRecordType } from "@/types/knowledge";

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
  const id = searchParams.get("id")?.trim();

  if (id) {
    const record = knowledgeRetriever.getById(id);
    if (!record) {
      return NextResponse.json({ error: "Record not found." }, { status: 404 });
    }
    const related = knowledgeRetriever.getRelated(record, 5);
    return NextResponse.json({ record, related });
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
        ...r.record,
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
    records: filtered.slice(0, 40),
  });
}

