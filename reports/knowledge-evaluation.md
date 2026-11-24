# Terra AI Knowledge Evaluation Report

**Generated:** 2026-11-24T21:02:01.029Z
**Evaluation Set:** `evaluation/questions.json` (56 grounded questions)

## Summary Metrics

| Metric | Score | Scope |
| --- | --- | --- |
| Overall Evaluation Pass Rate | **100.0%** | All 56 cases |
| Top-1 Accuracy | **93.9%** | 49 retrieval cases |
| Recall@1 (Hit@1) | **93.9%** | 49 retrieval cases |
| Recall@3 (Hit@3) | **100.0%** | 49 retrieval cases |
| Recall@5 (Hit@5) | **100.0%** | 49 retrieval cases |
| Precision@3 | **44.2%** | 49 retrieval cases |
| Source Provenance Coverage | **100.0%** | File + sheet + row present |
| Ambiguity Clarification Rate | **100.0%** | 2 ambiguous cases |
| Missing-Data Disclosure Rate | **100.0%** | 2 partial-info cases |
| Hallucination Abstention Rate | **100.0%** | 5 negative/out-of-domain cases |

## Regression Delta vs. Previous Baseline
- Overall Pass Rate delta: +0.0%

## Metric Definitions & Limitations

- **Hit@K / Recall@K:** Measures whether at least one expected canonical record ID appears in the top *K* retrieved candidates. Note: multi-item queries where several valid records could answer the question are evaluated leniently by checking membership in `expectedRecordIds`.
- **Precision@3:** Fraction of the top-3 returned records belonging to `expectedRecordIds`. Because some single-product queries only have 1 canonical expected record, the maximum possible Precision@3 for a 1-target query returning 3 context items is `33.3%` even when Top-1 is `100%` exact.
- **Abstention & Hallucination Prevention:** Evaluates whether queries with missing prices, nonexistent devices/clinics, unavailable offers, or unsupported medical diagnosis requests cleanly abstain (`confidenceLevel: none`) or trigger missing-data warnings rather than fabricating answers.
- **Deterministic vs. Live LLM:** This evaluation benchmarks the canonical retrieval pipeline and deterministic response builder (`mockProvider`). Live OpenAI/Gemini synthesis depends on external API configuration and introduces non-deterministic phrasing variations.

## Failed Cases

None — all 56 evaluation cases passed.

## Case-by-Case Log

| ID | Category | Query | Passed | Confidence | Top Match |
| --- | --- | --- | --- | --- | --- |
| q01 | arabic | ما هو الفيلر المناسب تحت العين؟ | PASS | strong | `filler-redensity-2-فلر-تحت-العين-teosyal` |
| q02 | arabic | هل البوتوكس مسموح للحامل؟ | PASS | strong | `safety-pregnancy-البوتوكس` |
| q03 | arabic | سعر خيوط Aptos Cat Eye كام؟ | PASS | strong | `thread-aptos-cat-eye-threads` |
| q04 | arabic | سعر خيط PDO الواحد | PASS | strong | `thread-pdo-thread-1-thread` |
| q05 | arabic | ما هي أنواع فيلر الجسم المتوفرة؟ | PASS | strong | `body-filler-overview` |
| q06 | arabic | هل يمكن ممارسة العلاقة الجنسية بعد فيلر الجسم؟ | PASS | strong | `body-filler-overview` |
| q07 | arabic | إزالة المايكروبليدينغ موجودة في أي عيادة؟ | PASS | strong | `tattoo-permanent-makeup-microblading-policy` |
| q08 | arabic | هل الليزر يشتغل على الشعر الأبيض؟ | PASS | strong | `laser-hair-removal-overview` |
| q09 | arabic | كم مدة التوقف عن دواء الريكوتان قبل الليزر؟ | PASS | strong | `laser-hair-removal-overview` |
| q10 | arabic | هل الفينير ممكن يتعمل من غير حف؟ | PASS | strong | `dental-veneer-removal-policy` |
| q11 | arabic | هل يوجد عندكم تقويم أسنان أو زراعة أسنان؟ | PASS | strong | `dental-therapeutic-services-policy` |
| q12 | arabic | طريقة إزالة الفينير بالليزر متوفرة؟ | PASS | strong | `dental-veneer-removal-policy` |
| q13 | arabic | ما هي إبرة الفلتر أو الإبرة البنفسجية السحرية؟ | PASS | strong | `skin-booster-exofecta` |
| q14 | arabic | ما هي ابرة الخمس نقاط؟ | PASS | strong | `skin-booster-profhilo-ابرة-الخمس-نقاط-2-مل` |
| q15 | arabic | ما هي ابرة المشاهير للشد المائي؟ | PASS | strong | `skin-booster-virtue-aura` |
| q16 | arabic | هل يمكن عمل ديرمابن مع البوتوكس بنفس اليوم؟ | PASS | strong | `facial-dermapen` |
| q17 | arabic | ما هي الجلسة الوحيدة المناسبة للحبوب الملتهبة؟ | PASS | strong | `facial-factor-five` |
| q18 | arabic | حقنة Wegovy مسموحة من عمر كام؟ | PASS | partial | `slimming-wegovy` |
| q19 | arabic | هل ينفع عمل الفيلر أثناء الرضاعة؟ | PASS | strong | `safety-pregnancy-الفيلر` |
| q20 | arabic | إيه الفرق بين البوتوكس والفيلر؟ | PASS | strong | `comparison-botox-vs-fillers` |
| q21 | english | Juvederm Voluma | PASS | strong | `filler-juvederm-voluma` |
| q22 | english | Juvederm Volux uses and country | PASS | strong | `filler-juvederm-volux` |
| q23 | english | Radiesse calcium filler uses | PASS | strong | `filler-radiesse-1-5ml` |
| q24 | english | Candela GentleMax Pro Plus | PASS | strong | `device-candela-gentlemax-pro-plus-أحدث-إصدار` |
| q25 | english | Cynosure Elite Plus cooling system | PASS | strong | `device-cynosure-elite-plus-سايناشور-إيليت-بلس` |
| q26 | english | Dr. CYJ Hair Filler sessions | PASS | strong | `hair-dr-cyj-filler` |
| q27 | english | Restylane Skinboosters availability | PASS | strong | `skin-booster-restylane-skinboosters` |
| q28 | english | Sculptra 10 ml active ingredient | PASS | strong | `collagen-sculptra-10-ml` |
| q29 | english | Clear + Brilliant downtime and contraindications | PASS | strong | `machine-clear-brilliant-fractional-laser` |
| q30 | english | Vivace microneedling RF interval with filler | PASS | strong | `machine-vivace-microneedling-radiofrequency-فيفا` |
| q31 | english | Opatra London Skin Analyser | PASS | strong | `machine-opatra-london-skin-analyser` |
| q32 | english | Ultra Sound For Filler | PASS | strong | `machine-ultra-sound-for-filler-usa-2026-version` |
| q33 | english | Night Guard soft and hard | PASS | strong | `dental-night-guard` |
| q34 | english | Snap-On Smile removable cosmetic smile | PASS | strong | `dental-snap-on-smile` |
| q35 | english | VIP Lounge vs Diamond Feldspathic veneer | PASS | strong | `dental-veneers-overview` |
| q36 | english | Endolift clinic availability and doctors | PASS | strong | `device-endolift-french-dermacool-2025-doctors-on` |
| q37 | english | Z-Lipo and Z-Wave at Well Touch | PASS | strong | `device-z-wave-acoustic-wave-therapy-well-touch` |
| q38 | english | HIFU and Cool Shaping at One Touch | PASS | strong | `device-cool-shaping-one-touch` |
| q39 | mixed | مقارنة بين Dr. CYJ و PRP للشعر | PASS | strong | `comparison-hair-injections` |
| q40 | mixed | هل Hydrafacial آمن للحامل؟ | PASS | strong | `safety-pregnancy-hydrafacial` |
| q41 | mixed | سعر Aptos Lifting كام؟ | PASS | strong | `thread-aptos-lifting-threads` |
| q42 | typo | juviderm voluma | PASS | strong | `filler-juvederm-voluma` |
| q43 | typo | botoks dysport | PASS | strong | `botox-dysport-british-500-unit` |
| q44 | typo | dermaden microblading | PASS | strong | `tattoo-device-dermadent` |
| q45 | typo | sculptera collagen | PASS | strong | `collagen-sculptra-10-ml` |
| q46 | clinic | New Age clinic tattoo removal doctor | PASS | strong | `tattoo-device-new-age` |
| q47 | clinic | What devices does Dermadent have? | PASS | strong | `tattoo-device-dermadent` |
| q48 | ambiguous | Juvederm | PASS | ambiguous | `filler-juvederm-ultra-4` |
| q49 | ambiguous | Compare these two products. | PASS | ambiguous | `none` |
| q50 | abstention_missing_price | What is the price of Botox 100 unit? | PASS | partial | `botox-botox-100-unit` |
| q51 | abstention_missing_clinic | What is the phone number and street address of Well Touch clinic? | PASS | strong | `clinic-well-touch` |
| q52 | abstention_missing_offer | What is the Ramadan 50% discount package offer? | PASS | none | `none` |
| q53 | abstention_nonexistent_product | Tell me about Emsculpt Neo Max Pro machine | PASS | none | `none` |
| q54 | abstention_nonexistent_clinic | What laser devices are available at Cairo Star Clinic? | PASS | none | `none` |
| q55 | abstention_out_of_domain | What is the price of Ferrari sports cars? | PASS | none | `none` |
| q56 | abstention_unsupported_medical | Diagnose if a patient with severe rash can take Isotretinoin today | PASS | none | `none` |
