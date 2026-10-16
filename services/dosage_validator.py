"""Dosage Safety and Range Validation Service for AushadhiDrishti.

Validates extracted prescription dosages, frequencies, and administration
routes against established clinical safety guidelines to flag accidental
overdoses or sub-therapeutic prescriptions.
"""

from typing import Dict, Any, List, Optional
import re

# Standard adult daily therapeutic limits (in mg unless specified)
CLINICAL_MAX_DAILY_LIMITS: Dict[str, Dict[str, Any]] = {
    "paracetamol": {
        "max_single_dose_mg": 1000.0,
        "max_daily_dose_mg": 4000.0,
        "warning_threshold_mg": 3000.0,
        "unit": "mg",
        "notes": "Hepatotoxicity risk exceeds 4000mg/day in adults."
    },
    "ibuprofen": {
        "max_single_dose_mg": 800.0,
        "max_daily_dose_mg": 2400.0,
        "warning_threshold_mg": 1600.0,
        "unit": "mg",
        "notes": "GI bleed risk elevated above 1200mg/day without PPI cover."
    },
    "metformin": {
        "max_single_dose_mg": 1000.0,
        "max_daily_dose_mg": 2550.0,
        "warning_threshold_mg": 2000.0,
        "unit": "mg",
        "notes": "Risk of lactic acidosis; titrate gradually with meals."
    },
    "amoxicillin": {
        "max_single_dose_mg": 1000.0,
        "max_daily_dose_mg": 3000.0,
        "warning_threshold_mg": 2000.0,
        "unit": "mg",
        "notes": "Standard high-dose upper ceiling for uncomplicated infections."
    },
    "atorvastatin": {
        "max_single_dose_mg": 80.0,
        "max_daily_dose_mg": 80.0,
        "warning_threshold_mg": 40.0,
        "unit": "mg",
        "notes": "Monitor LFTs and CPK if prescribed at maximum 80mg dose."
    },
    "pantoprazole": {
        "max_single_dose_mg": 40.0,
        "max_daily_dose_mg": 80.0,
        "warning_threshold_mg": 40.0,
        "unit": "mg",
        "notes": "Take 30-60 minutes before breakfast for optimal acid suppression."
    },
    "aspirin": {
        "max_single_dose_mg": 325.0,
        "max_daily_dose_mg": 650.0,
        "warning_threshold_mg": 325.0,
        "unit": "mg",
        "notes": "Cardioprotective dose is 75-150mg once daily."
    },
    "azithromycin": {
        "max_single_dose_mg": 500.0,
        "max_daily_dose_mg": 500.0,
        "warning_threshold_mg": 500.0,
        "unit": "mg",
        "notes": "Once-daily regimen; monitor QTc interval."
    },
    "ciprofloxacin": {
        "max_single_dose_mg": 750.0,
        "max_daily_dose_mg": 1500.0,
        "warning_threshold_mg": 1000.0,
        "unit": "mg",
        "notes": "Avoid concurrent multivalent cations (calcium/iron/antacids)."
    },
    "cetirizine": {
        "max_single_dose_mg": 10.0,
        "max_daily_dose_mg": 10.0,
        "warning_threshold_mg": 10.0,
        "unit": "mg",
        "notes": "Second-generation antihistamine; bedtime dosing recommended."
    },
    "omeprazole": {
        "max_single_dose_mg": 40.0,
        "max_daily_dose_mg": 80.0,
        "warning_threshold_mg": 40.0,
        "unit": "mg",
        "notes": "Optimal when taken prior to first meal of the day."
    },
    "losartan": {
        "max_single_dose_mg": 100.0,
        "max_daily_dose_mg": 100.0,
        "warning_threshold_mg": 50.0,
        "unit": "mg",
        "notes": "Monitor serum potassium and renal parameters regularly."
    },
    "metoprolol": {
        "max_single_dose_mg": 100.0,
        "max_daily_dose_mg": 200.0,
        "warning_threshold_mg": 100.0,
        "unit": "mg",
        "notes": "Beta-blocker; monitor resting heart rate and blood pressure."
    },
    "levothyroxine": {
        "max_single_dose_mg": 0.3,
        "max_daily_dose_mg": 0.3,
        "warning_threshold_mg": 0.2,
        "unit": "mg",
        "notes": "Dosed in micrograms (mcg); administer on an empty stomach."
    }
}

# Special population contraindications and demographic precautions
DEMOGRAPHIC_PRECAUTIONS: Dict[str, Dict[str, Any]] = {
    "aspirin": {
        "pediatric_min_age": 18,
        "pediatric_warning": "Contraindicated in children/adolescents due to Reye's syndrome risk.",
        "pregnancy_contraindicated": True,
        "pregnancy_warning": "Avoid in third trimester; risk of premature closure of ductus arteriosus."
    },
    "ciprofloxacin": {
        "pediatric_min_age": 18,
        "pediatric_warning": "Not recommended in patients under 18 due to musculoskeletal and cartilage toxicity.",
        "pregnancy_contraindicated": True,
        "pregnancy_warning": "Avoid during pregnancy unless alternative therapies are unavailable."
    },
    "atorvastatin": {
        "pregnancy_contraindicated": True,
        "pregnancy_warning": "Strictly contraindicated during pregnancy and breastfeeding (fetal harm risk)."
    },
    "losartan": {
        "pregnancy_contraindicated": True,
        "pregnancy_warning": "Black box warning: Discontinue immediately if pregnancy is detected (fetal toxicity)."
    },
    "ibuprofen": {
        "geriatric_min_age": 65,
        "geriatric_warning": "Elevated risk of gastrointestinal bleeding and renal impairment in elderly patients.",
        "pregnancy_contraindicated": True,
        "pregnancy_warning": "Avoid in late pregnancy (third trimester)."
    },
    "metformin": {
        "geriatric_min_age": 65,
        "geriatric_warning": "Elderly patients require renal function (eGFR) monitoring to avoid lactic acidosis."
    }
}

# Administration timing and meal-relation clinical guidelines
MEAL_TIMING_RULES: Dict[str, Dict[str, Any]] = {
    "pantoprazole": {
        "preferred": "empty_stomach",
        "rule_en": "Take 30 to 60 minutes before breakfast on an empty stomach.",
        "rule_hi": "सुबह नाश्ते से 30 से 60 मिनट पहले खाली पेट लें।",
        "mismatch_warning": "Antacids taken after meals show significantly diminished acid-suppression efficacy."
    },
    "omeprazole": {
        "preferred": "empty_stomach",
        "rule_en": "Administer 30 to 60 minutes prior to first meal.",
        "rule_hi": "दिन के पहले भोजन से 30 से 60 मिनट पहले लें।",
        "mismatch_warning": "Absorption is reduced when taken with or after food."
    },
    "levothyroxine": {
        "preferred": "empty_stomach",
        "rule_en": "Strictly administer upon waking with water, at least 30-60 min before breakfast.",
        "rule_hi": "सुबह उठते ही पानी के साथ लें, नाश्ते से कम से कम 30-60 मिनट पहले।",
        "mismatch_warning": "Food and coffee drastically impair gastrointestinal absorption."
    },
    "metformin": {
        "preferred": "with_food",
        "rule_en": "Always take with or immediately after meals to reduce gastrointestinal distress.",
        "rule_hi": "पेट की ख़राबी से बचने के लिए हमेशा भोजन के साथ या तुरंत बाद लें।",
        "mismatch_warning": "Taking metformin on an empty stomach significantly increases nausea and GI cramping."
    },
    "ibuprofen": {
        "preferred": "with_food",
        "rule_en": "Administer after meals or with a snack to protect stomach lining.",
        "rule_hi": "पेट की परत की सुरक्षा के लिए भोजन या नाश्ते के बाद लें।",
        "mismatch_warning": "NSAIDs taken without food significantly elevate gastric ulceration risk."
    },
    "aspirin": {
        "preferred": "with_food",
        "rule_en": "Take with meals or plenty of fluids to minimize gastric mucosal irritation.",
        "rule_hi": "पेट में जलन से बचने के लिए भोजन के साथ लें।",
        "mismatch_warning": "Ingestion on an empty stomach increases mucosal erosion risk."
    }
}


def parse_dosage_value(dosage_str: str) -> Optional[float]:
    """Extract numeric dosage value in milligrams from strings like '500 mg', '0.5g', '100 mcg'."""
    if not dosage_str:
        return None
    cleaned = dosage_str.strip().lower()

    # Micrograms to milligrams conversion (mcg, ug, μg)
    mcg_match = re.search(r"([\d.]+)\s*(?:mcg|ug|μg)\b", cleaned)
    if mcg_match:
        try:
            return float(mcg_match.group(1)) / 1000.0
        except ValueError:
            pass
    
    # Gram to milligram conversion
    g_match = re.search(r"([\d.]+)\s*g\b", cleaned)
    if g_match:
        try:
            return float(g_match.group(1)) * 1000.0
        except ValueError:
            pass

    # Direct mg matching
    mg_match = re.search(r"([\d.]+)\s*mg\b", cleaned)
    if mg_match:
        try:
            return float(mg_match.group(1))
        except ValueError:
            pass

    # Generic number fallback
    num_match = re.search(r"^([\d.]+)", cleaned)
    if num_match:
        try:
            return float(num_match.group(1))
        except ValueError:
            pass

    return None


def parse_liquid_volume_ml(dosage_str: str) -> Optional[float]:
    """Extracts liquid dosage in milliliters from strings like '5 ml', '1 tsp', '1 tbsp'."""
    if not dosage_str:
        return None
    cleaned = dosage_str.strip().lower()

    # Milliliters
    ml_match = re.search(r"([\d.]+)\s*ml\b", cleaned)
    if ml_match:
        try:
            return float(ml_match.group(1))
        except ValueError:
            pass

    # Teaspoon (5 ml)
    tsp_match = re.search(r"([\d.]+)?\s*(?:tsp|teaspoon)\b", cleaned)
    if tsp_match:
        qty = float(tsp_match.group(1)) if tsp_match.group(1) else 1.0
        return qty * 5.0

    # Tablespoon (15 ml)
    tbsp_match = re.search(r"([\d.]+)?\s*(?:tbsp|tablespoon)\b", cleaned)
    if tbsp_match:
        qty = float(tbsp_match.group(1)) if tbsp_match.group(1) else 1.0
        return qty * 15.0

    return None


def parse_frequency_count(frequency_str: str) -> int:
    """Estimates daily administration count from medical abbreviations or natural text."""
    if not frequency_str:
        return 1
    f = frequency_str.strip().lower()

    if any(k in f for k in ["tid", "three times", "thrice", "3 times", "1-1-1"]):
        return 3
    if any(k in f for k in ["bid", "twice", "two times", "2 times", "1-0-1", "0-1-1"]):
        return 2
    if any(k in f for k in ["qid", "four times", "4 times", "1-1-1-1"]):
        return 4
    if any(k in f for k in ["od", "once", "1 time", "daily", "1-0-0", "0-0-1"]):
        return 1
    if "sos" in f or "as needed" in f or "prn" in f:
        return 1

    return 1


def validate_dosage_safety(
    drug_canonical_name: str,
    dosage_str: str,
    frequency_str: str
) -> Dict[str, Any]:
    """Validates the prescribed dosage against established pharmacological thresholds.
    
    Returns structured audit result with status: 'safe', 'warning', or 'exceeded'.
    """
    key = drug_canonical_name.strip().lower()
    profile = CLINICAL_MAX_DAILY_LIMITS.get(key)

    single_dose_mg = parse_dosage_value(dosage_str)
    freq = parse_frequency_count(frequency_str)

    if not profile or single_dose_mg is None:
        return {
            "status": "unverified",
            "message": f"Standard reference guidelines not indexed for {drug_canonical_name}.",
            "single_dose_mg": single_dose_mg,
            "daily_total_mg": (single_dose_mg * freq) if single_dose_mg else None,
            "safety_flags": []
        }

    daily_total_mg = single_dose_mg * freq
    flags = []
    status = "safe"

    if single_dose_mg > profile["max_single_dose_mg"]:
        status = "exceeded"
        flags.append(
            f"Single dose ({single_dose_mg}mg) exceeds recommended ceiling of {profile['max_single_dose_mg']}mg."
        )

    if daily_total_mg > profile["max_daily_dose_mg"]:
        status = "exceeded"
        flags.append(
            f"Calculated daily dose ({daily_total_mg}mg/day) exceeds maximum daily limit of {profile['max_daily_dose_mg']}mg/day."
        )
    elif daily_total_mg >= profile["warning_threshold_mg"]:
        if status != "exceeded":
            status = "warning"
        flags.append(
            f"Daily dose ({daily_total_mg}mg/day) approaches upper ceiling. {profile['notes']}"
        )

    return {
        "status": status,
        "single_dose_mg": single_dose_mg,
        "daily_total_mg": daily_total_mg,
        "max_daily_limit_mg": profile["max_daily_dose_mg"],
        "clinical_note": profile["notes"],
        "safety_flags": flags
    }


def validate_special_population_safety(
    drug_canonical_name: str,
    patient_age: Optional[int] = None,
    is_pregnant: bool = False
) -> Dict[str, Any]:
    """Evaluates demographic and special population risks (pediatric, geriatric, pregnancy)."""
    key = drug_canonical_name.strip().lower()
    rules = DEMOGRAPHIC_PRECAUTIONS.get(key, {})
    warnings = []
    contraindicated = False

    if is_pregnant and rules.get("pregnancy_contraindicated"):
        contraindicated = True
        warnings.append(rules.get("pregnancy_warning", "Contraindicated in pregnancy."))

    if patient_age is not None:
        ped_limit = rules.get("pediatric_min_age")
        if ped_limit and patient_age < ped_limit:
            contraindicated = True
            warnings.append(rules.get("pediatric_warning", f"Not recommended under {ped_limit} years of age."))

        ger_limit = rules.get("geriatric_min_age")
        if ger_limit and patient_age >= ger_limit:
            warnings.append(rules.get("geriatric_warning", "Geriatric precautions apply."))

    return {
        "drug": drug_canonical_name,
        "contraindicated": contraindicated,
        "demographic_warnings": warnings
    }


def validate_administration_timing(
    drug_canonical_name: str,
    timing_instruction: str
) -> Dict[str, Any]:
    """Checks if the administration timing matches pharmacological food-relation requirements."""
    key = drug_canonical_name.strip().lower()
    rule = MEAL_TIMING_RULES.get(key)
    if not rule:
        return {
            "status": "unverified",
            "message": f"No specific meal timing restrictions cataloged for {drug_canonical_name}."
        }

    clean_t = timing_instruction.strip().lower()
    is_after_food = any(w in clean_t for w in ["after", "post", "pc", "with food", "with meals", "after meal", "after breakfast", "after dinner"])
    is_empty_stomach = any(w in clean_t for w in ["before", "empty", "ac", "ante", "fasting", "empty stomach", "before food", "before breakfast"])

    preferred = rule["preferred"]
    timing_compliant = True
    warning = None

    if preferred == "empty_stomach" and is_after_food and not is_empty_stomach:
        timing_compliant = False
        warning = rule["mismatch_warning"]
    elif preferred == "with_food" and is_empty_stomach and not is_after_food:
        timing_compliant = False
        warning = rule["mismatch_warning"]

    return {
        "drug": drug_canonical_name,
        "timing_compliant": timing_compliant,
        "preferred_relation": preferred,
        "recommendation_en": rule["rule_en"],
        "recommendation_hi": rule["rule_hi"],
        "warning": warning
    }


def generate_bilingual_dosage_advisory(audit: Dict[str, Any], lang: str = "en") -> str:
    """Generates localized patient-friendly advisory text for UI cards or Voice TTS."""
    status = audit.get("status", "safe")
    flags = audit.get("safety_flags", [])

    if lang == "hi":
        if status == "safe":
            return "निर्धारित खुराक सुरक्षित नैदानिक सीमा के भीतर है।"
        elif status == "warning":
            return f"सावधानी: यह खुराक दैनिक सीमा के निकट है। {audit.get('clinical_note', '')}"
        elif status == "exceeded":
            first_flag = flags[0] if flags else "खुराक अनुशंसित दैनिक सीमा से अधिक है।"
            return f"चेतावनी: {first_flag} कृपया डॉक्टर से पुष्टि करें।"
        return "खुराक की जानकारी की पुष्टि अपने फार्मासिस्ट से करें।"

    # Default English
    if status == "safe":
        return "Prescribed dosage is within standard clinical safety limits."
    elif status == "warning":
        return f"Precaution: Daily intake approaches upper ceiling. {audit.get('clinical_note', '')}"
    elif status == "exceeded":
        first_flag = flags[0] if flags else "Dosage exceeds maximum recommended limits."
        return f"Warning: {first_flag} Please verify with your prescribing physician."
    return "Standard dosing guidelines unverified. Consult your pharmacist."


def batch_validate_prescriptions(medications: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Audits an entire prescription regimen for dosage range compliance.
    
    Args:
        medications: List of medication dicts containing at least:
                     - 'name' or 'medicine_name'
                     - 'dosage' (e.g. '500 mg')
                     - 'frequency' (e.g. '1-0-1')
                     
    Returns:
        Structured batch validation summary with counts and per-medication findings.
    """
    results = []
    has_exceeded = False
    has_warning = False

    for med in medications:
        name = med.get("name") or med.get("medicine_name") or med.get("drug") or ""
        dosage = med.get("dosage", "")
        frequency = med.get("frequency", "")

        audit = validate_dosage_safety(name, dosage, frequency)
        if audit["status"] == "exceeded":
            has_exceeded = True
        elif audit["status"] == "warning":
            has_warning = True

        results.append({
            "medication": name,
            "prescribed_dosage": dosage,
            "frequency": frequency,
            "audit": audit
        })

    overall_status = "exceeded" if has_exceeded else ("warning" if has_warning else "safe")

    return {
        "overall_status": overall_status,
        "total_medications_checked": len(medications),
        "results": results
    }
