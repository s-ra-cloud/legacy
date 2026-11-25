"""Build the small, read-only graph snapshot from the supplied WAB archive.

Does not execute archive scripts, extract full texts, or change any database.
"""
import csv
import io
import json
import re
from pathlib import Path
import sys
import zipfile


DATE_CATALOGUE = Path(__file__).parent / "data/work-publication-years.json"


def apply_publication_dates(nodes, works):
    """Join curated evidence by exact archive ID, never by fuzzy title/author."""
    records = json.loads(DATE_CATALOGUE.read_text())["works"]
    ids = {n["id"] for n in nodes}
    if set(records) - ids:
        raise ValueError("Publication catalogue contains unknown graph IDs")
    for node in nodes:
        work = works[node["id"]]
        record = records.get(node["id"])
        if record is None:
            raise ValueError(f"Missing date assessment: {node['id']}")
        if record["status"] == "supported":
            if not record["sources"] or not record["year"]:
                raise ValueError(f"Date lacks evidence: {node['id']}")
            node["publicationYear"] = record["year"]
        elif record["status"] == "unknown":
            node.pop("publicationYear", None)
        else:
            raise ValueError(f"Invalid date status: {node['id']}")
        node["publicationDate"] = record
        # Preserve the supplied date even when it describes writing/performance.
        if work["date"]:
            node["archiveDate"] = work["date"]
        label = record["year"] or "Year unknown"
        node["detail"] = f"{record['kind'].replace('_', ' ').capitalize()}: {label}. {record['note']}"


def build(path):
    with zipfile.ZipFile(path) as archive:
        def rows(name):
            return list(csv.DictReader(io.StringIO(archive.read(name).decode("utf-8-sig"))))

        people = {r["person_id"]: r for r in rows("people.csv")}
        works = {r["work_id"]: r for r in rows("works.csv")}
        evidence = {r["evidence_id"]: r for r in rows("evidence.csv")}

        def edge(row, kind, uncertain):
            stance = row.get("aggregated_stance", row.get("aggregated_stance_toward_person_or_claims"))
            assert stance in {"approval", "disapproval", "neutral", "mixed", "insufficient_evidence"}
            ids = row["evidence_ids"].split(";")
            sources = list(dict.fromkeys(evidence[i]["source_url"] for i in ids if i in evidence and evidence[i]["source_url"]))
            return {
                "source": row[f"source_{kind}_id"],
                "target": row[f"target_{kind}_id"],
                "stance": stance,
                "uncertain": uncertain or stance == "insufficient_evidence",
                "status": row.get("edge_status", row.get("review_status")),
                "confidence": float(row["confidence"]) if row["confidence"] else None,
                "occurrences": int(row["occurrence_count"]),
                "summary": row["evidence_summary"],
                "evidenceIds": ids,
                "sourceUrls": sources,
            }

        person_edges = [
            edge(r, "person", r["edge_status"] != "confirmed_text_reviewed")
            for r in rows("person_edges.csv")
            if r["edge_status"] in {"confirmed_text_reviewed", "metadata_only_unverified"}
        ]
        work_edges = [edge(r, "work", False) for r in rows("work_edges_confirmed.csv")]
        work_edges += [
            edge(r, "work", True)
            for r in rows("work_edges_candidates.csv")
            if r["edge_status"] == "unverified"
        ]

        def graph(edges, lookup, key):
            ids = sorted({e[end] for e in edges for end in ("source", "target")})
            assert all(i in lookup for i in ids), "Unresolved graph endpoint"
            nodes = [{"id": i, "name": lookup[i][key]} for i in ids]
            return {"nodes": nodes, "links": edges}

        work_graph = graph(work_edges, works, "title")
        for node in work_graph["nodes"]:
            work = works[node["id"]]
            author_names = [
                people[person_id.strip()]["name"].strip()
                for person_id in work["author_person_ids"].split(";")
                if person_id.strip() in people
            ]
            def surname(name):
                if "," in name:
                    return name.split(",", 1)[0].strip()
                if name.startswith("["):
                    return name.strip("[]")
                parts = name.split()
                start = len(parts) - 1
                while start > 0 and parts[start - 1].casefold() in {"van", "von", "de", "da", "del", "der", "den", "la", "a", "of"}:
                    start -= 1
                return " ".join(parts[start:])
            surnames = list(dict.fromkeys(surname(name) for name in author_names))
            node["authorSurname"] = " / ".join(surnames) or "Unknown author"
            title = work["title"].strip()
            # Some items filed under Wittgenstein are memoirs/edited recollections.
            # Preserve their explicit title credit instead of labelling the
            # memoir's author as its subject.
            credit = re.match(r"^([\w ’'-]+),\s*([A-Z][\w .:'’-]*?):\s+(.+)$", title)
            if work["work_type"] == "wittgenstein_published_work" and credit:
                node["authorSurname"] = credit.group(1).strip()
                title = credit.group(3).strip()
            prefix, separator, remainder = title.partition(":")
            normalize = lambda value: re.sub(r"\W", "", value).casefold()
            # Strip a recorded author prefix, not an arbitrary title subtitle.
            if separator and normalize(prefix) in {normalize("; ".join(author_names)), *(normalize(n) for n in author_names)}:
                title = remainder.strip()
            node["workTitle"] = title or "Untitled work"
            # The archive date can describe lectures/manuscripts rather than
            # publication. Prefer an explicitly recorded edition year.
            edition_text = work["edition"] or work["title"]
            edition_year = re.search(r"\beds?\.\s*(\d{4})", edition_text, re.I)
            bibliographic_year = re.search(r"\([A-Z][A-Z0-9/]*,\s*(\d{4})", edition_text)
            printed_year = re.search(r"printed.*?\((\d{4})\)", edition_text, re.I)
            preferred = edition_year or bibliographic_year or printed_year
            if preferred or work["date"].strip():
                node["publicationYear"] = preferred.group(1) if preferred else work["date"].strip()

        apply_publication_dates(work_graph["nodes"], works)
        return {
            "snapshot": "2026-11-10",
            "attribution": "Wittgenstein Archives at the University of Bergen (WAB) / Bergen Nachlass Edition",
            "reviewNotice": "Archive-derived references; all stance classifications are AI judgments, not human-verified. Text-confirmed does not mean scholarly-verified. Stances may concern particular claims rather than whole works.",
            "people": graph(person_edges, people, "name"),
            "works": work_graph,
        }


if __name__ == "__main__":
    result = build(sys.argv[1])
    destination = Path("artifacts/legacy/client/app/lib/data/gc-wab.json")
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_text(json.dumps(result, ensure_ascii=False, separators=(",", ":")) + "\n")
    for kind in ("people", "works"):
        print(kind, len(result[kind]["nodes"]), "nodes;", len(result[kind]["links"]), "links")
