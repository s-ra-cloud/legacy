"""Offline checks for researched identities and the separate SQLite projection."""
import contextlib
import copy
import io
import json
from pathlib import Path
import sqlite3
import tempfile
import unittest
from unittest.mock import patch

import build_author_births as births


ROOT = Path(__file__).resolve().parents[2]
INPUTS = ROOT / "scripts/great-conversation/data"
PROJECTION = ROOT / "artifacts/legacy/client/app/lib/data/gc-author-births.json"


def factual(row):
    """Display placement estimates never replace the researched birth outcome."""
    return row.get("birthEvidence", row)


class ResearchCatalogueTests(unittest.TestCase):
    def test_entire_research_scope_has_an_evidence_backed_outcome(self):
        audit = json.loads((INPUTS / "author-birth-research.json").read_text())
        catalogue = json.loads(PROJECTION.read_text())
        by_id = {r["id"]: factual(r) for r in catalogue}
        self.assertEqual(len(audit), 65)
        self.assertEqual(len({r["id"] for r in audit}), 65)
        self.assertEqual(len(by_id), 341)
        self.assertEqual(sum(r["birthYear"] is not None for r in audit), 35)
        for r in audit:
            projected = by_id[r["id"]]
            for field in ("birthYear", "precision", "sourceUrl", "retrievedAt", "note"):
                self.assertEqual(projected[field], r[field], (r["id"], field))
            self.assertEqual(projected["status"], r.get("status", "reference-source"))
            self.assertTrue(r["note"].strip())
        self.assertEqual(sum(factual(r)["birthYear"] is not None for r in catalogue), 298)

    def test_inherited_identity_audit_and_collision_regressions(self):
        audit = json.loads((INPUTS / "author-identity-audit.json").read_text())
        corrections = json.loads((INPUTS / "author-birth-corrections.json").read_text())
        by_id = {r["id"]: factual(r) for r in json.loads(PROJECTION.read_text())}
        self.assertEqual(len(audit["approved"]), 255)
        self.assertEqual(len(set(audit["approved"]) | {r["id"] for r in corrections}), 268)
        for r in corrections:
            for field in ("birthYear", "precision", "sourceUrl", "note"):
                self.assertEqual(by_id[r["id"]][field], r[field], (r["id"], field))
        for identity, year in {
                "Kleist__Heinrich_von": 1777, "Macaulay__Thomas": 1800,
                "Heinrich_IV": 1553, "Moore__Dorothy": 1892}.items():
            self.assertEqual(by_id[identity]["birthYear"], year)
        for identity in (
                "Edward_II", "Moore__Timothy", "Cox__Christopher", "Dobson__Frank",
                "Herrmann__Rosalie", "Jolles__Adele", "O'Hara__Charles",
                "Sjögren__Arvid", "Taylor__James", "Fermat__Pierre_de",
                "Livius__Titus", "Duncan__Isadora", "Paulus_von_Tarsus"):
            self.assertIsNone(by_id[identity]["birthYear"], identity)
            self.assertIsNone(by_id[identity]["birthDate"], identity)
        for r in by_id.values():
            if r["status"] == "source-matched":
                self.assertEqual(r["sourceUrl"],
                                 "https://www.wikidata.org/wiki/" + audit["approved"][r["id"]])
                self.assertLessEqual(r["birthYear"], 1951)
        for identity in ("Heraklit", "Hermann_der_Cherusker", "Ockham__Wilhelm_von",
                         "Zenon_von_Elea", "Servetus__Michael", "Molière"):
            self.assertEqual(by_id[identity]["precision"], "approximate-year")
        for identity in ("Beethoven__Ludwig_van", "Cervantes__Miguel_de", "Shakespeare__William"):
            self.assertEqual(by_id[identity]["precision"], "year")
            self.assertNotIn("-", by_id[identity]["birthDate"])

    def test_uncertainty_and_non_persons_never_acquire_dates(self):
        by_id = {r["id"]: factual(r) for r in json.loads(PROJECTION.read_text())}
        for identity, status in {
            "Bachtin__Nicholas": "disputed", "Attila": "disputed",
            "Karl_der_Grosse": "disputed", "Jesus_von_Nazaret": "disputed",
            "Thomas_a_Kempis": "disputed", "Raven__Canon": "ambiguous",
            "Bolstad__Johannes_Johannesson": "ambiguous", "Hunt__E.B.": "ambiguous",
            "Earl_of_Gloucester": "fictional", "Sibylle_von_Cumae": "legendary",
            "Grimm__Jacob;_Grimm__Wilhelm": "group", "instances": "invalid-record",
            "Richards__?": "unidentified",
        }.items():
            row = by_id[identity]
            self.assertEqual(row["status"], status)
            self.assertIsNone(row["birthYear"])
            self.assertIsNone(row["birthDate"])
        self.assertEqual(by_id["Euklid"]["precision"], "approximate-year")
        self.assertEqual(by_id["Pythagoras_von_Samos"]["birthYear"], -570)
        self.assertEqual(by_id["Fox__George"]["birthDate"], "1624-07")
        self.assertEqual(by_id["Wittgenstein__Paul_(Onkel)"]["birthYear"], 1842)
        for row in by_id.values():
            self.assertNotEqual(row["birthDate"], "None")

    def test_sqlite_and_json_agree_including_research_explanations(self):
        with sqlite3.connect(INPUTS / "author-births.sqlite") as con:
            con.row_factory = sqlite3.Row
            records = {r["id"]: dict(r) for r in con.execute("SELECT * FROM author_births")}
        catalogue = json.loads(PROJECTION.read_text())
        self.assertEqual(set(records), {r["id"] for r in catalogue})
        for r in catalogue:
            r = factual(r)
            db = records[r["id"]]
            self.assertEqual(db["birth_year"], r["birthYear"])
            self.assertEqual(db["birth_date"], r["birthDate"])
            self.assertEqual(db["status"], r["status"])
            self.assertEqual(db["note"], r.get("note"))
            self.assertEqual(json.loads(db["evidence_urls"] or "[]"), r.get("evidenceUrls", []))


class BuilderTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.data = self.root / "artifacts/legacy/client/app/lib/data"
        self.inputs = self.root / "scripts/great-conversation/data"
        self.data.mkdir(parents=True)
        self.inputs.mkdir(parents=True)
        self.db = self.inputs / "author-births.sqlite"
        self.nodes = [{"id": name, "name": name} for name in ("dated", "disputed", "group", "untouched")]
        self.graph = json.dumps({"people": {"nodes": self.nodes}, "works": {"preserve": True}})
        (self.data / "gc-wab.json").write_text(self.graph)
        self.records = [
            dict(id="dated", birthYear=-570, precision="approximate-year",
                 sourceUrl="https://example.org/dated", retrievedAt="2026-11-11", note="About 570 BCE."),
            dict(id="disputed", birthYear=None, precision="unknown", status="disputed",
                 sourceUrl="https://example.org/disputed", retrievedAt="2026-11-11",
                 note="Competing years.", evidenceUrls=["https://example.org/alternative"]),
            dict(id="group", birthYear=None, precision="unknown", status="group",
                 sourceUrl="https://example.org/group", retrievedAt="2026-11-11", note="Joint authors."),
        ]
        self.write_research()
        self.identity_audit = self.inputs / "author-identity-audit.json"
        self.identity_audit.write_text(json.dumps(dict(
            reviewedAt="2026-11-11", method="Fixture identity review",
            approved={n["id"]: "Q5" for n in self.nodes})))
        # Exercise migration of the original eight-column database, with no network.
        with sqlite3.connect(self.db) as con:
            con.execute("""CREATE TABLE author_births (
                id TEXT PRIMARY KEY, name TEXT NOT NULL, birth_year INTEGER,
                birth_date TEXT, precision TEXT NOT NULL, source_url TEXT,
                status TEXT NOT NULL, retrieved_at TEXT NOT NULL)""")
            con.executemany("INSERT INTO author_births VALUES (?, ?, ?, ?, ?, ?, ?, ?)", [
                (n["id"], n["name"], 1900, "1900", "year", None, "site-record", "2026-11-10")
                for n in self.nodes
            ])

    def write_research(self):
        (self.inputs / "author-birth-research.json").write_text(json.dumps(self.records))

    def run_build(self, refresh=False):
        with patch.multiple(births, ROOT=self.root, DATA=self.data, DB=self.db), \
                patch.object(births, "apply_metadata", side_effect=lambda con, rows: rows), \
                patch.object(births, "load_metadata", return_value={}), \
                contextlib.redirect_stdout(io.StringIO()):
            births.build(refresh=refresh)
        return (self.data / "gc-author-births.json").read_bytes()

    def test_old_schema_migration_and_repeat_build_are_lossless(self):
        with patch.object(births, "batch_births", side_effect=AssertionError("Unexpected network")):
            first = self.run_build()
            self.assertEqual(self.run_build(), first)
        rows = {r["id"]: r for r in json.loads(first)}
        self.assertEqual(rows["dated"]["birthDate"], "-570")
        self.assertEqual(rows["disputed"]["note"], "Competing years.")
        self.assertIsNone(rows["group"]["birthDate"])
        self.assertEqual(rows["untouched"]["birthYear"], 1900)
        self.assertEqual((self.data / "gc-wab.json").read_text(), self.graph)

    def test_research_overrides_refresh_including_explicit_unknowns(self):
        refreshed = [
            dict(id=n["id"], name=n["name"], birthYear=1800, birthDate="1800",
                 precision="year", sourceUrl="https://www.wikidata.org/wiki/Q5", status="source-matched")
            for n in self.nodes
        ]
        with patch.object(births, "batch_births", return_value=refreshed):
            first = self.run_build(refresh=True)
        # Also proves INSERT works when the database already has the extra columns.
        with patch.object(births, "batch_births", return_value=refreshed):
            self.assertEqual(self.run_build(refresh=True), first)
        rows = {r["id"]: r for r in json.loads(first)}
        self.assertEqual(rows["dated"]["birthYear"], -570)
        self.assertIsNone(rows["disputed"]["birthYear"])
        self.assertIsNone(rows["group"]["birthYear"])
        self.assertEqual(rows["untouched"]["birthYear"], 1800)

    def test_bad_inputs_fail_before_database_or_projection_changes(self):
        good = copy.deepcopy(self.records)
        invalid = [
            {"id": "not-in-graph"}, {"birthYear": 0}, {"birthYear": True},
            {"precision": "day"}, {"sourceUrl": "not-a-url"},
            {"retrievedAt": "invalid"}, {"note": ""},
            {"birthDate": "-571"}, {"birthYear": None},
        ]
        original = self.db.read_bytes()
        for change in invalid:
            self.records = copy.deepcopy(good)
            self.records[0].update(change)
            self.write_research()
            with self.subTest(change=change), self.assertRaises(ValueError):
                self.run_build()
            self.assertEqual(self.db.read_bytes(), original)
            self.assertFalse((self.data / "gc-author-births.json").exists())
        self.records = good + [copy.deepcopy(good[0])]
        self.write_research()
        with self.assertRaisesRegex(ValueError, "duplicate"):
            self.run_build()

    def test_unreviewed_changed_or_anachronistic_matches_are_withheld(self):
        for source, year, remove_audit in (
                ("https://www.wikidata.org/wiki/Q6", 1800, False),
                ("https://www.wikidata.org/wiki/Q5", 1952, False),
                ("https://www.wikidata.org/wiki/Q5", 1800, True)):
            if remove_audit:
                self.identity_audit.unlink()
            with sqlite3.connect(self.db) as con:
                con.execute("""UPDATE author_births SET birth_year=?, birth_date=?,
                    source_url=?, status='source-matched' WHERE id='untouched'""",
                    (year, str(year), source))
            rows = {r["id"]: r for r in json.loads(self.run_build())}
            with self.subTest(source=source, year=year, remove_audit=remove_audit):
                self.assertIsNone(rows["untouched"]["birthYear"])
                self.assertEqual(rows["untouched"]["status"], "ambiguous")
                self.assertIn("shared label", rows["untouched"]["note"])
            refreshed = [dict(id=n["id"], name=n["name"], birthYear=year,
                              birthDate=str(year), precision="year", sourceUrl=source,
                              status="source-matched") for n in self.nodes]
            with patch.object(births, "batch_births", return_value=refreshed):
                rows = {r["id"]: r for r in json.loads(self.run_build(refresh=True))}
            self.assertIsNone(rows["untouched"]["birthYear"])
            self.assertIsNone(rows["disputed"]["birthYear"])
            self.assertEqual(rows["dated"]["birthYear"], -570)

    def test_invalid_identity_pins_fail_before_writes(self):
        original = self.db.read_bytes()
        for approved in ({"missing": "Q5"}, {"untouched": "not-an-entity"}):
            self.identity_audit.write_text(json.dumps(dict(
                reviewedAt="2026-11-11", method="Invalid fixture", approved=approved)))
            with self.assertRaises(ValueError):
                self.run_build()
            self.assertEqual(self.db.read_bytes(), original)


if __name__ == "__main__":
    unittest.main()
