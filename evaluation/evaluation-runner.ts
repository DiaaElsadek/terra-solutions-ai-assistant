/**
 * Knowledge & Retrieval Evaluation Runner.
 * Measures Recall@1, Recall@3, Recall@5, Precision@3, Top-1 Accuracy,
 * Source Coverage, Ambiguity Handling, and Hallucination Abstention.
 */

import questions from "./questions.json";
import expectedResults from "./expected-results.json";
import { knowledgeRetriever } from "@/lib/knowledge/retriever";
import { mockProvider } from "@/lib/ai/mock-provider";
import { SYSTEM_PROMPT } from "@/constants/prompts";

export interface EvalCaseOutcome {
  id: string;
  category: string;
  query: string;
  passed: boolean;
  topIds: string[];
  expectedIds: string[];
  confidence: string;
  requiresClarification: boolean;
  hasMissingIndicator: boolean;
  recallAt1: number;
  recallAt3: number;
  recallAt5: number;
  precisionAt3: number;
  failureReason?: string;
}

export interface EvalSummary {
  totalQuestions: number;
  retrievalQuestions: number;
  abstentionQuestions: number;
  clarificationQuestions: number;
  missingIndicatorQuestions: number;
  top1Accuracy: number;
  recallAt1: number;
  recallAt3: number;
  recallAt5: number;
  precisionAt3: number;
  sourceCoverageRate: number;
  ambiguityPassRate: number;
  hallucinationAbstentionRate: number;
  missingDataDisclosureRate: number;
  overallPassRate: number;
  cases: EvalCaseOutcome[];
}

export async function runKnowledgeEvaluation(): Promise<EvalSummary> {
  const expectedMap = new Map(expectedResults.map((e) => [e.id, e]));
  const cases: EvalCaseOutcome[] = [];

  let retrievalTotal = 0;
  let top1Hits = 0;
  let r1Sum = 0;
  let r3Sum = 0;
  let r5Sum = 0;
  let p3Sum = 0;
  let sourceCoverageHits = 0;

  let abstentionTotal = 0;
  let abstentionPass = 0;

  let clarTotal = 0;
  let clarPass = 0;

  let missingTotal = 0;
  let missingPass = 0;

  for (const q of questions) {
    const exp = expectedMap.get(q.id);
    if (!exp) continue;

    const retrieval = knowledgeRetriever.retrieve(q.query, { limit: 5 });
    const aiResp = await mockProvider.generateResponse({
      userMessage: q.query,
      conversationHistory: [],
      systemPrompt: SYSTEM_PROMPT,
      contextPackage: "",
      retrieval,
    });

    const topIds = retrieval.results.map((r) => r.record.id);
    const expSet = new Set(exp.expectedRecordIds);
    const hasMissingIndicator =
      retrieval.missingIndicators.length > 0 || aiResp.warnings.length > 0;

    let passed = true;
    let failureReason: string | undefined;

    let recallAt1 = 0;
    let recallAt3 = 0;
    let recallAt5 = 0;
    let precisionAt3 = 0;

    if (exp.expectAbstention) {
      abstentionTotal++;
      // Expected honest abstention (none confidence or explicit unavailable answer)
      const abstained =
        aiResp.confidenceLevel === "none" ||
        /could not find|not found|unavailable|not listed|not included/i.test(
          aiResp.answer
        );
      if (abstained) {
        abstentionPass++;
      } else {
        passed = false;
        failureReason = `Expected abstention, got confidence=${aiResp.confidenceLevel} top=${topIds[0]}`;
      }
    } else if ((exp as { expectClarification?: boolean }).expectClarification) {
      clarTotal++;
      if (aiResp.requiresClarification) {
        clarPass++;
      } else {
        passed = false;
        failureReason = `Expected clarification request, got requiresClarification=false`;
      }
      if (exp.expectedRecordIds.length > 0) {
        const hit5 = topIds.filter((id) => expSet.has(id)).length;
        recallAt5 = hit5 / exp.expectedRecordIds.length;
      }
    } else {
      retrievalTotal++;
      const top1Hit = topIds[0] !== undefined && expSet.has(topIds[0]);
      if (top1Hit) top1Hits++;

      const hits1 = topIds.slice(0, 1).filter((id) => expSet.has(id)).length;
      const hits3 = topIds.slice(0, 3).filter((id) => expSet.has(id)).length;
      const hits5 = topIds.slice(0, 5).filter((id) => expSet.has(id)).length;

      recallAt1 = exp.expectedRecordIds.length > 0 ? (hits1 > 0 ? 1 : 0) : 0;
      recallAt3 = exp.expectedRecordIds.length > 0 ? (hits3 > 0 ? 1 : 0) : 0;
      recallAt5 = exp.expectedRecordIds.length > 0 ? (hits5 > 0 ? 1 : 0) : 0;
      precisionAt3 = hits3 / Math.min(3, Math.max(1, topIds.length));

      r1Sum += recallAt1;
      r3Sum += recallAt3;
      r5Sum += recallAt5;
      p3Sum += precisionAt3;

      const hasValidSources = aiResp.sources.every(
        (s) => Boolean(s.file && s.sheet && s.row !== undefined)
      );
      if (aiResp.sources.length > 0 && hasValidSources) {
        sourceCoverageHits++;
      }

      if (hits3 === 0) {
        passed = false;
        failureReason = `Expected one of [${exp.expectedRecordIds.join(", ")}] in top 3, got [${topIds.slice(0, 3).join(", ")}]`;
      }
    }

    if ((exp as { expectMissingIndicator?: boolean }).expectMissingIndicator) {
      missingTotal++;
      if (hasMissingIndicator) {
        missingPass++;
      } else {
        passed = false;
        failureReason = "Expected missing-data warning indicator";
      }
    }

    cases.push({
      id: q.id,
      category: q.category,
      query: q.query,
      passed,
      topIds,
      expectedIds: exp.expectedRecordIds,
      confidence: aiResp.confidenceLevel,
      requiresClarification: aiResp.requiresClarification,
      hasMissingIndicator,
      recallAt1,
      recallAt3,
      recallAt5,
      precisionAt3,
      failureReason,
    });
  }

  const passedCount = cases.filter((c) => c.passed).length;

  return {
    totalQuestions: cases.length,
    retrievalQuestions: retrievalTotal,
    abstentionQuestions: abstentionTotal,
    clarificationQuestions: clarTotal,
    missingIndicatorQuestions: missingTotal,
    top1Accuracy: retrievalTotal ? top1Hits / retrievalTotal : 0,
    recallAt1: retrievalTotal ? r1Sum / retrievalTotal : 0,
    recallAt3: retrievalTotal ? r3Sum / retrievalTotal : 0,
    recallAt5: retrievalTotal ? r5Sum / retrievalTotal : 0,
    precisionAt3: retrievalTotal ? p3Sum / retrievalTotal : 0,
    sourceCoverageRate: retrievalTotal ? sourceCoverageHits / retrievalTotal : 0,
    ambiguityPassRate: clarTotal ? clarPass / clarTotal : 0,
    hallucinationAbstentionRate: abstentionTotal ? abstentionPass / abstentionTotal : 0,
    missingDataDisclosureRate: missingTotal ? missingPass / missingTotal : 0,
    overallPassRate: cases.length ? passedCount / cases.length : 0,
    cases,
  };
}

