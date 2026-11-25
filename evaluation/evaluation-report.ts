/**
 * CLI Entrypoint to execute the full 118+ question evaluation suite,
 * save `evaluation/report.json` & `evaluation/baseline.json`, and generate
 * `evaluation/report.md` & `reports/knowledge-evaluation.md`.
 */

import fs from "node:fs";
import path from "node:path";
import { runKnowledgeEvaluation } from "./evaluation-runner";

function pct(v: number): string {
  return `${(v * 100).toFixed(1)}%`;
}

async function main() {
  const summary = await runKnowledgeEvaluation();
  const root = process.cwd();

  const baselinePath = path.join(root, "evaluation", "baseline.json");
  const reportJsonPath = path.join(root, "evaluation", "report.json");
  let previousBaseline: { overallPassRate?: number; recallAt3?: number } | null = null;
  if (fs.existsSync(baselinePath)) {
    try {
      previousBaseline = JSON.parse(fs.readFileSync(baselinePath, "utf8"));
    } catch {
      previousBaseline = null;
    }
  }

  const serializedPayload =
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        ...summary,
      },
      null,
      2
    ) + "\n";

  fs.writeFileSync(baselinePath, serializedPayload, "utf8");
  fs.writeFileSync(reportJsonPath, serializedPayload, "utf8");

  const failedCases = summary.cases.filter((c) => !c.passed);

  const lines: string[] = [
    "# Terra Solutions AI Knowledge Evaluation Report",
    "",
    `**Generated:** ${new Date().toISOString()}`,
    `**Evaluation Set:** \`evaluation/questions.json\` (${summary.totalQuestions} bilingual, typo, comparison, follow-up, and abstention cases)`,
    "",
    "## Summary Metrics",
    "",
    "| Metric | Score | Scope |",
    "| --- | --- | --- |",
    `| Overall Evaluation Pass Rate | **${pct(summary.overallPassRate)}** | All ${summary.totalQuestions} cases |`,
    `| Top-1 Accuracy | **${pct(summary.top1Accuracy)}** | ${summary.retrievalQuestions} retrieval cases |`,
    `| Recall@1 (Hit@1) | **${pct(summary.recallAt1)}** | ${summary.retrievalQuestions} retrieval cases |`,
    `| Recall@3 (Hit@3) | **${pct(summary.recallAt3)}** | ${summary.retrievalQuestions} retrieval cases |`,
    `| Recall@5 (Hit@5) | **${pct(summary.recallAt5)}** | ${summary.retrievalQuestions} retrieval cases |`,
    `| Precision@3 | **${pct(summary.precisionAt3)}** | ${summary.retrievalQuestions} retrieval cases |`,
    `| Entity / Synonym Resolution Accuracy | **${pct(summary.entityResolutionAccuracy)}** | ${summary.entityResolutionQuestions} transliteration/mixed/English cases |`,
    `| Typo Correction Accuracy | **${pct(summary.typoCorrectionAccuracy)}** | ${summary.typoQuestions} typo cases |`,
    `| Follow-Up Context Resolution Rate | **${pct(summary.followupContextResolutionRate)}** | ${summary.followupQuestions} multi-turn follow-up cases |`,
    `| Intent Classification Accuracy | **${pct(summary.intentClassificationAccuracy)}** | ${summary.intentEvaluatedQuestions} intent-annotated cases |`,
    `| Source Provenance Coverage | **${pct(summary.sourceCoverageRate)}** | File + sheet + row present |`,
    `| Ambiguity Clarification Rate | **${pct(summary.ambiguityPassRate)}** | ${summary.clarificationQuestions} ambiguous cases |`,
    `| Missing-Data Disclosure Rate | **${pct(summary.missingDataDisclosureRate)}** | ${summary.missingIndicatorQuestions} partial-info cases |`,
    `| Abstention Accuracy | **${pct(summary.hallucinationAbstentionRate)}** | ${summary.abstentionQuestions} unsupported/out-of-domain cases |`,
    `| Unsupported-Answer Rate | **${pct(summary.unsupportedAnswerRate)}** | ${summary.abstentionQuestions} negative/unsupported cases |`,
    `| False-Positive Retrieval Rate | **${pct(summary.falsePositiveRetrievalRate)}** | ${summary.abstentionQuestions} negative/unsupported cases |`,
    "",
  ];

  if (previousBaseline?.overallPassRate !== undefined) {
    const delta = summary.overallPassRate - previousBaseline.overallPassRate;
    lines.push(
      `## Regression Delta vs. Previous Baseline`,
      `- Overall Pass Rate delta: ${delta >= 0 ? "+" : ""}${pct(delta)}`,
      ""
    );
  }

  lines.push(
    "## Metric Definitions & Limitations",
    "",
    "- **Hit@K / Recall@K:** Measures whether at least one expected canonical record ID appears in the top *K* retrieved candidates. Multi-turn follow-up cases resolve context first via `resolveContextualQuery`.",
    "- **Precision@3:** Fraction of the top-3 returned records belonging to `expectedRecordIds`. Single-target queries returning 3 context items peak at `33.3%` even at `100%` Top-1 accuracy.",
    "- **Abstention & Unsupported-Answer Rate:** Evaluates whether unsupported compounds (e.g., `بوتوكس الشعر`), short-word typo traps, nonexistent clinics/devices, unavailable offers, and diagnosis requests cleanly abstain (`confidenceLevel: none`).",
    "- **Deterministic vs. Live LLM:** Benchmarks the canonical hybrid retrieval + deterministic grounded fallback layer (`local_fallback`). Live Gemini phrasing introduces natural language generation over these verified context packets.",
    ""
  );

  if (failedCases.length > 0) {
    lines.push("## Failed Cases", "");
    for (const f of failedCases) {
      lines.push(
        `- **${f.id}** (\`${f.query}\`): ${f.failureReason} (top: \`${f.topIds.slice(0, 3).join(", ")}\`)`
      );
    }
    lines.push("");
  } else {
    lines.push(
      "## Failed Cases",
      "",
      `None — all ${summary.totalQuestions} evaluation cases passed.`,
      ""
    );
  }

  lines.push(
    "## Case-by-Case Log",
    "",
    "| ID | Category | Query | Passed | Intent | Confidence | Top Match |",
    "| --- | --- | --- | --- | --- | --- | --- |"
  );
  for (const c of summary.cases) {
    lines.push(
      `| ${c.id} | ${c.category} | ${c.query.replace(/\|/g, "\\|")} | ${c.passed ? "PASS" : "FAIL"} | \`${c.intent}\` | ${c.confidence} | \`${c.topIds[0] || "none"}\` |`
    );
  }

  const markdownOut = lines.join("\n") + "\n";
  fs.writeFileSync(path.join(root, "evaluation", "report.md"), markdownOut, "utf8");
  fs.writeFileSync(path.join(root, "reports", "knowledge-evaluation.md"), markdownOut, "utf8");

  console.log(
    `Evaluation complete: pass=${pct(summary.overallPassRate)} (${summary.cases.filter((c) => c.passed).length}/${summary.totalQuestions}), ` +
      `Top1=${pct(summary.top1Accuracy)}, Recall@3=${pct(summary.recallAt3)}, Recall@5=${pct(summary.recallAt5)}, ` +
      `Entity=${pct(summary.entityResolutionAccuracy)}, Typo=${pct(summary.typoCorrectionAccuracy)}, ` +
      `FollowUp=${pct(summary.followupContextResolutionRate)}, Abstention=${pct(summary.hallucinationAbstentionRate)}`
  );

  if (failedCases.length > 0) {
    for (const f of failedCases) {
      console.error(`  FAIL ${f.id} (${f.query}): ${f.failureReason}`);
    }
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

