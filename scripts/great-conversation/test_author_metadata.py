import json
from pathlib import Path
import sqlite3
import unittest

ROOT = Path(__file__).resolve().parents[2]


class AuthorMetadataTest(unittest.TestCase):
    def test_same_database_preserves_dates_and_stores_classifications_and_estimates(self):
        con = sqlite3.connect(
            f"file:{ROOT / 'scripts/great-conversation/data/author-births.sqlite'}?mode=ro",
            uri=True,
        )
        try:
            self.assertEqual(con.execute("PRAGMA integrity_check").fetchone()[0], "ok")
            catalogue = json.loads((ROOT / "artifacts/legacy/client/app/lib/data/gc-author-births.json").read_text())
            rows = {r["id"]: r for r in catalogue}
            for key, known_year in con.execute("SELECT id, birth_year FROM author_births"):
                role = con.execute("SELECT role FROM author_roles WHERE id=?", (key,)).fetchone()
                self.assertIn(role[0], ("author", "non-author"))
                self.assertEqual(role[0], rows[key]["role"])
                if known_year is not None:
                    self.assertEqual(rows[key]["birthYear"], known_year, key)
                elif rows[key]["roleStatus"] != "non-person":
                    estimate = con.execute("SELECT estimated_year, basis, kind FROM author_date_estimates WHERE id=?", (key,)).fetchone()
                    self.assertEqual(estimate[0], rows[key]["birthYear"], key)
                    self.assertTrue(estimate[1])
                    self.assertIn(estimate[2], ("source-range", "placement"))
                    evidence = rows[key]["birthEvidence"]
                    self.assertIsNone(evidence["birthYear"], key)
                    self.assertIsNone(evidence["birthDate"], key)
                    self.assertNotIn(evidence["status"], ("estimated", "placement-estimate"))
            self.assertEqual(con.execute("SELECT role FROM author_roles WHERE id='Epictetus'").fetchone()[0], "author")
        finally:
            con.close()


if __name__ == "__main__":
    unittest.main()
