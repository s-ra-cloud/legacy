#!/usr/bin/env python3
"""Owner-approved modelling estimates, NEVER asserted to be known birth dates.

For otherwise undated individual records: use the earliest available dated
authored work or dated Nachlass mention, minus an explicitly assumed age of 30.
If neither exists, use the corpus date-range midpoint minus 30. Group placeholders
stay undated. Existing sourced dates and source-range estimates are preserved.
"""
import csv
import io
import json
from pathlib import Path
import re
import zipfile
from author_metadata import build_roles, load

ROOT = Path(__file__).resolve().parents[2]
DATA = ROOT / "scripts/great-conversation/data"
SNAPSHOT = ROOT / "artifacts/legacy/client/app/lib/data/gc-author-births.json"


def years(text):
    return [int(v) for v in re.findall(r"(?<!\d)(?:18|19|20)\d{2}(?!\d)", text or "") if int(v) <= 1951]


def build():
    rows = json.loads(SNAPSHOT.read_text())
    roles = build_roles(rows)
    with zipfile.ZipFile(ROOT / "attached_assets/legacy_wab_deliverables2_1794351123169.zip") as archive:
        def table(name):
            return list(csv.DictReader(io.StringIO(archive.read(name).decode())))
        remarks = table("nachlass_remarks.csv")
        evidence = table("evidence.csv")
        works = table("works.csv")
    dates = {r["remark_id"]: years(r["dates"]) for r in remarks}
    corpus_years = [y for values in dates.values() for y in values]
    if not corpus_years:
        raise ValueError("No dated archive evidence; refusing to invent an undated fallback period.")
    references = {}
    for item in evidence:
        observed = dates.get(item["remark_id"], [])
        if not observed:
            continue
        person = item["target_person_id"]
        if person:
            references.setdefault(person, []).append((min(observed), item["source_url"], "dated archive mention"))
    for work in works:
        # Book publication may predate a later archive mention. Record this
        # explicitly as an assumption, not a biographical deduction.
        if work["work_type"] not in ("external_work", "wittgenstein_published_work"):
            continue
        observed = years(work["date"])
        for person in work["author_person_ids"].split(";"):
            if observed and person.strip():
                references.setdefault(person.strip(), []).append((min(observed), work["authority_uri"], "dated authored work (the recorded edition may be later than first publication)"))
    estimates = load("author-date-estimates.json", {})
    for row in rows:
        if row["birthYear"] is not None or roles[row["id"]]["status"] == "non-person":
            continue
        observations = references.get(row["id"], [])
        if observations:
            year, url, origin = min(observations)
            basis = f"Provisional placement, not a known birth year: earliest available {origin} in {year}, minus an assumed age of 30. Identity and age are not established by this model."
        else:
            year = round((min(corpus_years) + max(corpus_years)) / 2)
            url = "https://wab.uib.no/"
            basis = f"Provisional placement, not a known birth year: midpoint of the supplied archive's dated record range ({min(corpus_years)}–{max(corpus_years)}), {year}, minus an assumed age of 30. No person-specific dated evidence was available; this is only a layout placeholder."
        estimates[row["id"]] = {"year": year - 30, "sourceUrl": url, "basis": basis, "kind": "placement"}
    (DATA / "author-date-estimates.json").write_text(json.dumps(estimates, ensure_ascii=False, indent=2) + "\n")
    print(f"Stored {sum(e.get('kind') == 'placement' for e in estimates.values())} explicitly provisional placement estimates.")


if __name__ == "__main__":
    build()
