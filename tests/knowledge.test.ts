import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { getCanonicalDataset, getSheetRowsContext } from "@/lib/knowledge/server-store";
import { buildGoogleSheetCellLink, clearSheetGidCache } from "@/lib/knowledge/source-links";
import { validateCanonicalDataset } from "@/lib/knowledge/validator";
import { knowledgeRetriever } from "@/lib/knowledge/retriever";
import { normalizeDigits, normalizeText, detectLanguage, tokenizeQuery } from "@/lib/knowledge/normalize";
import { expandSynonyms } from "@/lib/knowledge/synonyms";
import { classifyQuery } from "@/lib/knowledge/intent";

describe("Canonical Knowledge Dataset & Pipeline Integrity", () => {
  it("loads and passes runtime canonical dataset schema validation with zero issues", () => {
    const dataset = getCanonicalDataset();
    const validation = validateCanonicalDataset(dataset);
    assert.equal(validation.valid, true, JSON.stringify(validation.issues));
    assert.ok(validation.recordCount >= 140, `Expected >=140 records, got ${validation.recordCount}`);
    assert.equal(dataset.clinics.length, 4);
  });

  it("accounts for all 448 Excel rows with zero unmapped rows in unresolved.json and audit report", () => {
    const unresolvedPath = path.join(process.cwd(), "data", "canonical", "unresolved.json");
    const auditPath = path.join(process.cwd(), "reports", "knowledge-audit.json");
    assert.equal(fs.existsSync(unresolvedPath), true);
    assert.equal(fs.existsSync(auditPath), true);
    const unresolved = JSON.parse(fs.readFileSync(unresolvedPath, "utf8")) as unknown[];
    assert.deepEqual(unresolved, []);
    const audit = JSON.parse(fs.readFileSync(auditPath, "utf8")) as {
      counts: {
        totalSourceSheets: number;
        totalSourceNonEmptyRows: number;
        successfullyMappedSourceRows: number;
        unmappedSourceRows: number;
      };
    };
    assert.equal(audit.counts.totalSourceSheets, 10);
    assert.equal(audit.counts.totalSourceNonEmptyRows, 448);
    assert.equal(audit.counts.successfullyMappedSourceRows, 448);
    assert.equal(audit.counts.unmappedSourceRows, 0);
  });

  it("preserves exact Excel 1-based row provenance and documented conflict records", () => {
    const conflicts = knowledgeRetriever.getConflicts();
    assert.ok(conflicts.length >= 2, "Expected documented conflicts to be preserved");
    const records = knowledgeRetriever.getAllRecords();
    for (const r of records) {
      assert.ok(r.source.file.length > 0);
      assert.ok(r.source.sheet.length > 0);
      assert.ok(Array.isArray(r.source.rows) && r.source.rows.length > 0);
      if (r.source.file === "Knowlege.xlsx") {
        assert.ok(r.source.cell, `Expected primary cell on ${r.id}`);
        assert.ok(r.source.cellRange, `Expected cellRange on ${r.id}`);
      }
    }

    const excerpt = getSheetRowsContext("Laser", 15, 2, "A15", "A15");
    assert.ok(excerpt);
    assert.equal(excerpt.rows.some((r) => r.row === 15 && r.isTarget), true);
    assert.ok(excerpt.sourceUrl?.includes("range=A15"));

    const prevGids = process.env.GOOGLE_SHEETS_GIDS;
    try {
      clearSheetGidCache();
      for (const r of records.filter((rec) => /knowlege\.xlsx$/i.test(rec.source.file))) {
        const direct = buildGoogleSheetCellLink(r.source);
        assert.equal(direct.hasSheetGid, true, `Expected default gid for ${r.source.sheet}`);
        assert.ok(
          direct.url?.includes("https://docs.google.com/spreadsheets/d/1hRfpnI6eU50BjdVu9lxB8vnNYGeH6MHE/edit?usp=sharing&ouid=109986504837760137236&rtpof=true&sd=true"),
          `Expected configured Google Sheet workbook URL on ${r.id}`
        );
        assert.ok(direct.url?.includes("#gid="));
        assert.ok(direct.url?.includes("&range="));
        assert.equal(direct.url?.includes("%3A"), false, `Expected unencoded range colon on ${r.id}`);
      }

      process.env.GOOGLE_SHEETS_GIDS = JSON.stringify({ Laser: "123456789" });
      clearSheetGidCache();
      const withGid = buildGoogleSheetCellLink({
        file: "Knowlege.xlsx",
        sheet: "Laser",
        rawSheet: "Laser ",
        row: 15,
        cell: "A15",
        cellRange: "A15",
      });
      assert.equal(withGid.hasSheetGid, true);
      assert.ok(withGid.url?.includes("#gid=123456789&range=A15"));
    } finally {
      if (prevGids === undefined) delete process.env.GOOGLE_SHEETS_GIDS;
      else process.env.GOOGLE_SHEETS_GIDS = prevGids;
      clearSheetGidCache();
    }
  });
});

describe("Bilingual Normalization, Synonyms & Intent Recognition", () => {
  it("normalizes Arabic diacritics, alef/teh-marbuta forms, and Arabic-Indic numerals", () => {
    assert.equal(normalizeDigits("٢٠٢٦"), "2026");
    assert.equal(normalizeText("إبرة النضارة"), "ابره النضاره");
    assert.equal(normalizeText("البُوتُوكْسِ ٢ مل"), "البوتوكس 2 مل");
  });

  it("detects Arabic, English, and mixed queries accurately", () => {
    assert.equal(detectLanguage("هل البوتوكس مسموح للحامل؟"), "ar");
    assert.equal(detectLanguage("Juvederm Voluma price"), "en");
    assert.equal(detectLanguage("سعر خيوط Aptos Cat Eye كام؟"), "mixed");
  });

  it("expands bilingual synonyms cleanly without false explosion", () => {
    const exp = expandSynonyms(tokenizeQuery("sculptera"));
    assert.ok(exp.includes("sculptra"));
    const clinicExp = expandSynonyms(tokenizeQuery("clinic"));
    assert.equal(clinicExp.includes("dermadent"), false);
  });

  it("recognizes comparison, safety, clinic, and unknown-clinic intents", () => {
    assert.equal(classifyQuery("Compare Botox vs Fillers").intent, "comparison");
    assert.equal(classifyQuery("هل الفيلر آمن للحامل؟").intent, "safety_pregnancy");
    assert.equal(classifyQuery("What devices does Dermadent have?").clinicHints[0], "dermadent");
    assert.equal(classifyQuery("What devices are at Cairo Star Clinic?").unknownClinicRequested, true);
    assert.equal(classifyQuery("Diagnose if patient can take Isotretinoin today").intent, "medical_diagnosis");
  });
});

describe("Knowledge Retrieval Quality, Ambiguity & Abstention", () => {
  it("retrieves Arabic, English, and mixed queries with top-1 accuracy", () => {
    const ar = knowledgeRetriever.retrieve("هل البوتوكس مسموح للحامل؟");
    assert.equal(ar.results[0]?.record.id, "safety-pregnancy-البوتوكس");
    assert.equal(ar.confidence, "strong");

    const en = knowledgeRetriever.retrieve("Candela GentleMax Pro Plus");
    assert.equal(en.results[0]?.record.id, "device-candela-gentlemax-pro-plus-أحدث-إصدار");

    const typo = knowledgeRetriever.retrieve("sculptera collagen");
    assert.equal(typo.results[0]?.record.id, "collagen-sculptra-10-ml");
  });

  it("outranks fuzzy matches when an exact product match exists", () => {
    const exact = knowledgeRetriever.retrieve("Juvederm Voluma");
    const fuzzy = knowledgeRetriever.retrieve("juviderm voluma");
    assert.equal(exact.results[0]?.record.id, "filler-juvederm-voluma");
    assert.equal(fuzzy.results[0]?.record.id, "filler-juvederm-voluma");
    assert.ok((exact.results[0]?.score ?? 0) > (fuzzy.results[0]?.score ?? 0));
  });

  it("flags ambiguity for underspecified multi-product queries and abstains on non-existent data", () => {
    const ambig = knowledgeRetriever.retrieve("Juvederm");
    assert.equal(ambig.confidence, "ambiguous");
    assert.equal(ambig.requiresClarification, true);
    assert.ok(ambig.clarificationCandidates.length >= 2);

    const nonexistentDevice = knowledgeRetriever.retrieve("Tell me about Emsculpt Neo Max Pro machine");
    assert.equal(nonexistentDevice.confidence, "none");

    const nonexistentClinic = knowledgeRetriever.retrieve("What laser devices are available at Cairo Star Clinic?");
    assert.equal(nonexistentClinic.confidence, "none");

    const missingOffer = knowledgeRetriever.retrieve("What is the Ramadan 50% discount package offer?");
    assert.equal(missingOffer.confidence, "none");
  });

  it("expands related records across clinics and safety rules", () => {
    const coolShaping = knowledgeRetriever.getById("device-cool-shaping-one-touch");
    assert.ok(coolShaping);
    const related = knowledgeRetriever.getRelated(coolShaping, 4);
    assert.ok(related.some((r) => r.clinicIds.includes("one-touch")));
  });
});
