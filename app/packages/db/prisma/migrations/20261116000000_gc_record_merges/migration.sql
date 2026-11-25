-- Additive only. Originals, CMS records and verification revisions are untouched.
CREATE TABLE IF NOT EXISTS public.gc_merge_proposals (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL CHECK (kind IN ('person', 'work')),
  keys JSONB NOT NULL,
  canonical_key TEXT NOT NULL,
  resolutions JSONB NOT NULL,
  explanation TEXT NOT NULL,
  citation TEXT NOT NULL DEFAULT '',
  context_hash TEXT NOT NULL,
  records JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'applied', 'rejected', 'withdrawn', 'reversed')),
  version INTEGER NOT NULL DEFAULT 1,
  proposer_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  proposer_name TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT timezone('UTC', CURRENT_TIMESTAMP)
);
CREATE INDEX IF NOT EXISTS gc_merge_kind_history
  ON public.gc_merge_proposals(kind, created_at DESC, id DESC);
CREATE TABLE IF NOT EXISTS public.gc_merge_events (
  id TEXT PRIMARY KEY,
  proposal_id TEXT NOT NULL REFERENCES public.gc_merge_proposals(id) ON DELETE RESTRICT,
  action TEXT NOT NULL,
  actor_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  actor_name TEXT NOT NULL,
  explanation TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT timezone('UTC', CURRENT_TIMESTAMP)
);
CREATE INDEX IF NOT EXISTS gc_merge_event_history ON public.gc_merge_events(proposal_id, created_at, id);
