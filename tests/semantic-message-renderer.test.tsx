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
import { MarkdownRenderer } from "@/components/chat/MarkdownRenderer";
import { InformationCard } from "@/components/chat/response/InformationCard";
import { ResponseTable } from "@/components/chat/response/ResponseTable";
import { ResponseMetricGroup } from "@/components/chat/response/ResponseMetric";
import { TerraMark } from "@/components/branding/TerraMark";
import { TERRA_T_FULL_PATH } from "@/components/branding/terra-logo-geometry";
import { detectTextDirection, splitBilingualLines } from "@/lib/i18n/bidi";

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

  it("renders attribute specifications as InformationCard grids and sanitizes Markdown links safely", () => {
    const richBrief: RichAIResponse = {
      schemaVersion: "1.0",
      language: "en",
      status: "success",
      answer: {
        summary: "Verified service briefing",
        blocks: [
          { type: "badge", label: "Verified Record", tone: "success" },
          {
            type: "table",
            title: "Clinical & Service Profile",
            columns: [
              { key: "field", label: "Attribute" },
              { key: "value", label: "Verified Value" },
            ],
            rows: [
              { field: "Allowed During Pregnancy", value: "Not allowed during pregnancy" },
              { field: "Verified Price", value: "5000 AED" },
            ],
          },
        ],
      },
      sources: [],
      meta: { provider: "local_fallback", model: "terra", grounded: true },
    };

    const cardHtml = renderToStaticMarkup(
      React.createElement(AIResponseRenderer, { response: richBrief })
    );
    assert.ok(cardHtml.includes("<dl"));
    assert.ok(cardHtml.includes("text-red-300"));
    assert.ok(cardHtml.includes("text-emerald-300"));

    const mdHtml = renderToStaticMarkup(
      React.createElement(MarkdownRenderer, {
        content:
          "See [Verified Sheet](https://docs.google.com/spreadsheets/d/1hRfpnI6eU50BjdVu9lxB8vnNYGeH6MHE/edit) or [Unsafe](javascript:alert(1)).",
      })
    );
    assert.ok(mdHtml.includes("https://docs.google.com/spreadsheets/d/1hRfpnI6eU50BjdVu9lxB8vnNYGeH6MHE/edit"));
    assert.equal(mdHtml.includes("javascript:"), false);
  });

  it("aligns Arabic blocks right (RTL) and English blocks left (LTR) in mixed bilingual responses", () => {
    assert.equal(
      detectTextDirection("Candela GentleMax Pro Plus جهاز ليزر لإزالة الشعر"),
      "rtl"
    );
    assert.equal(
      detectTextDirection("Allergan Botox 100 unit: يستخدم لتقليل التجاعيد"),
      "rtl"
    );
    assert.equal(
      detectTextDirection("Candela dual-wavelength laser hair removal device"),
      "ltr"
    );
    assert.equal(
      detectTextDirection("Laser hair removal (إزالة الشعر بالليزر)"),
      "ltr"
    );

    const dualLines = splitBilingualLines(
      "السعر غير متوفر حاليًا في ملفات المعرفة. / Exact pricing is not listed currently."
    );
    assert.equal(dualLines.length, 2);
    assert.equal(dualLines[0].dir, "rtl");
    assert.equal(dualLines[1].dir, "ltr");

    const mixedRich: RichAIResponse = {
      schemaVersion: "1.0",
      language: "mixed",
      status: "success",
      answer: {
        summary: "تفاصيل الخدمة بالعربي\nService summary in English",
        blocks: [
          { type: "heading", level: 2, text: "تفاصيل جهاز Candela GentleMax Pro Plus" },
          {
            type: "paragraph",
            text: "Candela GentleMax Pro Plus جهاز ليزر متطور لإزالة الشعر.\nAvailable across verified Terra branches.",
          },
          {
            type: "list",
            style: "bullet",
            items: [
              "مناسب للبشرة الحساسة وتقدر تتصل بالفرع للتأكيد.",
              "Sessions are scheduled based on skin assessment.",
            ],
          },
        ],
      },
      sources: [],
      meta: { provider: "gemini", model: "terra", grounded: true },
    };

    const richHtml = renderToStaticMarkup(
      React.createElement(AIResponseRenderer, { response: mixedRich })
    );
    assert.ok(richHtml.includes('dir="rtl"'));
    assert.ok(richHtml.includes('text-right'));
    assert.ok(richHtml.includes('dir="ltr"'));
    assert.ok(richHtml.includes('text-left'));
    assert.ok(richHtml.includes('<bdi dir="ltr">Candela GentleMax Pro Plus</bdi>'));

    const cardHtml = renderToStaticMarkup(
      React.createElement(InformationCard, {
        title: "Service Profile / ملف الخدمة",
        rows: [
          { field: "Duration", value: "من ٣٠ إلى ٤٥ دقيقة تقريبًا" },
          { field: "الملاحظات", value: "Consult physician before booking" },
        ],
      })
    );
    assert.ok(cardHtml.includes('dir="ltr"'));
    assert.ok(cardHtml.includes('dir="rtl"'));
    assert.ok(cardHtml.includes('text-right'));
    assert.ok(cardHtml.includes('text-left'));

    const tableHtml = renderToStaticMarkup(
      React.createElement(ResponseTable, {
        cols: [
          { key: "name", label: "Service" },
          { key: "notes", label: "الملاحظات" },
        ],
        rows: [
          {
            name: "Aptos Cat Eye",
            notes: "مناسب لرفع الحاجب بدون جراحة",
          },
        ],
      })
    );
    assert.ok(tableHtml.includes('<th dir="ltr"'));
    assert.ok(tableHtml.includes('<th dir="rtl"'));
    assert.ok(tableHtml.includes('<td dir="ltr"'));
    assert.ok(tableHtml.includes('<td dir="rtl"'));

    const metricHtml = renderToStaticMarkup(
      React.createElement(ResponseMetricGroup, {
        items: [{ label: "سعر الجلسة الواحدة", value: "5000 AED" }],
      })
    );
    assert.ok(metricHtml.includes('dir="rtl"'));
    assert.ok(metricHtml.includes('<bdi dir="ltr"'));

    const mdMixedHtml = renderToStaticMarkup(
      React.createElement(MarkdownRenderer, {
        content: [
          "### Candela GentleMax Pro Plus للعيادات",
          "",
          "يستخدم جهاز Candela GentleMax Pro Plus لإزالة الشعر بأمان.",
          "",
          "Clinical consultation is required before the first session.",
          "",
          "- الجلسة تستغرق ٣٠ دقيقة",
          "- Suitable for approved treatment areas",
        ].join("\n"),
      })
    );
    assert.ok(mdMixedHtml.includes('dir="rtl"'));
    assert.ok(mdMixedHtml.includes('text-right'));
    assert.ok(mdMixedHtml.includes('dir="ltr"'));
    assert.ok(mdMixedHtml.includes('text-left'));
    assert.ok(mdMixedHtml.includes('<bdi dir="ltr">Candela GentleMax Pro Plus</bdi>'));
  });
});
