"""Source-attributed roles and estimated dates in the SAME SQLite catalogue.

The binary role is a catalogue classification, not a claim that absence of book
evidence proves non-authorship. Provisional exclusions retain an explicit status.
"""
import csv
import io
import json
from pathlib import Path
import zipfile

ROOT = Path(__file__).resolve().parents[2]
DATA = ROOT / "scripts/great-conversation/data"


def load(name, default):
    path = DATA / name
    return json.loads(path.read_text()) if path.exists() else default


def archive_books():
    approved = set(load("author-book-work-ids.json", []))
    path = ROOT / "attached_assets/legacy_wab_deliverables2_1794351123169.zip"
    with zipfile.ZipFile(path) as archive:
        works = list(csv.DictReader(io.StringIO(archive.read("works.csv").decode())))
    found = {}
    available = {w["work_id"] for w in works}
    missing = approved - available
    if missing:
        raise ValueError(f"Approved archive book IDs no longer resolve: {sorted(missing)}")
    for work in works:
        if work["work_id"] not in approved:
            continue
        for person in work["author_person_ids"].split(";"):
            found[person.strip()] = {
                "role": "author", "basis": "Book or book-length collected text: " + work["title"],
                "status": "archive-book", "sourceUrl": work["authority_uri"],
            }
    return found


def build_roles(rows):
    facts = load("author-role-evidence.json", {})
    overrides = load("author-role-overrides.json", {})
    books = archive_books()
    book_assessments = load("author-book-assessments.json", {})
    scholarly = {r["id"] for r in load("scholarly-author-births.json", [])}
    roles = {}
    for row in rows:
        source = row.get("sourceUrl") or ""
        evidence = facts.get(source.rsplit("/", 1)[-1], {})
        occupations = set(evidence.get("occupations", {}).values())
        role = {
            "role": "non-author", "status": "provisional",
            "basis": "No qualifying book or taught doctrine has yet been documented; this does not prove non-authorship.",
            "sourceUrl": source or None,
        }
        if evidence.get("books"):
            book_id, title = sorted(evidence["books"].items())[0]
            role = {"role": "author", "status": "bibliographic-source",
                    "basis": "Authored book: " + title,
                    "sourceUrl": "https://www.wikidata.org/wiki/" + book_id}
        elif "philosopher" in occupations:
            role = {"role": "author", "status": "doctrine-assessment",
                    "basis": "Recognized philosophical doctrine; the source identifies this individual as a philosopher. Oral teaching qualifies.",
                    "sourceUrl": source}
        elif "novelist" in occupations:
            role = {"role": "author", "status": "bibliographic-assessment",
                    "basis": "The source identifies this individual as a novelist (author of book-length fiction).",
                    "sourceUrl": source}
        if row["id"] in books:
            role = books[row["id"]]
        if row["id"] in book_assessments:
            role = {"role": "author", "status": "bibliographic-assessment",
                    "basis": "Book attribution (catalogue assessment, not independently reviewed): " + book_assessments[row["id"]],
                    "sourceUrl": source or None}
        if row["id"] in scholarly:
            role = {"role": "author", "status": "book-record",
                    "basis": "Author of a book in the platform's scholarly catalogue.", "sourceUrl": None}
        if row["id"] in overrides:
            role = {"status": "reference-assessment", **overrides[row["id"]]}
        if row["status"] in {"group", "fictional", "legendary", "invalid-record"}:
            role = {"role": "non-author", "status": "non-person",
                    "basis": row.get("note") or "Not an identified historical individual.",
                    "sourceUrl": source or None}
        roles[row["id"]] = role
    # Store the user's oral-teacher example even if not present in the graph.
    for key, value in overrides.items():
        if key not in roles and value.get("name"):
            roles[key] = {"status": "reference-assessment", **value}
    return roles


def apply_metadata(con, projection):
    supplements = load("source-birth-supplements.json", {})
    # Sourced biographical dates take priority over modelling placements. Only
    # fill genuinely absent dates; never replace an existing known date.
    with con:
        for row in projection:
            supplement = supplements.get(row["id"])
            if row["birthYear"] is None and supplement and not row.get("note"):
                con.execute("""UPDATE author_births SET birth_year=?, birth_date=?,
                    precision=?, source_url=?, status=? WHERE id=? AND birth_year IS NULL""",
                    (supplement["birthYear"], supplement["birthDate"], supplement["precision"],
                     supplement["sourceUrl"], supplement["status"], row["id"]))
                row.update({k: supplement[k] for k in ("birthYear", "birthDate", "precision", "sourceUrl", "status")})
                if supplement["precision"] == "approximate-year":
                    row["estimateBasis"] = supplement["basis"]
            elif (supplement and row["birthYear"] == supplement["birthYear"]
                  and row["sourceUrl"] == supplement["sourceUrl"]
                  and row["precision"] == "approximate-year"):
                row["estimateBasis"] = supplement["basis"]
    roles = build_roles(projection)
    con.execute("""CREATE TABLE IF NOT EXISTS author_roles (
        id TEXT PRIMARY KEY, role TEXT NOT NULL CHECK(role IN ('author','non-author')),
        basis TEXT NOT NULL, status TEXT NOT NULL, source_url TEXT)""")
    con.execute("""CREATE TABLE IF NOT EXISTS author_date_estimates (
        id TEXT PRIMARY KEY, estimated_year INTEGER NOT NULL, basis TEXT NOT NULL,
        source_url TEXT, lower_year INTEGER, upper_year INTEGER,
        kind TEXT NOT NULL DEFAULT 'source-range')""")
    if "kind" not in {row[1] for row in con.execute("PRAGMA table_info(author_date_estimates)")}:
        con.execute("ALTER TABLE author_date_estimates ADD COLUMN kind TEXT NOT NULL DEFAULT 'source-range'")
    estimates = load("author-date-estimates.json", {})
    with con:
        for key, role in roles.items():
            con.execute("""INSERT INTO author_roles VALUES (?, ?, ?, ?, ?)
                ON CONFLICT(id) DO UPDATE SET role=excluded.role, basis=excluded.basis,
                status=excluded.status, source_url=excluded.source_url""",
                (key, role["role"], role["basis"], role["status"], role.get("sourceUrl")))
        for key, estimate in estimates.items():
            if not isinstance(estimate["year"], int) or estimate["year"] == 0 or not estimate.get("basis"):
                raise ValueError(f"Invalid estimate {key}")
            con.execute("""INSERT INTO author_date_estimates
                (id, estimated_year, basis, source_url, lower_year, upper_year, kind)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(id) DO UPDATE SET estimated_year=excluded.estimated_year,
                basis=excluded.basis, source_url=excluded.source_url,
                lower_year=excluded.lower_year, upper_year=excluded.upper_year, kind=excluded.kind""",
                (key, estimate["year"], estimate["basis"], estimate.get("sourceUrl"),
                 estimate.get("lowerYear"), estimate.get("upperYear"), estimate.get("kind", "source-range")))
    for row in projection:
        profile = roles[row["id"]]
        row.update(role=profile["role"], roleBasis=profile["basis"],
                   roleStatus=profile["status"], roleSourceUrl=profile.get("sourceUrl"))
        # Never replace a sourced date with a modelling estimate.
        if (row["birthYear"] is None and row["id"] in estimates
                and profile["status"] != "non-person"):
            estimate = estimates[row["id"]]
            # Keep the researched factual outcome available separately from
            # the explicitly labelled display placement approved by the user.
            row["birthEvidence"] = {key: row[key] for key in (
                "id", "name", "birthYear", "birthDate", "precision", "sourceUrl",
                "status", "retrievedAt", "note", "evidenceUrls") if key in row}
            row.update(birthYear=estimate["year"], birthDate=None, precision="approximate-year",
                       sourceUrl=estimate.get("sourceUrl"), status="placement-estimate" if estimate.get("kind") == "placement" else "estimated",
                       estimateBasis=estimate["basis"], estimateLowerYear=estimate.get("lowerYear"),
                       estimateUpperYear=estimate.get("upperYear"))
    return projection
