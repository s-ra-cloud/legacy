"""Offline date/provenance regressions; no database or network access."""
import hashlib
import json
import re
import unittest
from pathlib import Path
from unittest.mock import patch

from build_wab_graphs import apply_publication_dates

ROOT = Path(__file__).resolve().parents[2]
CATALOGUE = Path(__file__).parent / "data/work-publication-years.json"


class WorkPublicationYearsTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.snapshot = json.loads((ROOT / "artifacts/legacy/client/app/lib/data/gc-wab.json").read_text())
        cls.records = json.loads(CATALOGUE.read_text())["works"]
        cls.nodes = {n["id"]: n for n in cls.snapshot["works"]["nodes"]}

    def test_every_node_assessed_with_explicit_unknowns(self):
        self.assertEqual(set(self.records), set(self.nodes))
        self.assertEqual(len(self.nodes), 380)
        for key, record in self.records.items():
            node = self.nodes[key]
            self.assertEqual(node["publicationDate"], record)
            self.assertTrue(record["note"])
            if record["status"] == "unknown":
                self.assertIsNone(record["year"])
                self.assertNotIn("publicationYear", node)
            else:
                self.assertRegex(record["year"], r"^[1-9]\d{3}(–[1-9]\d{3})?$")
                self.assertIn(record["kind"], ("first_publication", "edition"))
                self.assertEqual(node["publicationYear"], record["year"])
                self.assertTrue(record["sources"])
                for source in record["sources"]:
                    self.assertTrue(source["evidence"])
                    self.assertRegex(source["url"], r"^https?://")

    def test_graph_identity_and_relationships_unchanged(self):
        data = self.snapshot
        protected = {
            "people": data["people"],
            "links": data["works"]["links"],
            "nodes": [{k: v for k, v in n.items() if k in ("id", "name", "workTitle", "authorSurname")}
                      for n in data["works"]["nodes"]],
        }
        digest = hashlib.sha256(json.dumps(protected, sort_keys=True, ensure_ascii=False).encode()).hexdigest()
        self.assertEqual(digest, "95843bdb403b7f4119e666f20695b7ed5b069edc949b90eaa84a702e9883a68f")

    def test_edition_and_event_dates_not_confused(self):
        self.assertEqual(self.nodes["W-BBB"]["publicationYear"], "1958")
        self.assertEqual(self.nodes["W-BBB"]["publicationDate"]["kind"], "edition")
        mozart = self.nodes["Mozart__Wolfgang_Amadeus__Le_nozze_di_Figaro"]
        self.assertEqual(mozart["archiveDate"], "1786")
        self.assertNotIn("publicationYear", mozart)
        euler = self.nodes["Euler__Leonhard__Variae_observations_circa_series_infinitas"]
        self.assertEqual(euler["publicationYear"], "1744")
        self.assertEqual(self.nodes["Freud__Sigmund__Traumdeutung"]["publicationYear"], "1899")
        self.assertIn("1900", self.nodes["Freud__Sigmund__Traumdeutung"]["publicationDate"]["note"])
        self.assertEqual(self.nodes["Frege__Gottlob__Grundgesetze_der_Arithmetik"]["publicationYear"], "1893–1903")
        self.assertNotIn("publicationYear", self.nodes["Goethe__Johann_Wolfgang_von__Die_Metamorphose_der_Pflanzen"])
        self.assertNotIn("publicationYear", self.nodes["Plato__Der_Staat"])

    def test_bad_catalogue_join_fails_explicitly(self):
        with patch("build_wab_graphs.DATE_CATALOGUE") as path:
            path.read_text.return_value = json.dumps({"works": {"not-a-node": {}}})
            with self.assertRaisesRegex(ValueError, "unknown graph IDs"):
                apply_publication_dates([], {})
            path.read_text.return_value = '{"works": {}}'
            with self.assertRaisesRegex(ValueError, "Missing date assessment"):
                apply_publication_dates([{"id": "new-node"}], {"new-node": {}})


if __name__ == "__main__":
    unittest.main()
