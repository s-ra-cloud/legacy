# Knowledge Tree data pipeline

The Academic Family Tree export, Stephen V. David, 2026-04-23,
https://zenodo.org/records/19739198, CC BY 3.0. This application is an independent
viewer, not an official partner. Original files are retained in App Storage,
not Git or frontend assets.

## Observed schemas and interpretation

- `people`: `pid,firstname,middlename,lastname,degrees,location,locid,area,majorarea,award,hindex,orcid_id,s2id,ktpid,homepage,addedby,dateadded`.
  `pid` identifies a researcher. `majorarea` is a comma-separated set of source
  discipline tags, not an inferred classification.
- `locations`: `locid,location,shortname,city,state,country,lat,lon,addedby,dateadded`.
- `connect`: `cid,pid1,pid2,relation,location,locid,stopdate,dissertation_title,pqid,ktcid,addedby,dateadded`.
  **pid1 is the trainee; pid2 is the mentor**. pid2=0 is an institutional
  affiliation. Relation 0=undergraduate RA, 1=graduate student, 2=postdoc,
  3=research scientist, 4=collaboration (NOT mentorship). Only 0–3, with both
  endpoints present, enter genealogy/path traversal. All source rows are retained.
  Unknown dates such as `0000-00-00` are not converted into invented dates.
- `authorPub`: `pubid,pid,score_total,score_human,[score_coa],pmid,doi,s2id,citations`.
  **authorPub15 has no score_coa column**. Map by validated header, never position.
  Composite key (pubid,pid) is documented by the source. All seven shards belong
  to one dataset. These are candidate associations, not verified bibliographies.
  Profiles show human-confirmed or score>0.3 matches unless human-rejected,
  label uncertainty, and display only supplied identifiers (no invented titles).
- `peopleGrant`: `grantid,pid,score,score_human,score_name,score_loc,fedex_pi_id,fedex_name,APPLICATION_ID,BUDGET_START,FULL_PROJECT_NUM,importdate,dborigin`.
  Preserve application/project references and confidence. Exact normalized-row
  hashes make grants idempotent without assuming undocumented (grantid,pid) uniqueness.
- Literal `NULL` and empty strings become SQL NULL. Original IDs are retained;
  missing endpoints are not fabricated. Original compressed sources preserve
  contributor metadata not exposed in the public explorer.

## Development setup

Apply `app/packages/db/knowledge-tree/schema.sql` to **development only** using the
database tool. It only adds an isolated `knowledge_tree` namespace and indexes.
Never run schema DDL in a deployment startup/build hook. Publish handles schema.

From the repository root, with development DATABASE_URL securely supplied:

```
python3 scripts/knowledge-tree/import.py --development --files attached_assets --core-only
python3 scripts/knowledge-tree/import.py --development --files attached_assets
```

The importer streams gzip/CSV, validates headers, COPY-loads bounded staging
batches, deduplicates, and checkpoints each committed batch atomically. Repeating
an import resumes at its last committed source row. Completed files are skipped.
A changed checksum is rejected rather than silently mixing snapshots.
Progress and errors are recorded in `knowledge_tree.imports`; no records are
deleted. A PostgreSQL advisory lock prevents concurrent importers. Reject logs
contain file/row/error class, not full data rows. Schema installation is separate.
Rows lacking required identifiers (including publication/grant researcher IDs)
are counted as rejected before COPY rather than aborting a whole batch. They
remain in the archived original exports; no researcher identity is invented.

Production is a separate dataset: publishing schema does **not** copy development
rows. Do not use "overwrite production data" (that could replace unrelated user
content). Production loading requires a separately authorized data-only import
using this pipeline and the original App Storage objects after schema review.
There is intentionally no public upload/import endpoint and no startup import.

The graph API bounds neighborhood size/depth and path-search work. It excludes
collaborations and affiliations, supports multiple mentors, and reports truncation
and search limits. A limited search is never evidence that no historical path exists.

## Relationship display regressions

Run `pnpm --filter @workspace/scripts test:kt-relationships` from the project root.
The synthetic fixtures cover direction, multiple mentors, reciprocal roles,
cycles, shared branches, unknown types, shortest-hop radial sectors, persistent
selection, profile grouping, bounded views, filters, display/theme switching,
dense accessible names, keyboard actions and graph controls.

The component tests run real React and D3 with a Sigma adapter that follows
Sigma 4's evaluated-style/source-attribute reducer contract. They do not verify
GPU drawing, CSS reflow or native scrolling. Check those in the public explorer
at `/projects/knowledge-tree?researcher=1`, adding `&view=constellation` for
the second display. No fixture records or credentials are written to a database.
