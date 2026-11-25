-- Additive only. Absence of a revision means human-unverified; no source flags
-- are read or rewritten, and rerunning never resets human decisions.
CREATE TABLE IF NOT EXISTS gc_verification_entities (
  key TEXT PRIMARY KEY,
  kind TEXT NOT NULL,
  original JSONB NOT NULL,
  revision INTEGER NOT NULL DEFAULT 0 CHECK (revision >= 0)
);
CREATE TABLE IF NOT EXISTS gc_verification_revisions (
  id TEXT PRIMARY KEY,
  entity_key TEXT NOT NULL REFERENCES gc_verification_entities(key),
  revision INTEGER NOT NULL CHECK (revision > 0),
  "values" JSONB NOT NULL,
  coverage JSONB NOT NULL,
  source_payload JSONB NOT NULL,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  source TEXT,
  UNIQUE(entity_key, revision)
);
CREATE OR REPLACE FUNCTION gc_prevent_revision_change() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'Human verification history is append-only';
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS gc_revision_immutable ON gc_verification_revisions;
CREATE TRIGGER gc_revision_immutable BEFORE UPDATE OR DELETE ON gc_verification_revisions
FOR EACH ROW EXECUTE FUNCTION gc_prevent_revision_change();
