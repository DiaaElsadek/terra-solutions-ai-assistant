import { describe, it } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  sanitizeRichText,
  stripSemanticTags,
  validateModelRichResponse,
  type RichAIResponse,
} from "@/lib/ai/response-schema";
import { knowledgeRetriever } from "@/lib/knowledge/retriever";
import { AIResponseRenderer } from "@/components/chat/AIResponseRenderer";
import { TerraMark } from "@/components/branding/TerraMark";
import { TERRA_T_FULL_PATH } from "@/components/branding/terra-logo-geometry";

describe("TerraMark Brand Identity Component", () => {
  it("renders exact original Terra T SVG path across sizes and container variants", () => {
    const html = renderToStaticMarkup(
      React.createElement(TerraMark, { size: "lg", variant: "tile", decorative: false })
    );
    assert.ok(html.includes(TERRA_T_FULL_PATH));
    assert.ok(html.includes('fill="#CBB36A"'));
    assert.ok(html.includes('role="img"'));
  });
});

describe("Safe Semantic Inline Tokens & XSS Guard", () => {
  it("preserves whitelisted semantic inline tags and strips unsafe HTML or unclosed markers", () => {
    const clean = sanitizeRichText(
      "سعر <important>5000 AED</important> مع <warning>فترة تعافي 7 أيام</warning> و<success>متاح الآن</success>."
    );
    assert.ok(clean.includes("<important>5000 AED</important>"));
    assert.ok(clean.includes("<warning>فترة تعافي 7 أيام</warning>"));
    assert.ok(clean.includes("<success>متاح الآن</success>"));

    const strippedAttack = sanitizeRichText(
      '<important onclick="alert(1)">5000 AED</important><script>xss()</script><red>bad</red><info>safe</info>'
    );
    assert.equal(strippedAttack.includes("<script>"), false);
    assert.equal(strippedAttack.includes("onclick"), false);
    assert.equal(strippedAttack.includes("<red>"), false);
    assert.ok(strippedAttack.includes("5000 AED"));
    assert.ok(strippedAttack.includes("<info>safe</info>"));

    const unclosed = sanitizeRichText("<important>Unclosed value");
    assert.equal(unclosed, "Unclosed value");

    assert.equal(
      stripSemanticTags("Price <important>5000 AED</important> / <danger>Avoid</danger>"),
      "Price 5000 AED / Avoid"
    );
  });

  it("renders grouped metrics, important callouts, inline highlights, and pipe tables safely", () => {
    const rich: RichAIResponse = {
      schemaVersion: "1.0",
      language: "mixed",
      status: "success",
      answer: {
        summary: "ملخص الأسعار والمواصفات",
        blocks: [
          {
            type: "paragraph",
            text: "السعر الرسمي <important>5000 AED</important> ولا يُنصح به <danger>للحامل</danger><script>bad()</script>.",
          },
          { type: "metric", label: "Aptos Cat Eye", value: "5000 AED", tone: "important" },
          { type: "metric", label: "Aptos Lifting", value: "8000 AED", tone: "success" },
          {
            type: "callout",
            tone: "important",
            title: "تنبيه تشغيلي",
            text: "تأكد من <warning>تقييم الطبيب</warning> قبل التأكيد.",
          },
          {
            type: "paragraph",
            text: "| Service | Price |\n| --- | --- |\n| Cat Eye | 5000 AED |\n| Lifting | 8000 AED |",
          },
        ],
      },
      sources: [
        {
          recordId: "r1",
          fileName: "Knowlege.xlsx",
          sheetName: "Filler+Botox+Threads",
          rowNumber: 180,
        },
      ],
      meta: { provider: "gemini", model: "terra", grounded: true },
    };

    const retrieved = knowledgeRetriever.retrieve("Aptos Cat Eye").results.map((r) => r.record);
    const outcome = validateModelRichResponse(JSON.stringify(rich), {
      retrievedRecords: retrieved,
      confidence: "strong",
      fallbackLanguage: "mixed",
      provider: "gemini",
      model: "terra",
    });
    assert.ok(outcome.ok && outcome.response);
    const html = renderToStaticMarkup(
      React.createElement(AIResponseRenderer, { response: outcome.response })
    );

    assert.equal(html.includes("<script>"), false);
    assert.ok(html.includes("5000 AED"));
    assert.ok(html.includes("8000 AED"));
    assert.ok(html.includes("<table"));
    assert.ok(html.includes("sm:grid-cols-2"));
    assert.ok(html.includes("border-s-primary"));
    assert.ok(html.includes("Copy table"));
  });
});
