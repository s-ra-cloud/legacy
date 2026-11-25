#!/usr/bin/env python3
"""Resolve identified undated people through explicit biography identities.

No search-rank identity guessing. These biography mappings are distinct from
anonymous records that need an openly labelled modelling placement.
"""
import json
from pathlib import Path
import re
import statistics
import urllib.parse
import urllib.request

DATA = Path(__file__).resolve().parent / "data"
IDENTITIES = {
    "Bachtin__Nicholas": "en:Nikolai_Bakhtin",
    "Ballard__Melville": "en:Melville_Ballard",
    "Brouwer__Luitzen": "en:L._E._J._Brouwer",
    "Dziewicki__Michal_Henryk": "en:Michał_Henryk_Dziewicki",
    "Ernst__Paul": "en:Paul_Ernst_(writer)",
    "Hardy__Godfrey": "en:G._H._Hardy",
    "Jesus_von_Nazaret": "en:Jesus",
    "Joseph__H.W.B.": "en:H._W._B._Joseph",
    "Karl_der_Grosse": "en:Charlemagne",
    "Kraus__Karl": "en:Karl_Kraus_(writer)",
    "Lee__Desmond": "en:Desmond_Lee",
    "Lindsay__A.D.": "en:Alexander_Lindsay,_1st_Baron_Lindsay_of_Birker",
    "McTaggart__John_Ellis": "en:J._M._E._McTaggart",
    "Price__H.H.": "en:H._H._Price",
    "Priestley__Raymond__E.": "en:Raymond_Priestley",
    "Queen_Victoria": "en:Queen_Victoria",
    "Raven__Canon": "en:Charles_Earle_Raven",
    "Respinger__Marguerite": "en:Marguerite_Respinger",
    "Runge__Otto": "en:Philipp_Otto_Runge",
    "Stonborough__Jerome_(Gatte_von_Margarete_Wittgenstein)": "de:Jerome_Stonborough",
    "Stonborough__Jerome__(Gatte_von_Margarete_Wittgenstein)": "de:Jerome_Stonborough",
    "Ward__James": "en:James_Ward_(psychologist)",
    "Wittgenstein__Kurt": "de:Kurt_Wittgenstein",
    "Wittgenstein__Leopoldine": "de:Leopoldine_Wittgenstein",
    "Wittgenstein__Paul_(Onkel)": "de:Paul_Wittgenstein_(Unternehmer)",
    "Zwingli__Ulrich": "en:Huldrych_Zwingli",
}


def collect():
    values = []
    articles = {}
    for key, reference in IDENTITIES.items():
        lang, page = reference.split(":", 1)
        url = f"https://{lang}.wikipedia.org/wiki/{page}"
        articles[key] = url
        values.append(f"({json.dumps(key)} <{url}>)")
    query = """
      SELECT ?key ?person ?birth ?precision ?rank WHERE {
        VALUES (?key ?article) { %s }
        ?article schema:about ?person.
        ?person wdt:P31 wd:Q5; p:P569 ?statement.
        ?statement ps:P569 ?birth; psv:P569/wikibase:timePrecision ?precision;
                   wikibase:rank ?rank.
        FILTER(?rank != wikibase:DeprecatedRank)
      }
    """ % "\n".join(values)
    url = "https://query.wikidata.org/sparql?" + urllib.parse.urlencode({"query": query, "format": "json"})
    request = urllib.request.Request(url, headers={"User-Agent": "LegacyScholarlyCatalogue/1.0"})
    with urllib.request.urlopen(request, timeout=90) as response:
        records = json.load(response)["results"]["bindings"]
    grouped = {}
    for row in records:
        if int(row["precision"]["value"]) >= 9:
            grouped.setdefault(row["key"]["value"], []).append(row)
    result = {}
    for key, records in grouped.items():
        preferred = [r for r in records if r["rank"]["value"].endswith("PreferredRank")]
        records = preferred or records
        entities = {r["person"]["value"] for r in records}
        if len(entities) != 1:
            raise ValueError(f"Ambiguous biography identity: {key}")
        raw_years = {int(re.match(r"([+-]?\d+)-", r["birth"]["value"])[1]) for r in records}
        years = sorted(y - 1 if y <= 0 else y for y in raw_years)
        # Wide or contradictory ranges need separate review, not an average.
        if max(years) - min(years) > 20:
            continue
        year = round(statistics.median(years)) or -1
        result[key] = {
            "birthYear": year, "birthDate": None,
            "precision": "year" if len(years) == 1 else "approximate-year",
            "sourceUrl": next(iter(entities)).replace("http://www.wikidata.org/entity/", "https://www.wikidata.org/wiki/"),
            "status": "reference-source", "identityArticle": articles[key],
            "basis": "Birth year from the explicitly identified biography; differing source years are represented by an approximate median." if len(years) > 1 else "Birth statements agree on this year; no precise day is asserted.",
        }
    (DATA / "source-birth-supplements.json").write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n")
    print(f"Retrieved {len(result)} identified birth-year records; remaining identities retain explicit placement estimates.")


if __name__ == "__main__":
    collect()
