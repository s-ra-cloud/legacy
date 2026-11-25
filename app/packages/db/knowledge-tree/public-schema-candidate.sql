-- Additive public-schema recovery staging tables; apply to DEVELOPMENT only.
-- Do not execute against production or from build/startup hooks.
-- Existing Knowledge Tree data and application queries remain unchanged.
CREATE TABLE IF NOT EXISTS public.knowledge_tree_imports (
  name text PRIMARY KEY, kind text NOT NULL, sha256 text NOT NULL,
  snapshot date NOT NULL DEFAULT '2026-04-23', bytes bigint NOT NULL,
  rows_read bigint NOT NULL DEFAULT 0, rows_written bigint NOT NULL DEFAULT 0,
  rejected bigint NOT NULL DEFAULT 0, status text NOT NULL DEFAULT 'pending',
  error text, updated_at timestamptz NOT NULL DEFAULT now(),
  core_verification jsonb
);
-- Also upgrade existing development staging tables without changing their data.
ALTER TABLE public.knowledge_tree_imports
  ADD COLUMN IF NOT EXISTS core_verification jsonb;
CREATE TABLE IF NOT EXISTS public.knowledge_tree_locations (
  locid integer PRIMARY KEY, location text, shortname text, city text,
  state text, country text, lat double precision, lon double precision
);
CREATE TABLE IF NOT EXISTS public.knowledge_tree_researchers (
  pid integer PRIMARY KEY, full_name text NOT NULL,
  firstname text, middlename text, lastname text, degrees text,
  location text, locid integer, area text, majorarea text,
  award text, hindex integer, orcid_id text, s2id text, ktpid text, homepage text,
  connection_count integer NOT NULL DEFAULT 0
);
-- Production lacks pg_trgm and Publish does not include its installation.
-- Keep staging extension-free; original schema and its search index stay intact.
CREATE INDEX IF NOT EXISTS knowledge_tree_people_name_prefix
  ON public.knowledge_tree_researchers (lower(full_name) text_pattern_ops);
CREATE INDEX IF NOT EXISTS knowledge_tree_people_surname_prefix
  ON public.knowledge_tree_researchers (lower(lastname) text_pattern_ops);
CREATE INDEX IF NOT EXISTS knowledge_tree_people_tokens
  ON public.knowledge_tree_researchers
  USING gin (to_tsvector('simple'::regconfig, full_name));
CREATE TABLE IF NOT EXISTS public.knowledge_tree_connections (
  cid integer PRIMARY KEY, trainee_id integer NOT NULL, mentor_id integer NOT NULL,
  relation integer, location text, locid integer, stopdate text,
  dissertation_title text, pqid text, ktcid text
);
CREATE INDEX IF NOT EXISTS knowledge_tree_connection_trainee
  ON public.knowledge_tree_connections (trainee_id);
CREATE INDEX IF NOT EXISTS knowledge_tree_connection_mentor
  ON public.knowledge_tree_connections (mentor_id)
  WHERE mentor_id > 0 AND relation BETWEEN 0 AND 3;
CREATE TABLE IF NOT EXISTS public.knowledge_tree_publications (
  pubid bigint NOT NULL, pid integer NOT NULL, score_total real, score_human integer,
  score_coa real, pmid text, doi text, s2id text, citations bigint,
  PRIMARY KEY (pubid, pid)
);
CREATE INDEX IF NOT EXISTS knowledge_tree_pub_verified_person
  ON public.knowledge_tree_publications (pid, score_total DESC)
  WHERE score_human = 1 OR (score_total > 0.3 AND COALESCE(score_human,0) <> -1);
CREATE TABLE IF NOT EXISTS public.knowledge_tree_grants (
  row_key text PRIMARY KEY, grantid bigint NOT NULL, pid integer NOT NULL,
  score real, score_human integer, score_name real, score_loc real,
  fedex_pi_id text, fedex_name text, application_id text, budget_start text,
  full_project_num text, importdate text, dborigin text
);
CREATE INDEX IF NOT EXISTS knowledge_tree_grant_person
  ON public.knowledge_tree_grants (pid);
