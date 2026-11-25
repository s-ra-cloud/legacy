import copy
import hashlib
import json
from pathlib import Path
import tempfile
import unittest
from recovery_sources import load_manifest, verify_source


class RecoverySourcesTests(unittest.TestCase):
    def test_manifest_totals(self):
        sources = load_manifest()["sources"]
        self.assertEqual(len(sources), 11)
        self.assertEqual(sum(s["rowsWritten"] for s in sources if s["kind"] == "authorPub"), 103020372)
        self.assertEqual(sum(s["rejected"] for s in sources), 1)

    def test_invalid_manifest_refused(self):
        original = load_manifest()
        for change in ("path", "checksum", "missing", "order", "counts"):
            manifest = copy.deepcopy(original)
            if change == "path":
                manifest["sources"][0]["name"] = "../people.gz"
            elif change == "checksum":
                manifest["sources"][0]["sha256"] = "bad"
            elif change == "missing":
                manifest["sources"].pop()
            elif change == "order":
                manifest["sources"].reverse()
            else:
                manifest["sources"][0]["rowsWritten"] = 999999999
            with self.subTest(change=change), tempfile.TemporaryDirectory() as tmp:
                path = Path(tmp) / "manifest.json"
                path.write_text(json.dumps(manifest))
                with self.assertRaises(ValueError):
                    load_manifest(path)

    def test_size_checksum_and_symlink(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "source.gz"
            path.write_bytes(b"test")
            source = {"bytes": 4, "sha256": hashlib.sha256(b"test").hexdigest()}
            verify_source(path, source)
            path.write_bytes(b"fail")
            with self.assertRaisesRegex(ValueError, "checksum"):
                verify_source(path, source)
            path.write_bytes(b"x")
            with self.assertRaisesRegex(ValueError, "size"):
                verify_source(path, source)
            link = Path(tmp) / "link.gz"
            link.symlink_to(path)
            with self.assertRaisesRegex(ValueError, "symlink"):
                verify_source(link, source)


if __name__ == "__main__":
    unittest.main()
