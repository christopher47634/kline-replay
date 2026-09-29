"""Unit tests for validate_events.check_event. Run: python -m unittest scripts/test_validate_events.py"""
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import validate_events as v  # noqa: E402


def series(n=200):
    dates = [f"2020-{1 + i // 28:02d}-{1 + i % 28:02d}" for i in range(n)]  # synthetic, strictly increasing
    return dates, [100 + i for i in range(n)]


class CheckEvent(unittest.TestCase):
    def test_good_event_passes(self):
        dates, closes = series()
        ev = {"id": "x", "date": dates[100], "difficulty": 2, "verify": True, "hindsight": ""}
        errors, warnings, facts = v.check_event(ev, dates, closes)
        self.assertEqual((errors, warnings), ([], []))
        self.assertGreater(facts["after"], 0)

    def test_non_trading_day_warns_and_suggests_next(self):
        dates, closes = series()
        ev = {"id": "x", "date": "2020-01-99", "difficulty": 2, "hindsight": ""}
        errors, warnings, facts = v.check_event(ev, dates, closes)
        self.assertTrue(any("not a trading day" in w for w in warnings))
        self.assertIsNotNone(facts.get("next_trading_day"))

    def test_wrong_date_far_outside_data_is_an_error(self):
        dates, closes = series()
        ev = {"id": "x", "date": "2099-01-01", "difficulty": 2, "hindsight": ""}
        errors, warnings, _ = v.check_event(ev, dates, closes)
        self.assertTrue(errors)

    def test_not_enough_history_is_an_error(self):
        dates, closes = series()
        errors, _, _ = v.check_event({"id": "x", "date": dates[10], "difficulty": 2, "hindsight": ""}, dates, closes)
        self.assertTrue(any("days before" in e for e in errors))

    def test_text_number_mismatch_is_caught(self):
        dates, closes = series()
        ev = {"id": "x", "date": dates[100], "difficulty": 2, "hindsight": "当日大涨 9.9%，此后 20 个交易日涨 1.0%。"}
        errors, _, _ = v.check_event(ev, dates, closes)
        self.assertEqual(len(errors), 2)


if __name__ == "__main__":
    unittest.main()
