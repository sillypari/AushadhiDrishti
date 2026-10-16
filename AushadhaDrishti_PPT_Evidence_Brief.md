# AushadhaDrishti (BheshajaViveka): PPT Evidence & Research Brief

**Project concept:** Autonomous Clinical Safety & Multimodal Prescription Auditor  
**Proposed backbone:** Google Gemma 4 multimodal vision-language model  
**Research prepared:** 16 October 2026

> **How to use this brief:** The statistics below describe published studies or WHO estimates. They establish the importance of the problem; they do not prove that AushadhaDrishti has already reduced harm. Keep that distinction explicit in the presentation.

## 1. The core case for the project

Medication-related harm is a serious patient-safety problem, and some of it is preventable. Prescription information can be incomplete or hard to read, while safe interpretation often depends on patient-specific context: age, allergies, diagnoses, pregnancy/lactation, and other medicines. A multimodal assistant could help structure this information and surface discrepancies for human review.

**Presentation-ready positioning**

> AushadhaDrishti is a proposed second-check assistant that reads prescription and medicine-label images, structures medication details, compares them with a supplied patient profile, flags uncertainty and potential safety concerns, and explains those concerns in accessible language for pharmacist or clinician verification.

Use **“supports review,” “flags potential concerns,” and “proposed”** until the system has been clinically evaluated. Do not describe it as an autonomous prescriber or as a proven harm-prevention system.

## 2. Strong statistics for slides

### Global patient-safety burden

- WHO reports that **around 1 in 10 patients is harmed while receiving healthcare** and that **more than 3 million deaths occur annually due to unsafe care**. These figures concern unsafe healthcare broadly, not medication errors alone.  
  Source: [WHO Patient Safety fact sheet](https://www.who.int/news-room/fact-sheets/detail/patient-safety/)

- WHO reports that **medication-related harm affects 1 in 30 patients in healthcare**; **more than one quarter** of this harm is severe or life-threatening. This is the cleanest headline statistic directly about medication harm in the WHO fact sheet.  
  Source: [WHO Patient Safety fact sheet](https://www.who.int/news-room/fact-sheets/detail/patient-safety/)

- WHO says **more than 50% of patient harm is preventable**, and half of that preventable harm is related to medications. This is about preventable patient harm overall and its medication contribution; do not turn it into a count of medication-error deaths.  
  Source: [WHO Patient Safety fact sheet](https://www.who.int/news-room/fact-sheets/detail/patient-safety/)

- WHO estimates that medication errors cost **US$42 billion globally each year**. WHO’s 2017 launch described this as almost 1% of global health expenditure; other WHO materials report approximately 0.7%. Use the dollar estimate and year/source rather than presenting the ratio as a current audited figure.  
  Source: [WHO Medication Without Harm launch](https://www.who.int/news/item/29-03-2017-who-launches-global-effort-to-halve-medication-related-errors-in-5-years)

### India: prescription quality and medication errors

A 2024 multicentre cross-sectional study analyzed **4,838 outpatient prescriptions** from **13 ICMR Rational Use of Medicines Centres** across India:

- **1,870 / 4,838 (38.65%)** were incomplete according to the study protocol (missing one or more of formulation, dose, duration, or frequency).
- **475 / 4,838 (9.81%)** prescriptions were classified by clinician/pharmacologist review as having **unacceptable deviations** that could plausibly lead to consequences such as interaction, lack of response, increased cost, preventable adverse drug reaction, or antimicrobial resistance.
- Among those 475 unacceptable deviations, clinicians considered increased cost a potential consequence in **63%**, increased adverse drug reactions in **53%**, lack of response in **16%**, and antimicrobial resistance in **15%**. These are overlapping *potential consequences*, not observed rates of patients harmed.
- Study context matters: the prescriptions were collected in tertiary-care outpatient departments from August 2019 to August 2020; assessment used guidelines and expert review. The study does not estimate a current national error rate or count actual injuries.

Sources: [Full article (Indian Journal of Medical Research / PMC)](https://pmc.ncbi.nlm.nih.gov/articles/PMC11050754/) · [PubMed record](https://pubmed.ncbi.nlm.nih.gov/38528817/)

An Indian tertiary-care hospital study recorded **557 medication errors**:

- **208 (37.34%)** were prescription-related.
- Of those prescribing errors, **85 (40.87%) involved illegible writing**, **57 (27%) incomplete prescriptions**, **33 (15.8%) wrong dose**, **22 (10.57%) error-prone abbreviations**, and **11 (5.28%) wrong dosage form**.
- The study reported prescription-related errors as **5.47% prevalence** in its own hospital sample. This is a single-hospital result, not a national estimate.

Source: [Evaluation of Medication Errors in a Tertiary Care Hospital](https://pmc.ncbi.nlm.nih.gov/articles/PMC8328840/)

A rural Maharashtra hospital study assessed **499 prescriptions** from 2009–2010 and found **88 (17.6%)** had illegible handwriting. It is useful as a concrete example of the readability problem, but it is old and site-specific; do not present it as today’s India-wide prevalence.

Source: [Prescription writing practices in a rural tertiary care hospital in Western Maharashtra](https://pmc.ncbi.nlm.nih.gov/articles/PMC3562966/)

### Evidence synthesis: preventable medication harm

WHO published an updated systematic review and meta-analysis in 2024 on preventable medication-related harm, covering international literature including low- and middle-income countries. It is a strong anchor for the global burden and for discussing evidence gaps. For slide numbers, quote the report directly and state the setting/population used; avoid mixing its pooled estimates with WHO’s “1 in 30” fact-sheet headline as if they measured exactly the same outcome.

Source: [WHO, Global burden of preventable medication-related harm in health care: a systematic review (2024)](https://www.who.int/publications/i/item/9789240088887) · [Full WHO report PDF](https://iris.who.int/bitstream/handle/10665/376203/9789240088887-eng.pdf)

## 3. Why this problem is relevant to AushadhaDrishti

### The system must read more than the drug name

For each medication, the clinically meaningful record may include:

- Active ingredient or brand-to-ingredient mapping
- Strength and dosage form
- Dose and units (mg, mcg, IU, etc.)
- Frequency and as-needed instructions
- Route and duration
- Patient age and relevant diagnoses
- Documented allergies and reaction history
- Other current medications and possible interactions
- Pregnancy/lactation context when supplied
- Source location in the image and confidence/uncertainty

A wrong strength, unit, frequency, or route can change the meaning of an otherwise correctly recognized medicine. A good demo should show these fields separately rather than only displaying a list of guessed drug names.

### Patient-specific review matches WHO medication-safety priorities

WHO’s Medication Without Harm initiative prioritizes **high-risk situations, polypharmacy, and transitions of care**. A prescription/discharge-slip reader that checks a patient’s current medication list and flags discrepancies is aligned with those priorities as a design direction. That alignment does not itself prove clinical benefit.

Sources: [WHO Medication Without Harm initiative](https://www.who.int/initiatives/medication-without-harm/) · [WHO Global Patient Safety Challenge materials](https://iris.who.int/bitstream/handle/10665/255263/WHO-HIS-SDS-2017.6-eng.pdf)

### Gemma 4: technical fit, not clinical validation

Google describes Gemma 4 as an open model family with visual and audio understanding; its E2B/E4B variants are positioned for edge processing, while larger versions target personal-computer workloads. Those capabilities make Gemma 4 a plausible candidate for image-based document intake and accessible explanation. They do **not** establish prescription-reading accuracy, clinical reasoning reliability, or patient-safety performance.

Sources: [Google DeepMind Gemma 4 overview](https://deepmind.google/models/gemma/gemma-4/) · [Google AI for Developers Gemma documentation](https://ai.google.dev/gemma/docs)

## 4. Slide-ready wording

### Problem slide

> **Medication harm is not rare.** WHO reports medication-related harm affects 1 in 30 patients in healthcare, and more than one quarter of that harm is severe or life-threatening.

Citation: [WHO Patient Safety](https://www.who.int/news-room/fact-sheets/detail/patient-safety/)

### India evidence slide

> **A multicentre Indian study found 38.7% of analyzed outpatient prescriptions were incomplete; 9.8% had deviations judged unacceptable by expert review because of potential clinical or economic consequences.**

Cite the [ICMR-centre study](https://pmc.ncbi.nlm.nih.gov/articles/PMC11050754/). Add a small footnote: “4,838 prescriptions, 13 tertiary-care centres, 2019–2020; study classifications, not observed injury counts.”

### Handwriting slide

> **In one Indian hospital study, illegibility accounted for 40.9% of identified prescribing errors.**

Cite the [tertiary-care hospital study](https://pmc.ncbi.nlm.nih.gov/articles/PMC8328840/). Footnote: “Single-centre study; 85 illegible-writing errors among 208 prescribing errors.”

### Solution slide

> **AushadhaDrishti turns a prescription image into a structured, patient-contextualized safety review—with uncertainty surfaced for a human to verify.**

### Impact slide (future targets, not current results)

> **We will evaluate whether AushadhaDrishti can improve prescription-detail extraction and help reviewers find clinically important discrepancies—without increasing false alarms or encouraging unsafe guessing.**

## 5. How to present impact honestly

Separate the project’s **problem evidence**, **technical performance**, and **clinical impact**:

1. **Problem evidence:** rates from published studies (cite the population and setting).
2. **Technical performance:** results from your own benchmark, once measured.
3. **Clinical/workflow impact:** results from prospective or workflow evaluation, once measured.
4. **Health outcomes:** reductions in adverse events or injuries require robust clinical evidence; do not infer these from OCR accuracy or alert counts.

### Recommended evaluation measures

- **Medication field extraction:** ingredient, strength, dose, units, frequency, route, duration; report exact-match accuracy by field.
- **Safety-critical error rate:** measure errors involving drug identity, strength, dose, route, and frequency separately; these should be weighted by clinical severity.
- **Uncertainty calibration:** how often truly unreadable/ambiguous fields are marked uncertain and escalated instead of confidently guessed.
- **High-risk case sensitivity:** proportion of predefined critical/high-risk cases correctly surfaced, with confidence intervals.
- **False-alert burden:** false alerts per prescription and percentage judged actionable by pharmacists/clinicians.
- **Human review workflow:** time to review, clarification rate, and discrepancies found compared with usual workflow.
- **Patient communication:** comprehension of the plain-language explanation; test whether people understand what needs verification.
- **Subgroup performance:** handwriting quality, image conditions, language/script, age group, and medication category.

Use a pharmacist- and clinician-verified dataset with consent, privacy safeguards, and clear adjudication rules. Include degraded images and genuinely ambiguous handwriting; do not score the model only on clean or easy examples.

## 6. Clinical-safety and wording cautions

- **Do not claim that AushadhaDrishti has “solved” medication harm** or already prevented a number of injuries. The project description provided does not include outcome evaluation data.
- **Do not call every prescription error an injury.** An error may be intercepted or cause no harm; an adverse drug event may also occur without an error.
- **Do not present the often-repeated “5.2 million in India” figure as medication-error injuries.** The sources identified do not establish it as a robust national count of people harmed specifically by medication errors. Avoid it unless you trace it to a primary source with a clearly defined outcome.
- **Do not use a single-centre handwriting percentage as India’s national rate.** Identify the hospital, study design, and year.
- **Do not let a language model resolve an ambiguous drug name solely because one candidate’s dose seems more familiar.** Surface competing readings and request confirmation when the image cannot support a safe identification.
- **Treat “CRITICAL/HIGH/MODERATE/LOW” as a proposed triage design until clinician-reviewed definitions and validation exist.** Include severity, evidence source, uncertainty, and an action such as “verify promptly,” rather than presenting a model-generated severity label as a diagnosis.
- **Pregnancy risk:** FDA’s old letter categories A/B/C/D/X have been replaced by narrative labeling for prescription drugs. Prefer current drug-specific pregnancy/lactation information and pharmacist/clinician verification; do not use a blanket category-letter rule.
- **Age-based rules:** Beers Criteria are intended for older adults and are not a universal geriatric/pediatric rule set. Pediatric assessment needs age/weight-appropriate references and context.
- **Allergy cross-reactivity:** do not reduce this to a simple class-wide allergy rule. Record the culprit drug, reaction, severity, and clinical context; route alerts for professional review.
- **Interaction and contraindication checks require maintained, authoritative drug data.** A language model alone should not be treated as the source of truth for current prescribing guidance.

## 7. Useful presentation structure

1. **Title:** AushadhaDrishti — an AI second check for medication safety
2. **Human stakes:** WHO’s 1-in-30 medication-harm estimate; severe/life-threatening share
3. **India-specific evidence:** 13-centre prescription study; incomplete and unacceptable-deviation figures
4. **Failure points:** illegibility, missing dose/frequency/duration, wrong strength, patient-context mismatch
5. **Product workflow:** capture → extract fields → confirm uncertainty → patient-context review → plain-language explanation → pharmacist/clinician verification
6. **Safety design:** abstain on unclear handwriting, cite alert basis, preserve human review, avoid medication changes
7. **Evaluation plan:** field-level accuracy, high-risk sensitivity, false-alert rate, workflow impact
8. **Limitations and next step:** real-world validation before any claim of reduced patient harm

## 8. Source list (annotated)

1. **WHO. Patient safety fact sheet (11 September 2023).** Global context, preventable harm, medication-related harm.  
   [https://www.who.int/news-room/fact-sheets/detail/patient-safety/](https://www.who.int/news-room/fact-sheets/detail/patient-safety/)

2. **WHO. Global burden of preventable medication-related harm in health care: a systematic review (2024).** Updated systematic review/meta-analysis; includes LMIC literature.  
   [Publication page](https://www.who.int/publications/i/item/9789240088887) · [PDF](https://iris.who.int/bitstream/handle/10665/376203/9789240088887-eng.pdf)

3. **WHO. Launch of Medication Without Harm (2017).** Medication-error cost estimate and global challenge rationale.  
   [https://www.who.int/news/item/29-03-2017-who-launches-global-effort-to-halve-medication-related-errors-in-5-years](https://www.who.int/news/item/29-03-2017-who-launches-global-effort-to-halve-medication-related-errors-in-5-years)

4. **Shetty et al. Evaluation of prescriptions from tertiary care hospitals across India for deviations from treatment guidelines & their potential consequences. Indian Journal of Medical Research (2024).** Multicentre study of 4,838 prescriptions at 13 ICMR centres.  
   [Full article](https://pmc.ncbi.nlm.nih.gov/articles/PMC11050754/) · [PubMed](https://pubmed.ncbi.nlm.nih.gov/38528817/) · DOI: 10.4103/ijmr.ijmr_2309_22

5. **Evaluation of Medication Errors in a Tertiary Care Hospital of a Low- to Middle-Income Country.** Single-centre medication-error distribution and prescribing-error subtypes, including illegibility.  
   [Full article](https://pmc.ncbi.nlm.nih.gov/articles/PMC8328840/)

6. **Pote et al. Prescription writing practices in a rural tertiary care hospital in Western Maharashtra, India.** Older single-centre study (2009–2010), 499 prescriptions.  
   [Full article](https://pmc.ncbi.nlm.nih.gov/articles/PMC3562966/)

7. **WHO. Medication Without Harm: Global Patient Safety Challenge.** Framework and priority areas including high-risk situations, polypharmacy, and transitions of care.  
   [Initiative page](https://www.who.int/initiatives/medication-without-harm/) · [Challenge document](https://iris.who.int/bitstream/handle/10665/255263/WHO-HIS-SDS-2017.6-eng.pdf)

8. **Google DeepMind. Gemma 4.** Official description of model family and multimodal capabilities.  
   [https://deepmind.google/models/gemma/gemma-4/](https://deepmind.google/models/gemma/gemma-4/)

9. **Google AI for Developers. Gemma documentation.** Model documentation and implementation details.  
   [https://ai.google.dev/gemma/docs](https://ai.google.dev/gemma/docs)

---

**Suggested one-line close for the PPT:**  
*“AushadhaDrishti does not replace clinical judgment; it aims to make important prescription details and potential risks easier to see, verify, and explain.”*

