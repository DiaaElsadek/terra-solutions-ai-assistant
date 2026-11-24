/**
 * Server-only canonical knowledge store.
 * Reads `data/canonical/knowledge.canonical.json` and validates schema integrity.
 *
 * SECURITY: Must never be imported into client components or exposed via public/.
 */

import type {
  CanonicalKnowledgeDataset,
  KnowledgeRecord,
  CanonicalClinic,
  KnowledgeConflict,
} from "@/types/knowledge";
import { validateCanonicalDataset } from "./validator";
import canonicalData from "@/data/canonical/knowledge.canonical.json";

let cachedDataset: CanonicalKnowledgeDataset | null = null;

function assertServerContext(): void {
  if (typeof window !== "undefined") {
    throw new Error(
      "[Terra Security] Canonical knowledge store must only be accessed on the server."
    );
  }
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
  return cachedDataset;
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

