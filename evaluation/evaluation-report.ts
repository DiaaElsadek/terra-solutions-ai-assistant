/**
 * CLI Entrypoint to execute the 56-question evaluation suite,
 * save `evaluation/baseline.json`, and generate `reports/knowledge-evaluation.md`.
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
  let previousBaseline: { overallPassRate?: number; recallAt3?: number } | null = null;
  if (fs.existsSync(baselinePath)) {
    try {
      previousBaseline = JSON.parse(fs.readFileSync(baselinePath, "utf8"));
    } catch {
      previousBaseline = null;
    }
  }

  fs.writeFileSync(
    baselinePath,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        ...summary,
      },
      null,
      2
    ) + "\n",
    "utf8"
  );

  const failedCases = summary.cases.filter((c) => !c.passed);

  const lines: string[] = [
    "# Terra AI Knowledge Evaluation Report",
    "",
    `**Generated:** ${new Date().toISOString()}`,
    `**Evaluation Set:** \`evaluation/questions.json\` (${summary.totalQuestions} grounded questions)`,
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
    `| Source Provenance Coverage | **${pct(summary.sourceCoverageRate)}** | File + sheet + row present |`,
    `| Ambiguity Clarification Rate | **${pct(summary.ambiguityPassRate)}** | ${summary.clarificationQuestions} ambiguous cases |`,
    `| Missing-Data Disclosure Rate | **${pct(summary.missingDataDisclosureRate)}** | ${summary.missingIndicatorQuestions} partial-info cases |`,
    `| Hallucination Abstention Rate | **${pct(summary.hallucinationAbstentionRate)}** | ${summary.abstentionQuestions} negative/out-of-domain cases |`,
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
    "- **Hit@K / Recall@K:** Measures whether at least one expected canonical record ID appears in the top *K* retrieved candidates. Note: multi-item queries where several valid records could answer the question are evaluated leniently by checking membership in `expectedRecordIds`.",
    "- **Precision@3:** Fraction of the top-3 returned records belonging to `expectedRecordIds`. Because some single-product queries only have 1 canonical expected record, the maximum possible Precision@3 for a 1-target query returning 3 context items is `33.3%` even when Top-1 is `100%` exact.",
    "- **Abstention & Hallucination Prevention:** Evaluates whether queries with missing prices, nonexistent devices/clinics, unavailable offers, or unsupported medical diagnosis requests cleanly abstain (`confidenceLevel: none`) or trigger missing-data warnings rather than fabricating answers.",
    "- **Deterministic vs. Live LLM:** This evaluation benchmarks the canonical retrieval pipeline and deterministic response builder (`mockProvider`). Live OpenAI/Gemini synthesis depends on external API configuration and introduces non-deterministic phrasing variations.",
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
    lines.push("## Failed Cases", "", "None — all 56 evaluation cases passed.", "");
  }

  lines.push(
    "## Case-by-Case Log",
    "",
    "| ID | Category | Query | Passed | Confidence | Top Match |",
    "| --- | --- | --- | --- | --- | --- |"
  );
  for (const c of summary.cases) {
    lines.push(
      `| ${c.id} | ${c.category} | ${c.query.replace(/\|/g, "\\|")} | ${c.passed ? "PASS" : "FAIL"} | ${c.confidence} | \`${c.topIds[0] || "none"}\` |`
    );
  }

  const reportPath = path.join(root, "reports", "knowledge-evaluation.md");
  fs.writeFileSync(reportPath, lines.join("\n") + "\n", "utf8");

  console.log(
    `Evaluation complete: pass=${pct(summary.overallPassRate)} (${summary.cases.filter((c) => c.passed).length}/${summary.totalQuestions}), ` +
      `Top1=${pct(summary.top1Accuracy)}, Recall@3=${pct(summary.recallAt3)}, Abstention=${pct(summary.hallucinationAbstentionRate)}`
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

