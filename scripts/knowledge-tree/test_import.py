import importlib.util
from pathlib import Path
import unittest

spec = importlib.util.spec_from_file_location("kt_import", Path(__file__).with_name("import.py"))
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

class ImportTests(unittest.TestCase):
    def test_missing_values(self):
        self.assertIsNone(module.clean("NULL"))
        self.assertIsNone(module.clean(""))
        self.assertEqual(module.clean("0"), "0")

    def test_direction_and_affiliation_preserved(self):
        row = dict(cid="5", pid1="4", pid2="0", relation="4", location="Institution")
        mapped = dict(zip(module.SPECS["connect"][1], module.normalize("connect", row)))
        self.assertEqual(mapped["trainee_id"], "4")
        self.assertEqual(mapped["mentor_id"], "0")
        self.assertEqual(mapped["relation"], "4")

    def test_publication_shard_missing_optional_column(self):
        row = dict(pubid="15000000", pid="10", score_total="0.7", score_human="0", pmid="0", doi="NULL", s2id="", citations="NULL")
        mapped = dict(zip(module.SPECS["authorPub"][1], module.normalize("authorPub", row)))
        self.assertIsNone(mapped["score_coa"])
        self.assertIsNone(mapped["doi"])
        self.assertEqual(mapped["pubid"], "15000000")

    def test_unnamed_source_researchers_are_not_discarded(self):
        row = dict(pid="12", firstname="NULL", middlename="", lastname="NULL")
        mapped = dict(zip(module.SPECS["people"][1], module.normalize("people", row)))
        self.assertEqual(mapped["pid"], "12")
        self.assertEqual(mapped["full_name"], "")

    def test_grant_key_is_repeatable_and_preserves_distinct_applications(self):
        row = dict(grantid="3", pid="7", APPLICATION_ID="12")
        first = module.normalize("peopleGrant", row)
        self.assertEqual(first, module.normalize("peopleGrant", dict(reversed(list(row.items())))))
        self.assertNotEqual(first[0], module.normalize("peopleGrant", {**row, "APPLICATION_ID":"13"})[0])

    def test_copy_escaping(self):
        self.assertEqual(module.copy_cell(None), "\\N")
        self.assertEqual(module.copy_cell("a\tb\n\\."), "a\\tb\\n\\\\.")

    def test_missing_association_identifiers_are_rejected_before_copy(self):
        for kind, row in [
            ("authorPub", {"pubid": "1", "pid": "NULL"}),
            ("authorPub", {"pubid": "", "pid": "3"}),
            ("peopleGrant", {"grantid": "1", "pid": "\\N"}),
        ]:
            with self.subTest(kind=kind, row=row):
                with self.assertRaisesRegex(ValueError, "Missing required identifier"):
                    module.normalize(kind, row)

if __name__ == "__main__":
    unittest.main()
