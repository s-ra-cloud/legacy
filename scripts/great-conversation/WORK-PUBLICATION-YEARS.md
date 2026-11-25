# Works publication-date research

Research date: 11 November 2026. This is a conservative bibliographic enrichment,
not an identification of the editions Wittgenstein actually read.

## Result

- All 380 graph nodes have an explicit date assessment.
- 84 previously undated nodes now have supported publication dates.
- 41 imported edition/printed-source dates are retained with archive provenance.
- 255 nodes remain explicitly unknown. The former Mozart date (1786) is retained
  as `archiveDate`, but is no longer asserted to be a verified publication date.
- No IDs, titles, author labels, People data, or relationships were changed.

The source of truth is `data/work-publication-years.json`, keyed by exact imported
work ID. Rebuilding with `build_wab_graphs.py` joins these records into the bundled
snapshot. The inspector shows date type, qualifications, and accepted citations.
Unknowns still display “Year unknown” in bubbles.

## Method and limits

Title-and-author searches were made for 310 undated records. Ancient texts,
Bible passages and the unidentified Wittgenstein lecture were additionally
assessed as transmission/edition problems rather than assigned arbitrary dates.
Search leads are retained separately from accepted citations: **a search result
is not evidence that a date has been verified**. Some returned unrelated works,
modern translations, performances, or conflicting dates. Those were not promoted.
This pass does not claim that all unknown dates are unknowable.

Accepted dates were checked against retrieved scholarly bibliographies, libraries,
publishers, digitized bibliographic records and specialist institutions, including
the Stanford Encyclopedia of Philosophy, Library of Congress, Deutsches
Textarchiv, EuDML, Folger, Cornell, and the Kierkegaard and Newman bibliographies.
Records retain the source URL, evidence summary and qualifications.
Imported edition dates are explicitly identified as archive-supplied, not
independently established first publications.

Ranges describe multi-volume publication, not uncertainty-free single years.
A starting-volume date is identified as such in its note. Original-language
publication does not establish the date of a German translation. We do not assign
the date of a modern edition to an unspecified ancient work, an author's birth
date to a work, or the publication of a collection to an unverified individual
letter or poem.

Examples of material distinctions:

- Euler's series paper: written 1737, published 1744.
- Freud's *Traumdeutung*: issued 1899, title page dated 1900.
- Schopenhauer: issued 1818, title page dated 1819.
- Frege's *Grundgesetze*: volumes in 1893 and 1903.
- Brouwer's excluded-middle paper: SEP's 1924 bibliographic label conflicts with
  EuDML's 1925 volume date; left unknown pending issue-level verification.
- Goethe's *Metamorphose*: potentially the poem or the botanical treatise; no
  identity change or date transfer was made.
- Moore's imported 1944 lecture does not safely match a source describing a
  1939 lecture; left unknown.

## Verification

Run `python3 -m unittest discover -s scripts/great-conversation -p 'test_*.py'`
and `pnpm --filter @workspace/scripts test:gc`. Tests cover complete assessments,
explicit unknowns, date provenance, reproducible rebuilding, and an unchanged
fingerprint of identities and relationships.
