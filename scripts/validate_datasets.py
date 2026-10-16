"""
AushadhiDrishti - Dataset Validation & Integrity Checker
-------------------------------------------------------
Validates consistency, bilingual fields, schema completeness, 
and drug-to-interaction references across data catalog files.

Usage:
    python scripts/validate_datasets.py
"""

import os
import sys
import json
from typing import Dict, Any, List, Set

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(ROOT_DIR, "data")
DRUG_DB_PATH = os.path.join(DATA_DIR, "drug_database.json")
INTERACTIONS_PATH = os.path.join(DATA_DIR, "interactions.json")

REQUIRED_DRUG_FIELDS = [
    "generic",
    "brand_names",
    "category",
    "default_dosage",
    "timing",
    "schedule",
    "uses",
    "warnings",
    "side_effects",
]

BILINGUAL_FIELDS = ["category", "timing", "uses", "warnings", "side_effects"]
VALID_SEVERITIES = {"contraindicated", "major", "moderate"}


def load_json(filepath: str) -> Any:
    if not os.path.exists(filepath):
        print(f"[ERROR] Missing file: {filepath}")
        sys.exit(1)
    with open(filepath, "r", encoding="utf-8") as f:
        return json.load(f)


def validate_catalog() -> bool:
    print("=" * 65)
    print("  AushadhiDrishti - Pharmacology Dataset Integrity Validator")
    print("=" * 65)

    drugs = load_json(DRUG_DB_PATH)
    interactions = load_json(INTERACTIONS_PATH)
    issues: List[str] = []

    print(f"\n[1/3] Validating Drug Catalog: {os.path.basename(DRUG_DB_PATH)}")
    print(f"      Total Registered Entities: {len(drugs)}")

    known_keys: Set[str] = set(drugs.keys())

    for key, item in drugs.items():
        for field in REQUIRED_DRUG_FIELDS:
            if field not in item:
                issues.append(f"Drug '{key}' missing required field '{field}'")
        for b_field in BILINGUAL_FIELDS:
            val = item.get(b_field)
            if isinstance(val, dict):
                if not val.get("en"):
                    issues.append(f"Drug '{key}' missing English ('en') in '{b_field}'")
                if not val.get("hi"):
                    issues.append(f"Drug '{key}' missing Hindi ('hi') in '{b_field}'")

    print(f"\n[2/3] Validating Drug-Drug Interactions: {os.path.basename(INTERACTIONS_PATH)}")
    print(f"      Total Interaction Rules: {len(interactions)}")

    severity_counts = {s: 0 for s in VALID_SEVERITIES}

    for idx, rule in enumerate(interactions, start=1):
        rule_drugs = rule.get("drugs", [])
        if len(rule_drugs) != 2:
            issues.append(f"Rule #{idx}: Expected exactly 2 drugs, got {rule_drugs}")

        severity = rule.get("severity")
        if severity not in VALID_SEVERITIES:
            issues.append(f"Rule #{idx}: Invalid severity '{severity}' (allowed: {VALID_SEVERITIES})")
        else:
            severity_counts[severity] += 1

        for drug in rule_drugs:
            if drug not in known_keys:
                issues.append(f"Rule #{idx}: Referenced drug '{drug}' not in drug_database.json")

    print("\n[3/3] Severity Distribution:")
    for sev, count in severity_counts.items():
        print(f"      - {sev.capitalize():<15}: {count} pairs")

    print("\n" + "-" * 65)
    if issues:
        print(f"[FAIL] Found {len(issues)} validation issues:")
        for issue in issues[:10]:
            print(f"  * {issue}")
        if len(issues) > 10:
            print(f"  ... and {len(issues) - 10} more.")
        return False
    else:
        print("[SUCCESS] All database schemas, bilingual pairs, and references verified!")
        print("=" * 65)
        return True


if __name__ == "__main__":
    success = validate_catalog()
    sys.exit(0 if success else 1)
