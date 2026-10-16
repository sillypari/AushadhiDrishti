"""
Unit Tests for Clinical Utility Functions
-----------------------------------------
Tests timetable parsing, dosage strength normalization,
and clinical risk index scoring.
"""

import unittest
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from services.clinical_utils import (
    format_schedule_badge,
    parse_dosage_strength,
    calculate_risk_index,
)


class TestClinicalUtils(unittest.TestCase):

    def test_schedule_twice_daily(self):
        badge = format_schedule_badge("1-0-1")
        self.assertTrue(badge["morning"])
        self.assertFalse(badge["afternoon"])
        self.assertTrue(badge["night"])
        self.assertEqual(badge["frequency_per_day"], 2)
        self.assertIn("Morning & Night", badge["label_en"])

    def test_schedule_thrice_daily(self):
        badge = format_schedule_badge("1-1-1")
        self.assertTrue(badge["morning"])
        self.assertTrue(badge["afternoon"])
        self.assertTrue(badge["night"])
        self.assertEqual(badge["frequency_per_day"], 3)

    def test_schedule_night_only(self):
        badge = format_schedule_badge("0-0-1")
        self.assertFalse(badge["morning"])
        self.assertFalse(badge["afternoon"])
        self.assertTrue(badge["night"])
        self.assertEqual(badge["frequency_per_day"], 1)

    def test_parse_dosage_mg(self):
        res = parse_dosage_strength("650mg")
        self.assertEqual(res["value"], 650.0)
        self.assertEqual(res["unit"], "mg")
        self.assertEqual(res["normalized_mg"], 650.0)

    def test_parse_dosage_grams(self):
        res = parse_dosage_strength("1.5 g")
        self.assertEqual(res["value"], 1.5)
        self.assertEqual(res["normalized_mg"], 1500.0)

    def test_parse_dosage_mcg(self):
        res = parse_dosage_strength("50mcg")
        self.assertEqual(res["value"], 50.0)
        self.assertEqual(res["normalized_mg"], 0.05)

    def test_parse_dosage_invalid(self):
        res = parse_dosage_strength("As directed")
        self.assertIsNone(res["value"])
        self.assertIsNone(res["unit"])

    def test_risk_index_empty(self):
        self.assertEqual(calculate_risk_index([]), 0.0)

    def test_risk_index_single_moderate(self):
        alerts = [{"severity": "moderate"}]
        self.assertEqual(calculate_risk_index(alerts), 0.10)

    def test_risk_index_contraindicated(self):
        alerts = [{"severity": "contraindicated"}]
        self.assertEqual(calculate_risk_index(alerts), 0.50)

    def test_risk_index_capped_at_one(self):
        alerts = [
            {"severity": "contraindicated"},
            {"severity": "contraindicated"},
            {"severity": "major"},
        ]
        self.assertEqual(calculate_risk_index(alerts), 1.0)


if __name__ == "__main__":
    unittest.main()
