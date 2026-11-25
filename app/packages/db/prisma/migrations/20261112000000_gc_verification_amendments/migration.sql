-- Existing revisions are independent originals. Do not backfill guessed lineage
-- or change the append-only trigger. NULL submission_id means this row is a root.
ALTER TABLE gc_verification_revisions
  ADD COLUMN IF NOT EXISTS submission_id TEXT REFERENCES gc_verification_revisions(id),
  ADD COLUMN IF NOT EXISTS amends_revision_id TEXT REFERENCES gc_verification_revisions(id);
CREATE UNIQUE INDEX IF NOT EXISTS gc_revision_one_amendment
  ON gc_verification_revisions(amends_revision_id) WHERE amends_revision_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS gc_revision_owner_history
  ON gc_verification_revisions(user_id, created_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS gc_revision_submission
  ON gc_verification_revisions(submission_id, revision DESC);
