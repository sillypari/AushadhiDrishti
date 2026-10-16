import json
import os
from typing import List, Dict, Any, Optional

DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data")


class ClinicalInteractionEngine:
    def __init__(self):
        self.drug_db = self._load_json(os.path.join(DATA_DIR, "drug_database.json"))
        self.interactions = self._load_json(os.path.join(DATA_DIR, "interactions.json"))
        self.brand_to_generic = self._build_brand_mapping()

    def _load_json(self, path: str):
        try:
            with open(path, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as e:
            print(f"Error loading {path}: {e}")
            return {}

    def _build_brand_mapping(self) -> Dict[str, str]:
        mapping = {}
        for generic_key, details in self.drug_db.items():
            mapping[generic_key.lower()] = generic_key
            # Clean generic name
            gen_clean = details.get("generic", "").lower()
            mapping[gen_clean] = generic_key
            for word in gen_clean.split():
                if len(word) > 4:
                    mapping[word] = generic_key
            for brand in details.get("brand_names", []):
                b_clean = brand.lower().split()[0].replace("-", "").strip()
                mapping[b_clean] = generic_key
                mapping[brand.lower()] = generic_key
        return mapping

    def resolve_drug_key(self, raw_name: str) -> Optional[str]:
        """Resolves a raw detected drug name or brand to the internal canonical key."""
        if not raw_name:
            return None
        clean = raw_name.lower().replace(".", "").replace(",", "").strip()
        
        # Direct match in brand map
        if clean in self.brand_to_generic:
            return self.brand_to_generic[clean]

        # Partial token match
        tokens = [t.strip() for t in clean.replace("-", " ").replace("/", " ").split() if len(t.strip()) > 3]
        for token in tokens:
            if token in self.brand_to_generic:
                return self.brand_to_generic[token]
            for b_name, g_key in self.brand_to_generic.items():
                if token in b_name or b_name in token:
                    return g_key

        # Key substring match
        for key in self.drug_db.keys():
            if key in clean or clean in key:
                return key

        return None

    def get_drug_info(self, raw_name: str) -> Dict[str, Any]:
        """Enriches detected medication with verified pharmacological knowledge."""
        resolved_key = self.resolve_drug_key(raw_name)
        if resolved_key and resolved_key in self.drug_db:
            db_entry = self.drug_db[resolved_key]
            return {
                "identified": True,
                "canonical_key": resolved_key,
                "generic_name": db_entry.get("generic", raw_name),
                "category": db_entry.get("category", {}),
                "typical_dosage": db_entry.get("default_dosage", "As prescribed"),
                "timing": db_entry.get("timing", {}),
                "schedule": db_entry.get("schedule", "1-0-0"),
                "schedule_hi": db_entry.get("schedule_hi", "1-0-0"),
                "uses": db_entry.get("uses", {}),
                "warnings": db_entry.get("warnings", {}),
                "side_effects": db_entry.get("side_effects", {}),
            }
        
        # Fallback for unrecognized drug
        return {
            "identified": False,
            "canonical_key": None,
            "generic_name": raw_name.strip(),
            "category": {
                "en": "Prescribed Medication (Consult Pharmacist)",
                "hi": "निर्धारित औषधि (फार्मासिस्ट से परामर्श लें)"
            },
            "typical_dosage": "As prescribed",
            "timing": {
                "en": "Follow the prescribing physician's exact instruction",
                "hi": "चिकित्सक के दिए गए निर्देश का पालन करें"
            },
            "schedule": "As directed",
            "schedule_hi": "निर्देशानुसार",
            "uses": {
                "en": "Please consult your doctor or clinical pharmacist for verification.",
                "hi": "कृपया विवरण हेतु अपने डॉक्टर या फार्मासिस्ट से परामर्श करें।"
            },
            "warnings": {
                "en": "Verify dosage with medical practitioner.",
                "hi": "खुराक के सत्यापन हेतु डॉक्टर से संपर्क करें।"
            },
            "side_effects": {
                "en": "No specific database entry.",
                "hi": "कोई विशिष्ट डेटा उपलब्ध नहीं।"
            }
        }

    def evaluate_interactions(self, drug_keys: List[str]) -> List[Dict[str, Any]]:
        """Evaluates all pairwise drug interactions."""
        valid_keys = list(set([k for k in drug_keys if k]))
        found_alerts = []

        for i in range(len(valid_keys)):
            for j in range(i + 1, len(valid_keys)):
                pair = {valid_keys[i], valid_keys[j]}
                for rule in self.interactions:
                    rule_set = set(rule.get("drugs", []))
                    if pair == rule_set:
                        found_alerts.append(rule)

        # Sort by severity (contraindicated first, then major, then moderate)
        severity_order = {"contraindicated": 0, "major": 1, "moderate": 2}
        found_alerts.sort(key=lambda x: severity_order.get(x.get("severity", "moderate"), 3))
        return found_alerts

    def calculate_safety_score(self, alerts: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Calculates safety status: 'safe', 'caution', or 'danger'."""
        if any(a.get("severity") == "contraindicated" for a in alerts):
            return {
                "level": "danger",
                "color": "#dc2626",
                "badge_en": "CRITICAL RISK DETECTED",
                "badge_hi": "घातक जोखिम चेतावनी",
                "summary_en": "Dangerous drug-drug interaction found. Immediate physician intervention advised before administering.",
                "summary_hi": "दवाओं का जानलेवा प्रतिकूल प्रभाव पहचाना गया। दवा देने से पहले तुरंत डॉक्टर से परामर्श लें।"
            }
        elif any(a.get("severity") == "major" for a in alerts):
            return {
                "level": "caution",
                "color": "#ea580c",
                "badge_en": "MAJOR CAUTION ADVISED",
                "badge_hi": "विशेष सावधानी आवश्यक",
                "summary_en": "Significant interaction detected. Requires clinical monitoring or adjusted timing.",
                "summary_hi": "दवाओं के बीच परस्पर क्रिया का जोखिम है। निगरानी अथवा खुराक के समय में अंतर आवश्यक है।"
            }
        elif any(a.get("severity") == "moderate" for a in alerts):
            return {
                "level": "moderate",
                "color": "#ca8a04",
                "badge_en": "MODERATE MONITORING",
                "badge_hi": "साधारण सतर्कता",
                "summary_en": "Mild to moderate interaction present. Follow dosage separation instructions.",
                "summary_hi": "सामान्य प्रभाव संभव है। दवाओं के बीच समयांतराल का ध्यान रखें।"
            }
        else:
            return {
                "level": "safe",
                "color": "#16a34a",
                "badge_en": "SAFE / NO SEVERE CONFLICTS",
                "badge_hi": "सुरक्षित / कोई गंभीर टकराव नहीं",
                "summary_en": "No dangerous drug-drug interactions detected between the identified medications.",
                "summary_hi": "पहचानी गई दवाओं के बीच कोई हानिकारक टकराव नहीं पाया गया।"
            }
