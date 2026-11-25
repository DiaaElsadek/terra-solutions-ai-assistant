# Terra Solutions AI Evaluation Framework & Benchmark Results

## 1. Benchmark Architecture (`evaluation/`)

- **`evaluation/questions.json`**: `118` grounded evaluation cases spanning MSA Arabic, Egyptian colloquial phrasing, phonetic Arabic transliterations, English variations, mixed Arabizi/Arabic/English queries, typos, broad category discovery, multi-turn follow-up chains (`conversationHistory`), ambiguity clarification, missing-price disclosure, unsupported compounds (`بوتوكس الشعر`), and medical prescription/out-of-domain abstention.
- **`evaluation/expected-results.json`**: Canonical `expectedRecordIds`, `expectedIntents`, dual-entity comparison assertions (`requiredAllIds`), `expectClarification`, `expectMissingIndicator`, and `expectAbstention` expectations verified against `data/canonical/knowledge.canonical.json`.
- **`evaluation/evaluation-runner.ts`**: Runs `resolveContextualQuery` (when `conversationHistory` is provided), executes `knowledgeRetriever.retrieve(effectiveQuery, { limit: 6 })`, and runs `mockProvider` (`localFallbackProvider`) to evaluate end-to-end deterministic grounding and source attribution.
- **`evaluation/evaluation-report.ts`**: Emits machine-readable JSON (`evaluation/report.json`, `evaluation/baseline.json`) and Markdown reports (`evaluation/report.md`, `reports/knowledge-evaluation.md`).

Run command:

```bash
npm run eval
```

---

## 2. Latest Verified Evaluation Results (`evaluation/report.md`)

| Metric | Score | Scope |
| --- | --- | --- |
| Overall Evaluation Pass Rate | **100.0%** (`118/118`) | All evaluation cases |
| Top-1 Accuracy | **95.2%** | `104` retrieval cases |
| Recall@1 (Hit@1) | **95.2%** | `104` retrieval cases |
| Recall@3 (Hit@3) | **100.0%** | `104` retrieval cases |
| Recall@5 (Hit@5) | **100.0%** | `104` retrieval cases |
| Precision@3 | **43.8%** | `104` retrieval cases |
| Entity / Synonym Resolution Accuracy | **100.0%** | `28` transliteration/mixed/English cases |
| Typo Correction Accuracy | **100.0%** | `11` typo cases |
| Follow-Up Context Resolution Rate | **100.0%** | `8` multi-turn follow-up cases |
| Intent Classification Accuracy | **100.0%** | `13` intent-annotated cases |
| Source Provenance Coverage | **100.0%** | File + sheet + row present |
| Ambiguity Clarification Rate | **100.0%** | `3` ambiguous cases |
| Missing-Data Disclosure Rate | **100.0%** | `7` partial-info cases |
| Abstention Accuracy | **100.0%** | `11` unsupported/out-of-domain cases |
| Unsupported-Answer Rate | **0.0%** | `11` negative/unsupported cases |
| False-Positive Retrieval Rate | **0.0%** | `11` negative/unsupported cases |

---

## 3. Category Coverage Summary

- **Arabic Transliterations (`q57`–`q70`):** Covers `الفيشيال`, `فيشيال`, `فيشيل`, `فيشيول`, `فشيال`, `الفيشل`, `ديرمابن`, `سكين بوستر`, `البروفايلو`, `البوتكس`, `الفيلرز`, `اللازر`, `بادي كونتورنج`, and `الفينيرز`.
- **Mixed Arabic/English (`q76`–`q84`):** Covers `ايه هو Facial؟`, `تفاصيل الـ Facial.`, `الفيشال عبارة عن ايه؟`, `Body Contouring`, `Skin Booster`, `Laser Hair Removal`, colloquial laser device comparison (`Candela ولا Cynosure احسن لازالة الشعر؟`), and pregnancy safety (`الفيشيال مسموح للحامل؟`).
- **Typos & Short-Word Traps (`q42`–`q45`, `q85`–`q92`):** Verifies `facail`, `faciel`, `fillar`, `botx`, `lazer`, `tatoo`, `بروفايلوا`, `juviderm`, `botoks`, `dermaden`, `sculptera`, plus short-token collision trap `ايه سعر cart؟` abstaining at `confidence: "none"`.
- **Multi-Turn Context & Topic-Shift Chains (`q105`–`q112`):** Evaluates `ايه هو الفيشيال؟` → `طب سعره كام؟` → `وفيه أنواع تانية؟` → topic switch `طب ايه هو السكين بوستر؟`, plus Botox pregnancy follow-up, Dermadent clinic tattoo follow-up, comparison pronoun follow-up (`طب ايه الفرق بينهم؟`), and hair filler pricing follow-up.
- **Unsupported Compound & Guard Abstention (`q52`–`q56`, `q114`–`q118`):** Verifies `بوتوكس الشعر` / `Hair Botox`, nonexistent clinics/devices (`التجمع الخامس`, `Cairo Star Clinic`), Ramadan discount traps, Ferrari sports car out-of-domain trap, and pharmacy prescription asks (`روشتة علاج`) all abstain safely.

