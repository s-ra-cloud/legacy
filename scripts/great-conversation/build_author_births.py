#!/usr/bin/env python3
"""Build a separate, source-attributed SQLite birth catalogue and browser projection.

Network enrichment is explicit (--refresh). Never reads/writes the application DB.
Only unambiguous exact label/alias matches to human Wikidata entities are accepted.
Missing/ambiguous/disputed dates stay NULL, never invented or sorted as year zero.
"""
import argparse
import datetime
import json
from pathlib import Path
import re
import sqlite3
import time
import unicodedata
import urllib.parse
import urllib.request
from author_metadata import apply_metadata, load as load_metadata

ROOT = Path(__file__).resolve().parents[2]
DATA = ROOT / "artifacts/legacy/client/app/lib/data"
DB = ROOT / "scripts/great-conversation/data/author-births.sqlite"
VARIANTS = json.loads((ROOT / "scripts/great-conversation/data/author-name-variants.json").read_text())


def normalize(name):
    name = unicodedata.normalize("NFKD", name).casefold()
    return re.sub(r"[^a-z0-9]", "", "".join(c for c in name if not unicodedata.combining(c)))


def display_name(name):
    if name in VARIANTS:
        return VARIANTS[name]
    parts = name.split(",", 1)
    return f"{parts[1].strip()} {parts[0].strip()}" if len(parts) == 2 else name


def batch_births(nodes):
    """Batched exact labels avoid hundreds of search API requests/rate limits."""
    matches = {}
    for offset in range(0, len(nodes), 35):
        batch = nodes[offset:offset + 35]
        names = {display_name(n["name"]) for n in batch if "N.N." not in n["name"] and "?" not in n["name"]}
        literals = " ".join(json.dumps(name, ensure_ascii=False) + "@" + lang
                            for name in sorted(names) for lang in ("en", "de", "fr", "la"))
        query = """SELECT DISTINCT ?person ?label ?birth ?precision ?articleTitle WHERE {
          VALUES ?label { %s }
          ?person rdfs:label ?label; wdt:P31 wd:Q5; p:P569 ?s.
          ?s ps:P569 ?birth; psv:P569 ?v; wikibase:rank ?rank.
          FILTER (?rank != wikibase:DeprecatedRank)
          FILTER (?rank = wikibase:PreferredRank ||
             NOT EXISTS { ?person p:P569/wikibase:rank wikibase:PreferredRank })
          ?v wikibase:timePrecision ?precision.
          OPTIONAL { ?article schema:about ?person; schema:isPartOf <https://en.wikipedia.org/>; schema:name ?articleTitle. }
        }""" % literals
        url = "https://query.wikidata.org/sparql?" + urllib.parse.urlencode({"query": query, "format": "json"})
        req = urllib.request.Request(url, headers={"User-Agent": "LegacyScholarlyCatalogue/1.0"})
        with urllib.request.urlopen(req, timeout=90) as response:
            bindings = json.load(response)["results"]["bindings"]
        for b in bindings:
            name = normalize(b["label"]["value"])
            matches.setdefault(name, []).append(b)
        print(f"Birth source batch {offset // 35 + 1}/{(len(nodes) + 34) // 35}", flush=True)
        time.sleep(1)
    output = []
    for node in nodes:
        base = dict(id=node["id"], name=node["name"], birthYear=None, birthDate=None,
                    precision="unknown", sourceUrl=None, status="unknown")
        rows = matches.get(normalize(display_name(node["name"])), [])
        ids = {r["person"]["value"] for r in rows}
        # An exact canonical English encyclopedia title can distinguish the main
        # biographical entry from other humans sharing its multilingual label.
        # Do not rank by search position, popularity, or guessed occupation.
        canonical = {r["person"]["value"] for r in rows
                     if normalize(r.get("articleTitle", {}).get("value", "")) == normalize(display_name(node["name"]))}
        if len(ids) > 1 and len(canonical) == 1:
            ids = canonical
            rows = [r for r in rows if r["person"]["value"] in ids]
        if len(ids) > 1:
            base["status"] = "ambiguous"
        elif len(ids) == 1:
            base["sourceUrl"] = next(iter(ids)).replace("http://www.wikidata.org/entity/", "https://www.wikidata.org/wiki/")
            dates = {(r["birth"]["value"], int(r["precision"]["value"])) for r in rows
                     if int(r["precision"]["value"]) >= 9}
            if len(dates) > 1:
                base["status"] = "disputed"
            elif len(dates) == 1:
                date, precision = next(iter(dates))
                match = re.match(r"(-?)(\d+)-", date)
                if match:
                    year = int(match[2]) * (-1 if match[1] else 1)
                    # XML Schema/SPARQL uses astronomical BCE numbering;
                    # convert to historical BCE years (no year zero).
                    if year <= 0:
                        year -= 1
                    base.update(birthYear=year, birthDate=date.split("T")[0],
                                precision="day" if precision >= 11 else "month" if precision == 10 else "year",
                                status="source-matched")
        output.append(base)
    return output


def build(refresh=False):
    nodes = json.loads((DATA / "gc-wab.json").read_text())["people"]["nodes"]
    site_file = ROOT / "scripts/great-conversation/data/scholarly-author-births.json"
    site_records = json.loads(site_file.read_text()) if site_file.exists() else []
    references = load_references({n["id"] for n in nodes} | {r["id"] for r in site_records})
    identity_audit = load_identity_audit({n["id"] for n in nodes})
    DB.parent.mkdir(parents=True, exist_ok=True)
    con = sqlite3.connect(DB)
    con.execute("""CREATE TABLE IF NOT EXISTS author_births (
        id TEXT PRIMARY KEY, name TEXT NOT NULL, birth_year INTEGER,
        birth_date TEXT, precision TEXT NOT NULL, source_url TEXT,
        status TEXT NOT NULL, retrieved_at TEXT NOT NULL)""")
    existing = {r[0] for r in con.execute("SELECT id FROM author_births")}
    pending = nodes if refresh else [n for n in nodes if n["id"] not in existing]
    if pending:
        resolved = batch_births(pending)
        now = datetime.datetime.now(datetime.timezone.utc).date().isoformat()
        with con:
            for record in resolved:
                con.execute("""INSERT INTO author_births
                    (id, name, birth_year, birth_date, precision, source_url, status, retrieved_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    ON CONFLICT(id) DO UPDATE SET name=excluded.name, birth_year=excluded.birth_year,
                    birth_date=excluded.birth_date, precision=excluded.precision,
                    source_url=excluded.source_url, status=excluded.status,
                    retrieved_at=excluded.retrieved_at""",
                    (record["id"], record["name"], record["birthYear"], record["birthDate"],
                     record["precision"], record["sourceUrl"], record["status"], now))
    # Existing scholarly identities are explicit site-record facts, not fuzzy
    # merges with the archive. Keep their own IDs and declared date precision.
    if site_records:
        with con:
            for r in site_records:
                con.execute("""INSERT INTO author_births
                    (id, name, birth_year, birth_date, precision, source_url, status, retrieved_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    ON CONFLICT(id) DO UPDATE SET name=excluded.name, birth_year=excluded.birth_year,
                    birth_date=excluded.birth_date, precision=excluded.precision,
                    source_url=excluded.source_url, status=excluded.status,
                    retrieved_at=excluded.retrieved_at""",
                    (r["id"], r["name"], r["birthYear"], str(r["birthYear"]), "year",
                     None, "site-record", r["retrievedAt"]))
    # Research decisions (including explicit NULLs) survive source refreshes.
    # Keep explanations in both stores, not just in the maintainer input.
    columns = {r[1] for r in con.execute("PRAGMA table_info(author_births)")}
    with con:
        for column in ("note", "evidence_urls"):
            if column not in columns:
                con.execute(f"ALTER TABLE author_births ADD COLUMN {column} TEXT")
        # Exact labels and encyclopedia titles are not identity evidence. Apply
        # the reviewed, ID-specific entity pins to old rows AND refresh results.
        # New or changed matches remain undated until explicitly reviewed.
        for identity, year, source in con.execute(
                "SELECT id, birth_year, source_url FROM author_births WHERE status='source-matched'").fetchall():
            expected = identity_audit.get(identity)
            if (not expected or source != f"https://www.wikidata.org/wiki/{expected}" or
                    year is None or year == 0 or year > 1951):
                con.execute("""UPDATE author_births SET birth_year=NULL, birth_date=NULL,
                    precision='unknown', status='ambiguous', note=?, evidence_urls='[]'
                    WHERE id=?""",
                    ("The automatic name match is not approved for this archive identity, "
                     "or contradicts its historical context. A shared label is insufficient evidence.", identity))
        for r in references:
            year = r["birthYear"]
            date = r.get("birthDate", str(year) if year is not None else None)
            con.execute("""UPDATE author_births SET birth_year=?, birth_date=?,
                precision=?, source_url=?, status=?, retrieved_at=?, note=?, evidence_urls=?
                WHERE id=?""", (year, date, r["precision"], r["sourceUrl"],
                                r.get("status", "reference-source"), r["retrievedAt"],
                                r["note"], json.dumps(r.get("evidenceUrls", [])), r["id"]))
    con.row_factory = sqlite3.Row
    rows = [dict(row) for row in con.execute("SELECT * FROM author_births ORDER BY id")]
    projection = [{
        "id": r["id"], "name": r["name"], "birthYear": r["birth_year"],
        "birthDate": r["birth_date"], "precision": r["precision"],
        "sourceUrl": r["source_url"], "status": r["status"], "retrievedAt": r["retrieved_at"],
        **({"note": r["note"], "evidenceUrls": json.loads(r["evidence_urls"] or "[]")}
           if r["note"] else {}),
    } for r in rows]
    projection = apply_metadata(con, projection)
    references = [{
        "id": key, "name": value["name"], "role": value["role"],
        "roleBasis": value["basis"], "roleStatus": value.get("status", "reference-assessment"),
        "roleSourceUrl": value.get("sourceUrl"),
    } for key, value in load_metadata("author-role-overrides.json", {}).items() if value.get("name")]
    (DATA / "gc-author-role-references.json").write_text(json.dumps(references, ensure_ascii=False, indent=2) + "\n")
    (DATA / "gc-author-births.json").write_text(json.dumps(projection, ensure_ascii=False, indent=2) + "\n")
    con.close()
    print(f"Catalogue: {len(projection)} entries, "
          f"{sum(r['birthYear'] is not None for r in projection)} dated or explicitly estimated; "
          f"{sum(r['birthYear'] is None for r in projection)} undated/group placeholders.", flush=True)


def load_references(known_ids):
    """Reject broken research inputs before touching the existing catalogue."""
    records, seen = [], set()
    for filename in ("reference-author-births.json", "author-birth-research.json", "author-birth-corrections.json"):
        path = ROOT / "scripts/great-conversation/data" / filename
        if not path.exists():
            continue
        for r in json.loads(path.read_text()):
            identity = r["id"]
            if identity not in known_ids or identity in seen:
                raise ValueError(f"Unknown or duplicate reference identity: {identity}")
            seen.add(identity)
            year = r["birthYear"]
            status = r.get("status", "reference-source")
            precision = r["precision"]
            if year is None:
                if (r.get("birthDate") is not None or precision != "unknown" or
                        status not in {"unknown", "ambiguous", "disputed", "unidentified",
                                       "group", "fictional", "legendary", "invalid-record"}):
                    raise ValueError(f"Invalid undated research record: {identity}")
            elif (type(year) is not int or year == 0 or status != "reference-source" or
                  precision not in {"year", "approximate-year", "month", "day"}):
                raise ValueError(f"Invalid sourced birth: {identity}")
            date = r.get("birthDate")
            if date is not None:
                pattern = {"day": r"-?\d+-\d{2}-\d{2}", "month": r"-?\d+-\d{2}",
                           "year": r"-?\d+", "approximate-year": r"-?\d+"}.get(precision)
                if not pattern or not re.fullmatch(pattern, date):
                    raise ValueError(f"Birth date does not match precision: {identity}")
                if int(re.match(r"-?\d+", date)[0]) != year:
                    raise ValueError(f"Birth date does not match year: {identity}")
            elif precision in {"month", "day"}:
                raise ValueError(f"Missing precise birth date: {identity}")
            for url in [r["sourceUrl"], *r.get("evidenceUrls", [])]:
                parsed = urllib.parse.urlparse(url)
                if parsed.scheme not in {"http", "https"} or not parsed.netloc:
                    raise ValueError(f"Invalid reference URL: {identity}")
            datetime.date.fromisoformat(r["retrievedAt"])
            if not r.get("note", "").strip():
                raise ValueError(f"Missing research explanation: {identity}")
            records.append(r)
    return records


def load_identity_audit(known_ids):
    path = ROOT / "scripts/great-conversation/data/author-identity-audit.json"
    if not path.exists():
        return {}
    audit = json.loads(path.read_text())
    datetime.date.fromisoformat(audit["reviewedAt"])
    if not audit.get("method", "").strip():
        raise ValueError("Missing identity audit method")
    for identity, entity in audit["approved"].items():
        if identity not in known_ids or not re.fullmatch(r"Q[1-9]\d*", entity):
            raise ValueError(f"Invalid approved identity: {identity}")
    return audit["approved"]


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--refresh", action="store_true", help="Re-query public Wikidata birth statements")
    build(parser.parse_args().refresh)
