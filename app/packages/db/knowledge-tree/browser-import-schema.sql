-- Development-only additive migration. Production schema is applied by Publish.
-- No data loading, drops, resets, or website-startup DDL.
CREATE TABLE IF NOT EXISTS public.knowledge_tree_browser_jobs (
  name text PRIMARY KEY,
  user_id text NOT NULL,
  max_database_bytes bigint NOT NULL CHECK (max_database_bytes > 0),
  header_hash text,
  last_batch_hash text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
