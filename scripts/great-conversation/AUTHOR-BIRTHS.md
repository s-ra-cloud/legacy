# Author chronology catalogue

The author graph uses a **separate internal SQLite database**:
`scripts/great-conversation/data/author-births.sqlite`.
It does not connect to or alter the platform's production PostgreSQL database.
Every archive person has an individual catalogue row, including people whose
identity or birth date is unknown. Existing scholarly graph authors have separate
site-record rows, preserving their IDs rather than merging identities.

The browser reads its checked-in JSON projection,
`artifacts/legacy/client/app/lib/data/gc-author-births.json`.
Both normal and production frontend builds include this projection. Publishing
therefore carries the same chronology data without an extra database migration
or live Wikidata dependency. No enrichment is run on website startup or publish.

## Dates and evidence

- Public Wikidata human entities are matched by exact multilingual full-name
  labels, with explicit spelling/name variants in `data/author-name-variants.json`.
  Canonical encyclopedia titles may narrow candidates but cannot establish
  identity: several inherited namesake errors survived that heuristic.
  Publication of an automatic match now requires the archive-ID-specific
  Wikidata entity pin in `data/author-identity-audit.json`. New, changed or
  anachronistic matches remain undated pending review. A retained source match
  is **not independent verification of every birth statement or WAB endorsement**.
- Multiple matching identities and conflicting accepted birth statements remain
  unresolved in the base source import. Deprecated claims are excluded; preferred
  claims take precedence. Cited ranges and separately labelled modelling estimates
  can supply a chronological position without inventing a known birth date.
- Each sourced row retains its Wikidata URL, date precision, status and retrieval
  date. The inspector exposes that provenance. Site records retain their status.
- BCE sorting uses historical years, with no year zero; SPARQL astronomical BCE
  values are converted when generating the sortable birth year.
- Birth-year order is ordinal, not a proportional time axis: each author gets
  readable space regardless of the time gap to the next author.
- The dotted chronology guide is not an intellectual connection. Stance links
  and all existing filters remain independent.
- Known dates always take precedence. The user approved **labelled placement
  estimates** for otherwise undated individuals. These are not known birth years:
  earliest available dated mention/work minus an assumed age of 30, or the archive
  date-range midpoint minus 30 if no person-specific date exists. The graph and
  inspector say “placement”; the inspector explains the actual calculation.
  Combined-person/group/empty placeholders remain outside the individual chronology.
- New scholarly authors can use explicit birth/death metadata from their site
  records. No digits are extracted from work titles or unrelated descriptions.
- Cited reference-work entries in `data/reference-author-births.json` may
  supplement dates unavailable from the structured source. Approximate dates
  (for example Plato's 429? BCE in Stanford's entry) retain explicit approximation.
- `data/author-birth-research.json` records the review of all 65 entries that
  were undated on 2026-11-11. Every entry retains its existing ID, a source URL,
  retrieval date and a research explanation. Additional evidence URLs distinguish
  identity evidence from birth evidence. Notes and evidence survive into SQLite
  and the checked-in JSON; they are not a claim of human verification by WAB.
- The original 65-entry review added 35 sourced dates and documented 30
  unresolved outcomes. The subsequent audit of inherited automatic matches
  corrected or withheld unsupported dates; **298 of 341 records have sourced
  factual birth years**. Forty-three factual birth outcomes remain unresolved:
  13 ambiguous identities, 9 disputed
  chronologies, 8 unidentified names, 6 people with no established birth,
  4 joint or multiple-author records, 1 fictional character, 1 legendary figure
  and 1 blank namespace record. An undated research outcome is an explicit NULL, never the
  text `"None"`, year zero, an arbitrary range endpoint or a collaborator's birth.
- Reference decisions are applied after automated source matching, including
  during `--refresh`. For example, Bachtin remains undated because the National
  Archives gives 1895 while the encyclopedia gives 1894; Thomas à Kempis remains
  undated because the reference gives 1379 or 1380. Fox is dated only to July
  1624; Wallenstein's cited New Style date explicitly distinguishes Old Style.
  Euclid's about 325 BCE and Pythagoras's circa 570 BCE remain approximate.
- Titles and surnames alone do not prove an identity: Canon Raven's plausible
  candidate stays undated. Johannes Bolstad's 1937 diary appearance cannot be
  assigned the birth of Arne's father, who died in 1930. Joint authors and the
  two existing Jerome Stonborough spelling/whitespace IDs are never merged.
- `data/author-identity-audit.json` records a review of **all 268 inherited
  automatic matches**, using the candidate entity's label/description and the
  archive's historical context. Its 255 retained identity pins prevent a refresh
  from silently switching to a namesake. The other 13 candidates were rejected
  or withheld, with decisions in `data/author-birth-corrections.json`.
  Kleist is the dramatist (1777), Macaulay the essayist (1800), Heinrich IV the
  explicitly named king of France (1553), and Dorothy Moore G.E. Moore's wife
  (1892). Metadata-only candidates such as Edward II and Timothy Moore remain
  undated even when a plausible alternative has a sourced birth.
- The corrections input also preserves disputes (Fermat, Livy, Duncan and Paul)
  and approximation (Heraclitus, Arminius, Ockham, Zeno and Servetus). Baptism
  records for Beethoven, Cervantes, Shakespeare and Molière are not treated as
  authenticated birth days. Neither the Works graph nor relationship data was
  changed by either audit.

## Maintenance

`python3 scripts/great-conversation/build_author_births.py`
exports the existing SQLite catalogue and adds missing archive entries through
the public source. `--refresh` explicitly refreshes archive birth statements.
Network failures abort rather than replacing sourced dates with silent fallbacks.
No secrets are required. This is a maintainer command, not a deploy hook.

Existing scholarly inputs are in `data/scholarly-author-births.json`, transcribed
from the public `/api/v1/gc-contributions` author records. To maintain them, use the
author's actual site ID and explicit metadata, not a guessed cross-source ID.

Run `node --test scripts/great-conversation/chronology.test.mjs` for catalogue,
birth lookup and responsive geometry checks.
Run `python3 -m unittest discover -s scripts/great-conversation -p 'test_*.py' -v`
for offline research-input validation, SQLite/JSON agreement, legacy-schema
migration, repeatable generation, refresh precedence and identity-collision
regressions. Invalid reference IDs and identity pins,
duplicates, missing evidence/explanations and inconsistent date precision abort
before catalogue writes. The tests use temporary databases and never refresh
the checked-in catalogue from the network.
## Author classification and estimates

The **same SQLite database** contains `author_roles` and `author_date_estimates`.
Every catalogue entry has a binary author/non-author classification with a basis,
status and available source. Author means someone who wrote a book **or taught a
doctrine**: Socrates and Epictetus qualify through oral teaching.

Book statements, selected book-length WAB works, bibliographic assessments and
doctrine assessments are distinguished. Scores, paintings, single poems, letters,
papers and mere archive references are **not automatically book evidence**.
An unsupported negative classification is explicitly **provisional**, not proof
that the person never wrote a book or taught a doctrine. Assessments are not
represented as human-reviewed. The People graph defaults to **Authors only**;
turning it off restores access to other entries, without deleting anything.
The Works graph does not apply this classification filter.

Maintainer inputs include `author-role-evidence.json`, `author-book-work-ids.json`,
`author-book-assessments.json`, `author-role-overrides.json`,
`source-birth-supplements.json` and `author-date-estimates.json`.
Source supplements fill only absent dates, never overwrite known dates.
They also cannot override an explicit unresolved research decision.
Older placement rows may remain as provenance but are inactive once a sourced
birth year exists: consumers must prefer `author_births.birth_year` over
`author_date_estimates.estimated_year`.

The user-approved display placements are separate from factual births. For an
otherwise undated individual, JSON may show an `estimated` or `placement-estimate`
year with its assumptions; `birthEvidence` preserves the complete underlying
researched NULL, status, source, precision and explanation. SQLite's
`author_births` remains the factual catalogue; `author_date_estimates` holds
modelling placements. Group, fictional, legendary and invalid records are
classified as non-person and never receive an individual placement estimate.
Counts of displayed positions must not be described as counts of known births.

Optional, explicit maintenance commands (never startup or publish hooks):

```sh
python3 scripts/great-conversation/enrich_author_roles.py
python3 scripts/great-conversation/collect_birth_supplements.py
python3 scripts/great-conversation/build_placement_estimates.py
python3 scripts/great-conversation/build_author_births.py
python3 -m unittest discover -s scripts/great-conversation -p 'test_*.py'
pnpm --filter @workspace/scripts test:gc
```

The main builder preserves sourced base dates, stores role/estimate metadata in
SQLite and exports the browser projections. No PostgreSQL migration or production
database write is required for these static graph catalogue changes.
