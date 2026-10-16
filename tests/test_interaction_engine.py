"""
Unit Tests for Clinical Interaction Engine
------------------------------------------
Tests pharmacological key resolution, brand-to-generic mappings,
pairwise interaction alerts, and clinical safety scoring.
"""

import unittest
import os
import sys

# Ensure repository root is on sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from services.interaction_engine import ClinicalInteractionEngine


class TestClinicalInteractionEngine(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        cls.engine = ClinicalInteractionEngine()

    def test_database_loaded(self):
        """Verifies database dictionaries are successfully loaded."""
        self.assertGreater(len(self.engine.drug_db), 0)
        self.assertGreater(len(self.engine.interactions), 0)
        self.assertGreater(len(self.engine.brand_to_generic), 0)

    def test_generic_resolution(self):
        """Tests exact generic name matching."""
        self.assertEqual(self.engine.resolve_drug_key("paracetamol"), "paracetamol")
        self.assertEqual(self.engine.resolve_drug_key("metformin"), "metformin")
        self.assertEqual(self.engine.resolve_drug_key("warfarin"), "warfarin")

    def test_brand_name_resolution(self):
        """Tests brand-to-generic resolution (e.g. Dolo -> paracetamol)."""
        self.assertEqual(self.engine.resolve_drug_key("Dolo 650"), "paracetamol")
        self.assertEqual(self.engine.resolve_drug_key("Calpol"), "paracetamol")
        self.assertEqual(self.engine.resolve_drug_key("Glycomet"), "metformin")

    def test_case_and_punctuation_insensitivity(self):
        """Tests drug resolution with messy casing and trailing punctuation."""
        self.assertEqual(self.engine.resolve_drug_key("  PARACETAMOL. "), "paracetamol")
        self.assertEqual(self.engine.resolve_drug_key("aspirin,"), "aspirin")

    def test_unrecognized_drug_fallback(self):
        """Tests fallback structure for an unknown medication."""
        unknown = self.engine.get_drug_info("ExperimentalDrugXYZ")
        self.assertFalse(unknown["identified"])
        self.assertIsNone(unknown["canonical_key"])
        self.assertIn("en", unknown["category"])
        self.assertIn("hi", unknown["category"])

    def test_contraindicated_interaction_detection(self):
        """Tests that Warfarin + Aspirin triggers a contraindicated alert."""
        alerts = self.engine.evaluate_interactions(["warfarin", "aspirin"])
        self.assertGreater(len(alerts), 0)
        self.assertEqual(alerts[0]["severity"], "contraindicated")

    def test_safety_score_danger(self):
        """Tests that contraindicated interactions yield a 'danger' level."""
        alerts = self.engine.evaluate_interactions(["warfarin", "aspirin"])
        score = self.engine.calculate_safety_score(alerts)
        self.assertEqual(score["level"], "danger")
        self.assertIn("CRITICAL RISK", score["badge_en"])

    def test_safety_score_safe(self):
        """Tests that non-interacting drugs yield a 'safe' level."""
        alerts = self.engine.evaluate_interactions(["paracetamol"])
        score = self.engine.calculate_safety_score(alerts)
        self.assertEqual(score["level"], "safe")


if __name__ == "__main__":
    unittest.main()
