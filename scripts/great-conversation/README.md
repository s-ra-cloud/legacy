# Human verification overlay

See [HUMAN_VERIFICATION.md](HUMAN_VERIFICATION.md) for source inventory, identities,
API contracts, migration behavior and verification regression commands.

# Great Conversation WAB snapshot

The bundled graph data is a read-only, reproducible projection of the supplied
`legacy_wab_deliverables2` archive (2026-11-10). It does not replace or mutate
scholarly contributions, production records, or the original upload.

Rebuild from the original upload:

```sh
python3 scripts/great-conversation/build_wab_graphs.py attached_assets/legacy_wab_deliverables2_1794351123169.zip
python3 -m unittest discover -s scripts/great-conversation -p 'test_*.py' -v
node --test scripts/great-conversation/graph-filters.test.mjs
```

## Provenance and scope

- Archive / People: WAB-derived person references, directed from Wittgenstein
  to the referenced person. These are not reciprocal influences.
- AI / Works: supplied AI-classified work connections.
- Scholarly / People and Works: existing live contributions, unchanged.
- Archive / Works and AI / People: no dataset assigned by the user; show an
  explicit unavailable-data state, never relabel or invent connections.
- Approval, disapproval, neutral, and mixed are separate stance categories.
  Insufficient evidence is not neutral. Some stances concern individual claims
  rather than whole works.
- ALL supplied stance judgments are AI-generated and not human-verified,
  including the person graph. “Text-confirmed” describes the supplied automated
  review, not scholarly certification.
- Rejected, superseded/reclassified candidate records, and unidentifiable targets
  are excluded. Corrected targets in the confirmed file are retained.
- Unverified records and insufficient-evidence stances are opt-in. The initial
  view has 213 person edges or 279 work edges; including uncertainty permits
  334 person edges or 617 work edges before stance filtering.

Only graph fields, short supplied evidence summaries, evidence identifiers, and
source URLs are projected. The full Nachlass transcriptions and extraction scripts
are not deployed. Attribution: Wittgenstein Archives at the University of Bergen
(WAB) / Bergen Nachlass Edition. The original quality report notes that external
target passages were not retrieved; this is not a comparison of both full texts.

The application snapshot is bundled with the website, requiring no production
database migration or import. Future dataset updates must rerun the integrity
tests and preserve these provenance distinctions.

## Chronology regression checks

For sourced Works dates, uncertainty and bibliographic research limitations, see
[WORK-PUBLICATION-YEARS.md](WORK-PUBLICATION-YEARS.md). The publication catalogue
is joined during the normal rebuild; it never changes graph identities or links.

From the workspace root:

```sh
# Geometry, catalogue integrity, graph filters, and component interactions
pnpm --filter @workspace/scripts test:gc

# Just the interaction regression suite
pnpm --filter @workspace/scripts test:gc-ui
```

These commands use Node's test runner and need no running website, backend,
credentials, network requests, or browser installation. The UI suite bundles and
mounts the **real** `GCGraphSection` and `GCPeopleChronology` with React DOM in
jsdom, using a small, deterministic, read-only graph. It exercises controlled
parent callbacks, actual SVG nodes, search, filters, portal remounts, focus and
keyboard events. Each case unmounts the component and checks observer cleanup.
Temporary bundles are removed at the end.

The source-state cases also mount the real Great Conversation index route.
Only the contribution query, snapshot import, and unrelated home-page sections
are replaced at bundle time. Deferred snapshot promises and an in-memory query
store supply frozen, disjoint fixtures; real route effects, dataset builders,
source/type selection and retry callbacks remain under test. The actual
slow-loading hook is advanced through its timer rather than waiting eight
seconds. Fetch attempts fail explicitly, and these tests never load a database.

Coverage includes:

- The production minimum of three distinct connections for both graph kinds;
  sparse fixture journeys explicitly set the minimum to zero through the UI.
- Phone-sized initial mount, oldest bottom-left position, complete wrapped labels,
  undated separation and chronology guide start.
- Narrow → wide → narrow observer-driven reflow, selected-node centering, bottom
  pinning, and relative scroll preservation.
- Search for dated, undated and hidden disconnected authors; reveal and Show all.
- Enter/Space selection and returning to the oldest entries.
- Phone and desktop fullscreen entry, inspector toggling, repeated portal
  remounts, search reopening the inspector, Escape precedence, focus wrapping,
  button/Escape exits, and restoration of page scroll, focus and body overflow.
- Stance and uncertainty filtering, empty-result recovery, and returning to the
  Works renderer (and back to People).
- Archive and scholarly loading announcements, including slow scholarly loading;
  accessible failure and unavailable messages without stale graphs or inspectors.
- All six source/type combinations, including unavailable Archive Works and AI
  People, provenance-control visibility, and selection reset on round trips.
- Snapshot failures and repeated retries, in-flight scholarly retry disabling,
  independent source failures, and late responses respecting the selected dataset.
- Fullscreen source/type changes through unavailable, loading, error, retry and
  recovery states, followed by exit with the recovered dataset intact.

**Scope:** jsdom does not calculate CSS, native scrolling, media queries or
ResizeObserver geometry. The harness explicitly supplies measured host sizes and
clamped scrolling; assertions read rendered SVG coordinates and real component
state. Smooth scrolling completes immediately in this harness. The Works switch
checks the real network renderer mounts with the right dataset, not D3's layout
or zoom. These are interaction regressions, not proof of visual layout, touch
behavior, native focus visibility or animation in a browser. Use a single focused
browser pass only when explicitly requested or permitted by the testing skill.
