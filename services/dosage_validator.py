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
