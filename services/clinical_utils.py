"""
AushadhiDrishti - Clinical Dosage & Timetable Utilities
-------------------------------------------------------
Helper functions for normalizing prescription timetable schedules,
parsing dosage strengths and units, and computing weighted risk metrics.
"""

import re
from typing import Dict, Any, List, Optional


def format_schedule_badge(schedule_code: str) -> Dict[str, Any]:
    """
    Translates standard Indian clinical shorthand (e.g. '1-0-1', '1-1-1', '0-0-1')
    into structured slot flags and bilingual descriptions.
    """
    clean = re.sub(r"[^0-9\-]", "", (schedule_code or "")).strip("-")
    parts = clean.split("-") if clean else []

    morning = False
    afternoon = False
    night = False

    if len(parts) >= 3:
        morning = parts[0] != "0"
        afternoon = parts[1] != "0"
        night = parts[2] != "0"
    elif len(parts) == 1 and parts[0].isdigit():
        morning = int(parts[0]) > 0

    freq = sum([1 for flag in (morning, afternoon, night) if flag])

    # Generate bilingual labels
    if morning and afternoon and night:
        en = "Thrice Daily (Morning, Afternoon & Night)"
        hi = "दिन में 3 बार (सुबह, दोपहर एवं रात)"
    elif morning and night:
        en = "Twice Daily (Morning & Night)"
        hi = "दिन में 2 बार (सुबह एवं रात)"
    elif morning and afternoon:
        en = "Twice Daily (Morning & Afternoon)"
        hi = "दिन में 2 बार (सुबह एवं दोपहर)"
    elif morning:
        en = "Once Daily (Morning)"
        hi = "दिन में 1 बार (सुबह)"
    elif night:
        en = "Once Daily (Night / Bedtime)"
        hi = "दिन में 1 बार (रात को सोने से पहले)"
    elif afternoon:
        en = "Once Daily (Afternoon)"
        hi = "दिन में 1 बार (दोपहर)"
    else:
        en = "As Prescribed by Physician"
        hi = "चिकित्सक के निर्देशानुसार"

    return {
        "morning": morning,
        "afternoon": afternoon,
        "night": night,
        "frequency_per_day": max(freq, 1),
        "label_en": en,
        "label_hi": hi,
    }


def parse_dosage_strength(raw_dosage: str) -> Dict[str, Any]:
    """
    Extracts numeric strength and measurement unit from dosage strings.
    Example: '650mg' -> {'value': 650.0, 'unit': 'mg', 'normalized_mg': 650.0}
    """
    if not raw_dosage:
        return {"value": None, "unit": None, "normalized_mg": None}

    match = re.search(r"([0-9]+(?:\.[0-9]+)?)\s*([a-zA-Z]+)", str(raw_dosage).strip())
    if not match:
        return {"value": None, "unit": None, "normalized_mg": None}

    val = float(match.group(1))
    unit = match.group(2).lower()

    # Normalize to milligrams for standardized clinical calculations
    multiplier = 1.0
    if unit in ("g", "gm", "gram", "grams"):
        multiplier = 1000.0
    elif unit in ("mcg", "ug", "microgram"):
        multiplier = 0.001
    elif unit in ("mg", "mgs", "milligram"):
        multiplier = 1.0

    return {
        "value": val,
        "unit": unit,
        "normalized_mg": round(val * multiplier, 3),
    }


def calculate_risk_index(alerts: List[Dict[str, Any]]) -> float:
    """
    Computes a normalized clinical risk score between 0.0 (safest) and 1.0 (highest danger)
    based on the weighted severity of all detected interactions.
    """
    if not alerts:
        return 0.0

    weights = {
        "contraindicated": 0.50,
        "major": 0.25,
        "moderate": 0.10,
    }

    raw_score = sum(weights.get(a.get("severity", "moderate"), 0.05) for a in alerts)
    return round(min(raw_score, 1.0), 2)
