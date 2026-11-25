import json
from pathlib import Path
import unittest

from build_wab_graphs import build


ROOT = Path(__file__).resolve().parents[2]
ARCHIVE = ROOT / "attached_assets/legacy_wab_deliverables2_1794351123169.zip"
SNAPSHOT = ROOT / "artifacts/legacy/client/app/lib/data/gc-wab.json"


class WabGraphsTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.data = json.loads(SNAPSHOT.read_text())

    def test_reproducible_from_original_archive(self):
        if not ARCHIVE.exists():
            self.skipTest("Original upload not installed")
        self.assertEqual(build(ARCHIVE), self.data)

    def test_all_edge_endpoints_resolve(self):
        for name in ("people", "works"):
            graph = self.data[name]
            ids = {n["id"] for n in graph["nodes"]}
            self.assertEqual(len(ids), len(graph["nodes"]))
            for link in graph["links"]:
                self.assertIn(link["source"], ids)
                self.assertIn(link["target"], ids)

    def test_rejected_and_reclassified_edges_excluded(self):
        self.assertEqual(len(self.data["people"]["links"]), 334)
        self.assertEqual(len(self.data["works"]["links"]), 617)
        for name in ("people", "works"):
            for link in self.data[name]["links"]:
                self.assertNotIn(link["status"], (
                    "rejected", "rejected_text_reviewed", "reclassified", "target_unidentifiable",
                ))

    def test_uncertainty_not_silently_neutral(self):
        for name in ("people", "works"):
            for link in self.data[name]["links"]:
                if link["stance"] == "insufficient_evidence":
                    self.assertTrue(link["uncertain"])
                if link["status"] in ("unverified", "metadata_only_unverified"):
                    self.assertTrue(link["uncertain"])
        self.assertEqual(sum(not e["uncertain"] for e in self.data["people"]["links"]), 213)
        self.assertEqual(sum(not e["uncertain"] for e in self.data["works"]["links"]), 279)

    def test_provenance_and_direction_preserved(self):
        for link in self.data["people"]["links"]:
            self.assertEqual(link["source"], "Wittgenstein__Ludwig")
        for name in ("people", "works"):
            for link in self.data[name]["links"]:
                self.assertTrue(link["evidenceIds"])
                self.assertGreater(link["occurrences"], 0)
                for url in link["sourceUrls"]:
                    self.assertTrue(url.startswith(("https://", "http://")))
        self.assertIn("not human-verified", self.data["reviewNotice"])


if __name__ == "__main__":
    unittest.main()
