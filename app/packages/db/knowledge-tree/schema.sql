-- Knowledge Tree schema source. Apply ONLY to development.
-- Replit Publish manages production schema changes; never execute this at startup.
-- Isolated namespace: no changes to existing public or Strapi tables.
CREATE SCHEMA IF NOT EXISTS knowledge_tree;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE TABLE IF NOT EXISTS knowledge_tree.imports (
  name text PRIMARY KEY, kind text NOT NULL, sha256 text NOT NULL,
  snapshot date NOT NULL DEFAULT '2026-04-23', bytes bigint NOT NULL,
  rows_read bigint NOT NULL DEFAULT 0, rows_written bigint NOT NULL DEFAULT 0,
  rejected bigint NOT NULL DEFAULT 0, status text NOT NULL DEFAULT 'pending',
  error text, updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS knowledge_tree.locations (
  locid integer PRIMARY KEY, location text, shortname text, city text,
  state text, country text, lat double precision, lon double precision
);
CREATE TABLE IF NOT EXISTS knowledge_tree.researchers (
  pid integer PRIMARY KEY, full_name text NOT NULL,
  firstname text, middlename text, lastname text, degrees text,
  location text, locid integer, area text, majorarea text,
  award text, hindex integer, orcid_id text, s2id text, ktpid text, homepage text,
  connection_count integer NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS kt_people_name_search ON knowledge_tree.researchers USING gin (full_name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS kt_people_name_prefix ON knowledge_tree.researchers (lower(full_name) text_pattern_ops);
CREATE INDEX IF NOT EXISTS kt_people_surname_prefix ON knowledge_tree.researchers (lower(lastname) text_pattern_ops);
CREATE TABLE IF NOT EXISTS knowledge_tree.connections (
  cid integer PRIMARY KEY, trainee_id integer NOT NULL, mentor_id integer NOT NULL,
  relation integer, location text, locid integer, stopdate text,
  dissertation_title text, pqid text, ktcid text
);
CREATE INDEX IF NOT EXISTS kt_connection_trainee ON knowledge_tree.connections (trainee_id);
CREATE INDEX IF NOT EXISTS kt_connection_mentor ON knowledge_tree.connections (mentor_id)
  WHERE mentor_id > 0 AND relation BETWEEN 0 AND 3;
CREATE TABLE IF NOT EXISTS knowledge_tree.publications (
  pubid bigint NOT NULL, pid integer NOT NULL, score_total real, score_human integer,
  score_coa real, pmid text, doi text, s2id text, citations bigint,
  PRIMARY KEY (pubid, pid)
);
CREATE INDEX IF NOT EXISTS kt_pub_verified_person ON knowledge_tree.publications (pid, score_total DESC)
  WHERE score_human = 1 OR (score_total > 0.3 AND COALESCE(score_human,0) <> -1);
CREATE TABLE IF NOT EXISTS knowledge_tree.grants (
  row_key text PRIMARY KEY, grantid bigint NOT NULL, pid integer NOT NULL,
  score real, score_human integer, score_name real, score_loc real,
  fedex_pi_id text, fedex_name text, application_id text, budget_start text,
  full_project_num text, importdate text, dborigin text
);
CREATE INDEX IF NOT EXISTS kt_grant_person ON knowledge_tree.grants (pid);
