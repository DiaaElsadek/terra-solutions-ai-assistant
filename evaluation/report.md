# Terra Solutions AI Knowledge Evaluation Report

**Generated:** 2026-11-25T21:17:44.801Z
**Evaluation Set:** `evaluation/questions.json` (118 bilingual, typo, comparison, follow-up, and abstention cases)

## Summary Metrics

| Metric | Score | Scope |
| --- | --- | --- |
| Overall Evaluation Pass Rate | **100.0%** | All 118 cases |
| Top-1 Accuracy | **95.2%** | 104 retrieval cases |
| Recall@1 (Hit@1) | **95.2%** | 104 retrieval cases |
| Recall@3 (Hit@3) | **100.0%** | 104 retrieval cases |
| Recall@5 (Hit@5) | **100.0%** | 104 retrieval cases |
| Precision@3 | **43.8%** | 104 retrieval cases |
| Entity / Synonym Resolution Accuracy | **100.0%** | 28 transliteration/mixed/English cases |
| Typo Correction Accuracy | **100.0%** | 11 typo cases |
| Follow-Up Context Resolution Rate | **100.0%** | 8 multi-turn follow-up cases |
| Intent Classification Accuracy | **100.0%** | 13 intent-annotated cases |
| Source Provenance Coverage | **100.0%** | File + sheet + row present |
| Ambiguity Clarification Rate | **100.0%** | 3 ambiguous cases |
| Missing-Data Disclosure Rate | **100.0%** | 7 partial-info cases |
| Abstention Accuracy | **100.0%** | 11 unsupported/out-of-domain cases |
| Unsupported-Answer Rate | **0.0%** | 11 negative/unsupported cases |
| False-Positive Retrieval Rate | **0.0%** | 11 negative/unsupported cases |

## Regression Delta vs. Previous Baseline
- Overall Pass Rate delta: +0.0%

## Metric Definitions & Limitations

- **Hit@K / Recall@K:** Measures whether at least one expected canonical record ID appears in the top *K* retrieved candidates. Multi-turn follow-up cases resolve context first via `resolveContextualQuery`.
- **Precision@3:** Fraction of the top-3 returned records belonging to `expectedRecordIds`. Single-target queries returning 3 context items peak at `33.3%` even at `100%` Top-1 accuracy.
- **Abstention & Unsupported-Answer Rate:** Evaluates whether unsupported compounds (e.g., `بوتوكس الشعر`), short-word typo traps, nonexistent clinics/devices, unavailable offers, and diagnosis requests cleanly abstain (`confidenceLevel: none`).
- **Deterministic vs. Live LLM:** Benchmarks the canonical hybrid retrieval + deterministic grounded fallback layer (`local_fallback`). Live Gemini phrasing introduces natural language generation over these verified context packets.

## Failed Cases

None — all 118 evaluation cases passed.

## Case-by-Case Log

| ID | Category | Query | Passed | Intent | Confidence | Top Match |
| --- | --- | --- | --- | --- | --- | --- |
| q01 | arabic | ما هو الفيلر المناسب تحت العين؟ | PASS | `product_service_lookup` | strong | `filler-redensity-2-فلر-تحت-العين-teosyal` |
| q02 | arabic | هل البوتوكس مسموح للحامل؟ | PASS | `safety_pregnancy` | strong | `safety-pregnancy-البوتوكس` |
| q03 | arabic | سعر خيوط Aptos Cat Eye كام؟ | PASS | `price_offer_lookup` | strong | `thread-aptos-cat-eye-threads` |
| q04 | arabic | سعر خيط PDO الواحد | PASS | `price_offer_lookup` | strong | `thread-pdo-thread-1-thread` |
| q05 | arabic | ما هي أنواع فيلر الجسم المتوفرة؟ | PASS | `product_service_lookup` | strong | `body-filler-overview` |
| q06 | arabic | هل يمكن ممارسة العلاقة الجنسية بعد فيلر الجسم؟ | PASS | `product_service_lookup` | strong | `body-filler-overview` |
| q07 | arabic | إزالة المايكروبليدينغ موجودة في أي عيادة؟ | PASS | `clinic_lookup` | strong | `tattoo-permanent-makeup-microblading-policy` |
| q08 | arabic | هل الليزر يشتغل على الشعر الأبيض؟ | PASS | `product_service_lookup` | strong | `laser-hair-removal-overview` |
| q09 | arabic | كم مدة التوقف عن دواء الريكوتان قبل الليزر؟ | PASS | `product_service_lookup` | strong | `laser-hair-removal-overview` |
| q10 | arabic | هل الفينير ممكن يتعمل من غير حف؟ | PASS | `product_service_lookup` | strong | `dental-veneers-overview` |
| q11 | arabic | هل يوجد عندكم تقويم أسنان أو زراعة أسنان؟ | PASS | `product_service_lookup` | strong | `dental-therapeutic-services-policy` |
| q12 | arabic | طريقة إزالة الفينير بالليزر متوفرة؟ | PASS | `product_service_lookup` | strong | `dental-veneer-removal-policy` |
| q13 | arabic | ما هي إبرة الفلتر أو الإبرة البنفسجية السحرية؟ | PASS | `product_service_lookup` | strong | `skin-booster-exofecta` |
| q14 | arabic | ما هي ابرة الخمس نقاط؟ | PASS | `product_service_lookup` | strong | `skin-booster-profhilo-ابرة-الخمس-نقاط-2-مل` |
| q15 | arabic | ما هي ابرة المشاهير للشد المائي؟ | PASS | `product_service_lookup` | strong | `skin-booster-virtue-aura` |
| q16 | arabic | هل يمكن عمل ديرمابن مع البوتوكس بنفس اليوم؟ | PASS | `product_service_lookup` | strong | `facial-dermapen` |
| q17 | arabic | ما هي الجلسة الوحيدة المناسبة للحبوب الملتهبة؟ | PASS | `product_service_lookup` | strong | `facial-factor-five` |
| q18 | arabic | حقنة Wegovy مسموحة من عمر كام؟ | PASS | `price_offer_lookup` | partial | `slimming-wegovy` |
| q19 | arabic | هل ينفع عمل الفيلر أثناء الرضاعة؟ | PASS | `safety_pregnancy` | strong | `safety-pregnancy-الفيلر` |
| q20 | arabic | إيه الفرق بين البوتوكس والفيلر؟ | PASS | `comparison` | strong | `comparison-botox-vs-fillers` |
| q21 | english | Juvederm Voluma | PASS | `product_service_lookup` | strong | `filler-juvederm-voluma` |
| q22 | english | Juvederm Volux uses and country | PASS | `product_service_lookup` | strong | `filler-juvederm-volux` |
| q23 | english | Radiesse calcium filler uses | PASS | `product_service_lookup` | strong | `filler-radiesse-1-5ml` |
| q24 | english | Candela GentleMax Pro Plus | PASS | `product_service_lookup` | strong | `device-candela-gentlemax-pro-plus-أحدث-إصدار` |
| q25 | english | Cynosure Elite Plus cooling system | PASS | `product_service_lookup` | strong | `device-cynosure-elite-plus-سايناشور-إيليت-بلس` |
| q26 | english | Dr. CYJ Hair Filler sessions | PASS | `product_service_lookup` | strong | `hair-dr-cyj-filler` |
| q27 | english | Restylane Skinboosters availability | PASS | `product_service_lookup` | strong | `skin-booster-restylane-skinboosters` |
| q28 | english | Sculptra 10 ml active ingredient | PASS | `product_service_lookup` | strong | `collagen-sculptra-10-ml` |
| q29 | english | Clear + Brilliant downtime and contraindications | PASS | `safety_pregnancy` | strong | `machine-clear-brilliant-fractional-laser` |
| q30 | english | Vivace microneedling RF interval with filler | PASS | `product_service_lookup` | strong | `machine-vivace-microneedling-radiofrequency-فيفا` |
| q31 | english | Opatra London Skin Analyser | PASS | `product_service_lookup` | strong | `machine-opatra-london-skin-analyser` |
| q32 | english | Ultra Sound For Filler | PASS | `product_service_lookup` | strong | `machine-ultra-sound-for-filler-usa-2026-version` |
| q33 | english | Night Guard soft and hard | PASS | `product_service_lookup` | strong | `dental-night-guard` |
| q34 | english | Snap-On Smile removable cosmetic smile | PASS | `product_service_lookup` | strong | `dental-snap-on-smile` |
| q35 | english | VIP Lounge vs Diamond Feldspathic veneer | PASS | `comparison` | strong | `dental-vip-lounge-smile-custom-100` |
| q36 | english | Endolift clinic availability and doctors | PASS | `clinic_lookup` | strong | `device-endolift-french-dermacool-2025-doctors-on` |
| q37 | english | Z-Lipo and Z-Wave at Well Touch | PASS | `clinic_lookup` | strong | `device-z-wave-acoustic-wave-therapy-well-touch` |
| q38 | english | HIFU and Cool Shaping at One Touch | PASS | `clinic_lookup` | strong | `device-cool-shaping-one-touch` |
| q39 | mixed | مقارنة بين Dr. CYJ و PRP للشعر | PASS | `comparison` | strong | `comparison-hair-injections` |
| q40 | mixed | هل Hydrafacial آمن للحامل؟ | PASS | `safety_pregnancy` | strong | `safety-pregnancy-hydrafacial` |
| q41 | mixed | سعر Aptos Lifting كام؟ | PASS | `price_offer_lookup` | strong | `thread-aptos-lifting-threads` |
| q42 | typo | juviderm voluma | PASS | `product_service_lookup` | strong | `filler-juvederm-voluma` |
| q43 | typo | botoks dysport | PASS | `product_service_lookup` | strong | `botox-overview` |
| q44 | typo | dermaden microblading | PASS | `clinic_lookup` | strong | `tattoo-permanent-makeup-microblading-policy` |
| q45 | typo | sculptera collagen | PASS | `product_service_lookup` | strong | `collagen-sculptra-10-ml` |
| q46 | clinic | New Age clinic tattoo removal doctor | PASS | `clinic_lookup` | strong | `tattoo-device-new-age` |
| q47 | clinic | What devices does Dermadent have? | PASS | `device_specs` | strong | `clinic-dermadent` |
| q48 | ambiguous | Juvederm | PASS | `product_service_lookup` | ambiguous | `filler-juvederm-ultra-4` |
| q49 | ambiguous | Compare these two products. | PASS | `comparison` | ambiguous | `none` |
| q50 | abstention_missing_price | What is the price of Botox 100 unit? | PASS | `price_offer_lookup` | partial | `botox-botox-100-unit` |
| q51 | abstention_missing_clinic | What is the phone number and street address of Well Touch clinic? | PASS | `clinic_lookup` | strong | `clinic-well-touch` |
| q52 | abstention_missing_offer | What is the Ramadan 50% discount package offer? | PASS | `price_offer_lookup` | none | `none` |
| q53 | abstention_nonexistent_product | Tell me about Emsculpt Neo Max Pro machine | PASS | `device_specs` | none | `none` |
| q54 | abstention_nonexistent_clinic | What laser devices are available at Cairo Star Clinic? | PASS | `device_specs` | none | `none` |
| q55 | abstention_out_of_domain | What is the price of Ferrari sports cars? | PASS | `price_offer_lookup` | none | `none` |
| q56 | abstention_unsupported_medical | Diagnose if a patient with severe rash can take Isotretinoin today | PASS | `medical_diagnosis` | none | `none` |
| q57 | transliteration_ar | ايه هو الفيشيال؟ | PASS | `product_service_lookup` | strong | `facial-hydrafacial` |
| q58 | transliteration_ar | يعني ايه فيشيال؟ | PASS | `product_service_lookup` | strong | `facial-hydrafacial` |
| q59 | transliteration_ar | تفاصيل فيشيل | PASS | `product_service_lookup` | strong | `facial-hydrafacial` |
| q60 | transliteration_ar | عايز اعرف الفيشيول | PASS | `product_service_lookup` | strong | `facial-hydrafacial` |
| q61 | transliteration_ar | فشيال بيتعمل ازاي؟ | PASS | `product_service_lookup` | strong | `facial-hydrafacial` |
| q62 | transliteration_ar | الفيشل | PASS | `product_service_lookup` | strong | `facial-hydrafacial` |
| q63 | transliteration_ar | يعني ايه ديرمابن؟ | PASS | `product_service_lookup` | strong | `facial-dermapen` |
| q64 | transliteration_ar | ايه هو سكين بوستر؟ | PASS | `product_service_lookup` | strong | `skin-booster-overview` |
| q65 | transliteration_ar | ايه هو البروفايلو؟ | PASS | `product_service_lookup` | strong | `skin-booster-profhilo-ابرة-الخمس-نقاط-2-مل` |
| q66 | transliteration_ar | ايه هو البوتكس؟ | PASS | `product_service_lookup` | strong | `botox-overview` |
| q67 | transliteration_ar | ايه هي حقن الفيلرز؟ | PASS | `product_service_lookup` | strong | `fillers-overview` |
| q68 | transliteration_ar | معلومات عن اللازر لازالة الشعر | PASS | `product_service_lookup` | strong | `laser-hair-removal-overview` |
| q69 | transliteration_ar | ممكن تفاصيل عن بادي كونتورنج؟ | PASS | `product_service_lookup` | strong | `device-deka-slimming` |
| q70 | transliteration_ar | عايزة تفاصيل الفينيرز | PASS | `product_service_lookup` | strong | `dental-veneers-overview` |
| q71 | english_variant | What is Facial? | PASS | `product_service_lookup` | strong | `facial-hydrafacial` |
| q72 | english_variant | Facial Treatment details | PASS | `product_service_lookup` | strong | `facial-hydrafacial` |
| q73 | english_variant | Face Treatment session overview | PASS | `product_service_lookup` | strong | `facial-hydrafacial` |
| q74 | english_variant | Facial Cleansing protocol | PASS | `product_service_lookup` | strong | `facial-hydrafacial` |
| q75 | english_variant | Skin Booster injections | PASS | `product_service_lookup` | strong | `skin-booster-overview` |
| q76 | mixed_ar_en | ايه هو Facial؟ | PASS | `product_service_lookup` | strong | `facial-hydrafacial` |
| q77 | mixed_ar_en | تفاصيل الـ Facial. | PASS | `product_service_lookup` | strong | `facial-hydrafacial` |
| q78 | mixed_ar_en | الفيشال عبارة عن ايه؟ | PASS | `product_service_lookup` | strong | `facial-hydrafacial` |
| q79 | mixed_ar_en | عايزة اعرف Facial. | PASS | `product_service_lookup` | strong | `facial-hydrafacial` |
| q80 | mixed_ar_en | ممكن تفاصيل عن Body Contouring؟ | PASS | `product_service_lookup` | strong | `device-roblex-body-face-contouring` |
| q81 | mixed_ar_en | عايزة Skin Booster للوش | PASS | `product_service_lookup` | strong | `skin-booster-overview` |
| q82 | mixed_ar_en | ايه عروض Laser Hair Removal؟ | PASS | `price_offer_lookup` | strong | `laser-hair-removal-overview` |
| q83 | mixed_ar_en | Candela ولا Cynosure احسن لازالة الشعر؟ | PASS | `comparison` | strong | `device-candela-gentlemax-pro-أحدث-إصدار` |
| q84 | mixed_ar_en | الفيشيال مسموح للحامل؟ | PASS | `safety_pregnancy` | strong | `safety-pregnancy-hydrafacial` |
| q85 | typo_variants | What is facail? | PASS | `product_service_lookup` | strong | `facial-hydrafacial` |
| q86 | typo_variants | faciel treatment | PASS | `product_service_lookup` | strong | `facial-hydrafacial` |
| q87 | typo_variants | fillar for lips | PASS | `product_service_lookup` | ambiguous | `filler-neauvia-intense-lips` |
| q88 | typo_variants | botx injection | PASS | `product_service_lookup` | strong | `botox-overview` |
| q89 | typo_variants | lazer hair removal | PASS | `product_service_lookup` | strong | `laser-hair-removal-overview` |
| q90 | typo_variants | tatoo removal price | PASS | `price_offer_lookup` | strong | `tattoo-removal-protocol` |
| q91 | typo_variants | تفاصيل بروفايلوا | PASS | `product_service_lookup` | strong | `skin-booster-profhilo-ابرة-الخمس-نقاط-2-مل` |
| q92 | typo_variants | ايه سعر cart؟ | PASS | `price_offer_lookup` | none | `none` |
| q93 | broad_category | ايه خدمات البشرة عندكم؟ | PASS | `product_service_lookup` | strong | `facial-hydrafacial` |
| q94 | broad_category | عندكم ايه للوجه؟ | PASS | `product_service_lookup` | strong | `facial-hydrafacial` |
| q95 | broad_category | ايه خدمات الليزر؟ | PASS | `product_service_lookup` | strong | `laser-hair-removal-overview` |
| q96 | broad_category | ايه أجهزة العيادات؟ | PASS | `clinic_lookup` | strong | `device-candela-gentlemax-pro-أحدث-إصدار` |
| q97 | broad_category | ايه خدمات التخسيس عندكم؟ | PASS | `product_service_lookup` | strong | `slimming-wegovy` |
| q98 | missing_price | الفيشيال بكام؟ | PASS | `price_offer_lookup` | partial | `facial-hydrafacial` |
| q99 | missing_price | Facial بكام؟ | PASS | `price_offer_lookup` | partial | `facial-hydrafacial` |
| q100 | missing_price | سعر البوتوكس كام؟ | PASS | `price_offer_lookup` | partial | `botox-overview` |
| q101 | comparison | ايه الفرق بين Facial و Skin Booster؟ | PASS | `comparison` | strong | `facial-hydrafacial` |
| q102 | comparison | Compare Botox vs Filler | PASS | `comparison` | strong | `comparison-botox-vs-fillers` |
| q103 | comparison | ايه الفرق بين Sculptra و Filler؟ | PASS | `comparison` | strong | `comparison-collagen-vs-filler` |
| q104 | comparison | الفرق بين الفيلر والبوتكس ايه؟ | PASS | `comparison` | strong | `comparison-botox-vs-fillers` |
| q105 | followup_context | ايه هو الفيشيال؟ | PASS | `product_service_lookup` | strong | `facial-hydrafacial` |
| q106 | followup_context | طب سعره كام؟ | PASS | `price_offer_lookup` | partial | `facial-hydrafacial` |
| q107 | followup_context | وفيه أنواع تانية؟ | PASS | `product_service_lookup` | strong | `facial-hydrafacial` |
| q108 | followup_context | طب ايه هو السكين بوستر؟ | PASS | `product_service_lookup` | strong | `skin-booster-overview` |
| q109 | followup_context | طب مسموح للحامل؟ | PASS | `safety_pregnancy` | strong | `safety-pregnancy-البوتوكس` |
| q110 | followup_context | موجودة فيها أجهزة تاتو؟ | PASS | `device_specs` | strong | `tattoo-device-dermadent` |
| q111 | followup_context | طب ايه الفرق بينهم؟ | PASS | `comparison` | strong | `comparison-botox-vs-fillers` |
| q112 | followup_context | وكام سعر الجلسة؟ | PASS | `price_offer_lookup` | partial | `hair-dr-cyj-filler` |
| q113 | ambiguous | عايز اعرف الجلسة. | PASS | `product_service_lookup` | ambiguous | `none` |
| q114 | abstention_unsupported_compound | هل عندكم بوتوكس الشعر؟ | PASS | `product_service_lookup` | none | `none` |
| q115 | abstention_unsupported_compound | Hair Botox price? | PASS | `price_offer_lookup` | none | `none` |
| q116 | abstention_unsupported_compound | ايه أسعار حقن بوتوكس للشعر؟ | PASS | `price_offer_lookup` | none | `none` |
| q117 | abstention_nonexistent_clinic | في عيادة التجمع الخامس عندكم؟ | PASS | `clinic_lookup` | none | `none` |
| q118 | abstention_unsupported_medical | اكتبلي روشتة علاج لحب الشباب من الصيدلية | PASS | `medical_diagnosis` | none | `none` |
