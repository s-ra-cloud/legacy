#!/usr/bin/env python3
"""Gather public bibliographic evidence for the author's broad user-defined role.

Writes a reviewable input file, not the platform or catalogue databases.
No matching by arbitrary search rank; reuses the catalogue's sourced identities.
"""
import json
import argparse
from pathlib import Path
import time
import urllib.parse
import urllib.request
import urllib.error

ROOT = Path(__file__).resolve().parents[2]
DATA = ROOT / "scripts/great-conversation/data"


def collect(refresh=False):
    catalogue = json.loads((ROOT / "artifacts/legacy/client/app/lib/data/gc-author-births.json").read_text())
    ids = sorted({r["sourceUrl"].rsplit("/", 1)[-1] for r in catalogue
                  if (r.get("sourceUrl") or "").startswith("https://www.wikidata.org/wiki/Q")})
    output = DATA / "author-role-evidence.json"
    facts = json.loads(output.read_text()) if output.exists() else {}
    ids = ids if refresh else [qid for qid in ids if qid not in facts]
    for start in range(0, len(ids), 35):
        values = " ".join("wd:" + q for q in ids[start:start + 35])
        query = """SELECT DISTINCT ?person ?book ?bookLabel ?occupation ?occupationLabel WHERE {
          VALUES ?person { %s }
          {
            VALUES ?category { wd:Q571 wd:Q8261 }
            ?book wdt:P50 ?person; wdt:P31/wdt:P279* ?category.
          }
          UNION { ?person wdt:P106 ?occupation. }
          SERVICE wikibase:label { bd:serviceParam wikibase:language "en,de". }
        }""" % values
        url = "https://query.wikidata.org/sparql?" + urllib.parse.urlencode({"query": query, "format": "json"})
        req = urllib.request.Request(url, headers={"User-Agent": "LegacyScholarlyCatalogue/1.0"})
        for attempt in range(2):
            try:
                with urllib.request.urlopen(req, timeout=120) as response:
                    rows = json.load(response)["results"]["bindings"]
                break
            except urllib.error.HTTPError as error:
                if error.code != 429 or attempt == 1:
                    raise
                delay = max(60, int(error.headers.get("Retry-After", "60")))
                print(f"Public source rate-limited; respecting {delay}s wait.", flush=True)
                time.sleep(delay)
        for qid in ids[start:start + 35]:
            facts.setdefault(qid, {"books": {}, "occupations": {}})
        for row in rows:
            qid = row["person"]["value"].rsplit("/", 1)[-1]
            fact = facts.setdefault(qid, {"books": {}, "occupations": {}})
            for key, plural in [("book", "books"), ("occupation", "occupations")]:
                if key in row:
                    fact[plural][row[key]["value"].rsplit("/", 1)[-1]] = row.get(key + "Label", row[key])["value"]
        print(f"Role evidence {min(start + 35, len(ids))}/{len(ids)}", flush=True)
        output.write_text(json.dumps(facts, ensure_ascii=False, indent=2) + "\n")
        time.sleep(3)
    print(f"Saved bibliographic evidence for {len(facts)} identities.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--refresh", action="store_true")
    collect(parser.parse_args().refresh)
