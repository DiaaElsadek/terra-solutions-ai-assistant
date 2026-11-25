import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import { normalizeText, stripArabicPrefix, tokenizeQuery } from "@/lib/knowledge/normalize";
import {
  arabicPhoneticSkeleton,
  findControlledTypoMatch,
} from "@/lib/knowledge/transliteration";
import {
  getCanonicalSynonymEntries,
  matchUnsupportedCompound,
  resolveCanonicalEntities,
} from "@/lib/knowledge/synonyms";
import { knowledgeRetriever } from "@/lib/knowledge/retriever";
import { resolveContextualQuery } from "@/lib/knowledge/context-query";
import {
  getCanonicalRecords,
  getKnowledgeCacheMetadata,
  triggerKnowledgeIndexRebuild,
} from "@/lib/knowledge/server-store";
import { KnowledgeIngestionPipeline } from "@/lib/knowledge/ingestion/pipeline";
import { localFallbackProvider } from "@/lib/ai/providers/local-fallback-provider";
import { buildContextPackage } from "@/lib/ai/prompt-builder";
import { SYSTEM_PROMPT } from "@/constants/prompts";

describe("AI Engine Upgrade — Canonical Synonym & Phonetic Transliteration", () => {
  it("validates that every canonicalId and relatedConcepts reference in arabic-english-synonyms.json exists", () => {
    const validIds = new Set(getCanonicalRecords().map((r) => r.id));
    const entries = getCanonicalSynonymEntries();
    assert.ok(entries.length >= 20, "Expected rich canonical synonym dictionary");

    for (const entry of entries) {
      assert.ok(
        validIds.has(entry.canonicalId),
        `Missing canonicalId in dataset: ${entry.canonicalId}`
      );
      for (const relId of entry.relatedConcepts) {
        assert.ok(
          validIds.has(relId),
          `Missing relatedConcepts id in dataset: ${relId} (referenced by ${entry.canonicalId})`
        );
      }
    }
  });

  it("strips Arabic definite prefixes safely and unifies Facial transliterations", () => {
    assert.equal(normalizeText("البُوتُوكْسِ ٢ مل"), "البوتوكس 2 مل");
    assert.equal(normalizeText("فييييشيال"), "فيشيال");
    assert.equal(stripArabicPrefix("الفيشيال"), "فيشيال");
    assert.equal(stripArabicPrefix("والبوتوكس"), "بوتوكس");
    assert.equal(stripArabicPrefix("الوان"), "الوان");

    const baseSk = arabicPhoneticSkeleton("فيشيال");
    for (const variant of ["فيشال", "فيشيول", "فيشيل", "فيشل", "فشيال", "الفيشيال"]) {
      assert.equal(
        arabicPhoneticSkeleton(variant),
        baseSk,
        `Phonetic skeleton mismatch for "${variant}"`
      );
    }
  });

  it("resolves all Arabic, English, typo, and elongated Facial variations to facial-hydrafacial", () => {
    const queries = [
      "ايه هو الفيشيال؟",
      "يعني ايه فيشيال؟",
      "تفاصيل فيشيل",
      "فيشيول",
      "فشيال",
      "الفيشل",
      "فييييشيال",
      "تفاصيل الـ Facial.",
      "What is Facial Treatment?",
      "What is facail?",
      "faciel cleansing",
    ];
    for (const q of queries) {
      const res = knowledgeRetriever.retrieve(q, { limit: 4 });
      assert.equal(
        res.results[0]?.record.id,
        "facial-hydrafacial",
        `Expected top-1 "facial-hydrafacial" for "${q}", got "${res.results[0]?.record.id}"`
      );
      assert.notEqual(res.confidence, "none");
    }

    // Distinctness check: Facial must stay distinct from Skin Booster & Laser
    assert.equal(
      knowledgeRetriever.retrieve("ايه هو سكين بوستر؟").results[0]?.record.id,
      "skin-booster-overview"
    );
    assert.equal(
      knowledgeRetriever.retrieve("معلومات عن اللازر لازالة الشعر").results[0]?.record.id,
      "laser-hair-removal-overview"
    );
  });
});

describe("AI Engine Upgrade — Unsupported Compound & Typo Safety Guards", () => {
  it("blocks unsupported compound queries like بوتوكس الشعر / Hair Botox cleanly", async () => {
    for (const q of ["هل عندكم بوتوكس الشعر؟", "Hair Botox price?", "ايه أسعار بوتكس للشعر؟"]) {
      assert.ok(matchUnsupportedCompound(q), `Guard should match "${q}"`);
      const retrieval = knowledgeRetriever.retrieve(q, { limit: 6 });
      assert.equal(retrieval.confidence, "none");
      assert.equal(retrieval.results.length, 0);
      assert.ok(retrieval.missingIndicators.length >= 1);

      const fallback = await localFallbackProvider.generateResponse({
        userMessage: q,
        conversationHistory: [],
        systemPrompt: SYSTEM_PROMPT,
        contextPackage: buildContextPackage(retrieval).contextPackage,
        retrieval,
      });
      assert.equal(fallback.confidenceLevel, "none");
      assert.equal(fallback.sources.length, 0);
      assert.equal(fallback.structured?.status, "not_found");
    }
  });

  it("enforces short-token typo guard to prevent out-of-domain false positives", () => {
    assert.equal(findControlledTypoMatch("cars", ["care", "part"]), null);
    assert.equal(findControlledTypoMatch("cart", ["care", "part"]), null);
    assert.equal(findControlledTypoMatch("botx", ["botox"]), "botox");

    const ood = knowledgeRetriever.retrieve("What is the price of Ferrari sports cars?");
    assert.equal(ood.confidence, "none");
    assert.equal(ood.results.length, 0);

    const shortTrap = knowledgeRetriever.retrieve("ايه سعر cart؟");
    assert.equal(shortTrap.confidence, "none");
    assert.equal(shortTrap.results.length, 0);
  });
});

describe("AI Engine Upgrade — Comparisons, Pricing Gaps & Broad Categories", () => {
  it("retrieves both entities and builds a structured comparison table", async () => {
    const q = "ايه الفرق بين Facial و Skin Booster؟";
    const retrieval = knowledgeRetriever.retrieve(q, { limit: 6 });
    const ids = retrieval.results.slice(0, 3).map((r) => r.record.id);
    assert.ok(ids.includes("facial-hydrafacial"));
    assert.ok(ids.includes("skin-booster-overview"));

    const resp = await localFallbackProvider.generateResponse({
      userMessage: q,
      conversationHistory: [],
      systemPrompt: SYSTEM_PROMPT,
      contextPackage: "",
      retrieval,
    });
    const hasTableBlock = resp.structured?.answer.blocks.some((b) => b.type === "table");
    assert.ok(hasTableBlock, "Expected synthesized comparison table block");

    const arColloq = knowledgeRetriever.retrieve("Candela ولا Cynosure احسن لازالة الشعر؟");
    assert.equal(arColloq.classified.intent, "comparison");
    const colIds = arColloq.results.slice(0, 4).map((r) => r.record.id);
    assert.ok(
      colIds.includes("device-candela-gentlemax-pro-plus-أحدث-إصدار") ||
        colIds.includes("device-candela-gentlemax-pro-أحدث-إصدار")
    );
    assert.ok(colIds.includes("device-cynosure-elite-plus-سايناشور-إيليت-بلس"));
  });

  it("discloses missing pricing clearly instead of fabricating numbers or dumping unrelated offers", async () => {
    const q = "الفيشيال بكام؟";
    const retrieval = knowledgeRetriever.retrieve(q, { limit: 6 });
    assert.equal(retrieval.classified.intent, "price_offer_lookup");
    assert.equal(retrieval.results[0]?.record.id, "facial-hydrafacial");
    assert.ok(retrieval.missingIndicators.some((m) => /السعر|pricing/i.test(m)));

    const resp = await localFallbackProvider.generateResponse({
      userMessage: q,
      conversationHistory: [],
      systemPrompt: SYSTEM_PROMPT,
      contextPackage: "",
      retrieval,
    });
    assert.ok(resp.sources[0]?.title.startsWith("Hydrafacial (Basic, Deep, Korean Facial)"));
    assert.match(resp.answer, /السعر مش موجود/);
  });

  it("handles broad category discovery and clarifies overly generic asks", () => {
    const broadSkin = knowledgeRetriever.retrieve("ايه خدمات البشرة عندكم؟");
    assert.ok(broadSkin.results.length >= 3);
    assert.ok(broadSkin.classified.broadCategoryHints.includes("facial"));

    const vague = knowledgeRetriever.retrieve("عايز اعرف الجلسة.");
    assert.equal(vague.confidence, "ambiguous");
    assert.equal(vague.requiresClarification, true);
    assert.ok(vague.clarificationCandidates.length >= 2);
  });
});

describe("AI Engine Upgrade — Multi-Turn Context State & Server Cache Integration", () => {
  it("tracks follow-ups across turns and resets cleanly on explicit topic shift", () => {
    const t2 = resolveContextualQuery("طب سعره كام؟", [
      { role: "user", content: "ايه هو الفيشيال؟" },
      { role: "assistant", content: "Hydrafacial (Basic, Deep, Korean Facial)..." },
    ]);
    assert.equal(t2.usedContext, true);
    assert.equal(
      knowledgeRetriever.retrieve(t2.effectiveQuery).results[0]?.record.id,
      "facial-hydrafacial"
    );

    // Topic shift to Skin Booster must NOT carry Facial forward
    const shift = resolveContextualQuery("طب ايه هو السكين بوستر؟", [
      { role: "user", content: "ايه هو الفيشيال؟" },
      { role: "assistant", content: "Hydrafacial..." },
    ]);
    assert.equal(shift.usedContext, false);
    assert.equal(
      knowledgeRetriever.retrieve(shift.effectiveQuery).results[0]?.record.id,
      "skin-booster-overview"
    );

    // Follow-up clinic question ("فيها أجهزة تاتو؟") carries active clinic Dermadent forward
    const clinicFollow = resolveContextualQuery("موجودة فيها أجهزة تاتو؟", [
      { role: "user", content: "ممكن معلومات عن عيادة Dermadent؟" },
    ]);
    assert.equal(clinicFollow.usedContext, true);
    const clinicRet = knowledgeRetriever.retrieve(clinicFollow.effectiveQuery);
    assert.equal(clinicRet.results[0]?.record.id, "tattoo-device-dermadent");
  });

  it("preloads canonical cache cleanly without per-request Excel parsing and rebuilds on ingestion", async () => {
    const metaBefore = getKnowledgeCacheMetadata();
    assert.equal(metaBefore.excelParsedPerRequest, false);
    assert.equal(metaBefore.totalRecords, 148);
    assert.ok(metaBefore.synonymEntries >= 20);
    assert.ok(metaBefore.indexBuildCount >= 1);

    // Confirm raw workbook path is not read anywhere inside /api/chat route
    const chatRouteSource = fs.readFileSync(
      path.join(process.cwd(), "app/api/chat/route.ts"),
      "utf8"
    );
    assert.equal(/Knowlege\.xlsx|xlsx/i.test(chatRouteSource), false);

    // Confirm ingestion pipeline callback integrates with triggerKnowledgeIndexRebuild
    const pipeline = new KnowledgeIngestionPipeline([], [], () => {
      triggerKnowledgeIndexRebuild();
    });
    pipeline.ingestSource({
      fileName: "test-offer-note.txt",
      fileType: "txt",
      rawContent: "Title: Consultation Note\nDescription: Internal call script reminder.",
    });
    const metaAfter = getKnowledgeCacheMetadata();
    assert.ok(metaAfter.indexBuildCount > metaBefore.indexBuildCount);
    assert.ok(tokenizeQuery("الفيشيال").includes("فيشيال"));
    assert.ok(resolveCanonicalEntities(["فيشيال"], "فيشيال").length >= 1);
  });
});
