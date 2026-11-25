-- Development-only additive migration. Production changes are reviewed through Publish.
-- No historical specificity or stance is inferred and no historical data is rewritten.
ALTER TABLE strapi.gc_contributions
  ADD COLUMN IF NOT EXISTS reference_details JSONB,
  ADD COLUMN IF NOT EXISTS submission_key VARCHAR(255),
  ADD COLUMN IF NOT EXISTS submission_fingerprint VARCHAR(255);
ALTER TABLE strapi.gc_contributions
  ALTER COLUMN connection_type DROP NOT NULL,
  ALTER COLUMN connection_nature DROP NOT NULL,
  ALTER COLUMN book_b_id DROP NOT NULL,
  ALTER COLUMN book_b_title DROP NOT NULL,
  ALTER COLUMN book_b_text_excerpt DROP NOT NULL;
-- Strapi has separate draft and published versions of a document.
CREATE UNIQUE INDEX IF NOT EXISTS gc_reference_submission_key_published
  ON strapi.gc_contributions (submission_key) WHERE published_at IS NOT NULL;
ALTER TABLE strapi.requested_books
  ADD COLUMN IF NOT EXISTS entity_type VARCHAR(255) DEFAULT 'work',
  ADD COLUMN IF NOT EXISTS review_status VARCHAR(255) DEFAULT 'proposed',
  ADD COLUMN IF NOT EXISTS contribution_document_id VARCHAR(255),
  ADD COLUMN IF NOT EXISTS author_document_id VARCHAR(255);
ALTER TABLE strapi.requested_books ALTER COLUMN book_name DROP NOT NULL;
