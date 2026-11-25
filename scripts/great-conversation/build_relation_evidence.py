"""Extract only public, source-supplied review evidence; never execute ZIP scripts."""
import csv
import gzip
import io
import json
from pathlib import Path
import sys
import zipfile

ROOT = Path(__file__).resolve().parents[2]
OUTPUT = ROOT / "artifacts/legacy/client/app/lib/data/gc-relation-evidence.json.gz"


def build(path):
    graph = json.loads((OUTPUT.parent / "gc-wab.json").read_text())
    wanted = {i for kind in ("people", "works") for link in graph[kind]["links"] for i in link["evidenceIds"]}
    with zipfile.ZipFile(path) as archive:
        def rows(name):
            return csv.DictReader(io.StringIO(archive.read(name).decode("utf-8-sig")))
        works = {w["work_id"]: w["title"] for w in rows("works.csv")}
        evidence = {}
        for row in rows("evidence.csv"):
            if row["evidence_id"] not in wanted:
                continue
            evidence[row["evidence_id"]] = {
                "id": row["evidence_id"], "remarkId": row["remark_id"],
                "reference": row["location_id"],
                "sourceWorkTitle": works.get(row["source_work_id"], row["source_work_id"]),
                "targetWorkTitle": works.get(row["target_work_id"], row["target_work_id"]),
                "excerpt": row["exact_text_excerpt"], "excerptMethod": row["excerpt_method"],
                "publishedExcerpt": row["published_excerpt"], "publishedLocator": row["published_excerpt_locator"],
                "targetPassage": row["target_passage"],
                "rationale": row["stance_rationale"], "stance": row["stance"],
                "targetScope": row["stance_target_scope"], "confidence": row["stance_confidence"],
                "workIdentificationBasis": row["work_identification_basis"],
                "referenceType": row["reference_type"], "referenceTypeBasis": row["reference_type_basis"],
                "sourceUrl": row["source_url"], "accessDate": row["access_date"],
                "textStatus": row["text_status"], "publishedTextStatus": row["published_text_status"],
            }
        if set(evidence) != wanted:
            raise ValueError(f"Missing source evidence: {wanted - set(evidence)}")
        remark_ids = {e["remarkId"] for e in evidence.values()}
        remarks = {}
        for row in rows("nachlass_remarks.csv"):
            if row["remark_id"] in remark_ids:
                remarks[row["remark_id"]] = {
                    "sourceText": row["text"], "sourceTextStatus": row["text_status"],
                    "printedReference": row["printed_edition_locator"], "publishedLocations": row["published_locations"],
                    "sourceTextUrl": row["text_source_url"], "facsimileUrl": row["facsimile_url"],
                    "diplomaticUrl": row["diplomatic_url"],
                }
    return {"snapshot": graph["snapshot"], "evidence": evidence, "remarks": remarks}


if __name__ == "__main__":
    result = build(sys.argv[1])
    OUTPUT.write_bytes(gzip.compress((json.dumps(result, ensure_ascii=False, separators=(",", ":")) + "\n").encode("utf-8"), mtime=0))
    print(f"Saved {len(result['evidence'])} evidence records and {len(result['remarks'])} source remarks ({OUTPUT.stat().st_size} bytes).")
