# Retrieval & Grounding Evaluation Framework

## Structure (`evaluation/`)

- `evaluation/questions.json` — **56** grounded call-center test queries spanning Formal & Egyptian Arabic (`20`), English (`18`), mixed bilingual (`3`), misspellings/transliterations (`4`), clinic lookups (`2`), underspecified ambiguity (`2`), and negative/missing-data/medical-diagnosis abstention checks (`7`).
- `evaluation/expected-results.json` — Expected canonical record IDs, categories, minimum confidence tiers, clarification requirements, missing-data expectations, and abstention flags.
- `evaluation/evaluation-runner.ts` — Runs each query through `knowledgeRetriever.retrieve()` and `mockProvider.generateResponse()`, computing IR and safety metrics.
- `evaluation/evaluation-report.ts` — Saves `evaluation/baseline.json` and generates `reports/knowledge-evaluation.md`.

---

## Latest Measured Results (`npm run eval`)

| Metric | Measured Score | Scope |
| --- | --- | --- |
| Overall Evaluation Pass Rate | **100.0%** | All `56/56` cases |
| Top-1 Accuracy | **93.9%** | `49` retrieval cases |
| Recall@1 (Hit@1) | **93.9%** | `49` retrieval cases |
| Recall@3 (Hit@3) | **100.0%** | `49` retrieval cases |
| Recall@5 (Hit@5) | **100.0%** | `49` retrieval cases |
| Precision@3 | **44.2%** | `49` retrieval cases |
| Source Provenance Coverage | **100.0%** | File + sheet + exact row(s) present |
| Ambiguity Clarification Rate | **100.0%** | `2` ambiguous cases |
| Missing-Data Disclosure Rate | **100.0%** | `2` partial-info cases |
| Hallucination Abstention Rate | **100.0%** | `5` negative/out-of-domain cases |

---

## Methodology Notes & Limitations

- **Precision@3 Ceiling:** For single-product queries with `1` expected canonical record while returning up to `3` context candidates, the maximum achievable Precision@3 is `33.3%` even at `100%` Top-1 accuracy, explaining why Precision@3 averages `44.2%` while Top-1 reaches `93.9%`.
- **Deterministic Retrieval Benchmark vs. Live LLMs:** `npm run eval` benchmarks deterministic canonical retrieval (`knowledgeRetriever`) and `mockProvider` without calling paid external APIs on every CI run. When OpenAI or Google Gemini are enabled in production, exact phrasing is non-deterministic, though the server-side retrieved sources (`pkg.sources`) and `validateAndNormalizeStructuredOutput()` still constrain the response.
- **Automated Unit & Integration Suite:** Run `npm test` (`tests/knowledge.test.ts`, `tests/ai-and-security.test.ts`, `tests/storage-and-auth.test.ts`) to execute all `23` automated tests covering dataset integrity, bilingual retrieval, PII redaction, API limits/rate-limiting, mocked OpenAI/Gemini HTTP calls, NDJSON streaming, `/api/knowledge`, and local storage/demo auth.

