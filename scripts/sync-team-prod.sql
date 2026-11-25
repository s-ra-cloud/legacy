-- Surgical, idempotent sync of ONLY the Team content type to match dev.
-- Scope: touches strapi.teams ONLY. No media, no other content types, no deletes.
-- Safe to run multiple times (updates are idempotent; inserts are guarded by NOT EXISTS).
--
-- Exact diff vs production (after the pre-publish restore):
--   1. Update Laura Duparc description
--   2. Update 1337 School description (adds Hamza Hoummadi's name + LinkedIn)
--   3. Add new member Mohamed Amine Elhariri (text only -- he has no picture in dev)
--
-- Each Strapi entry has two rows sharing a document_id: a draft (published_at IS NULL)
-- and a published row (published_at IS NOT NULL). The public site reads the published row.

BEGIN;

-- 1) Laura Duparc -- update description on both draft and published rows
UPDATE strapi.teams
SET description = $laura$Laura has been working on the digitisation of foundational texts in the humanities since 2018. She is responsible for the conception and original design of each LEGACY module: the Library, Knowledge Tree, The Great Conversation and AI Philosopher Personas, as well as the prototype's visual design.$laura$,
    updated_at = now()
WHERE document_id = 't0jqtcnw2hrefaahxslygcpo';

-- 2) 1337 School -- update description on both draft and published rows
UPDATE strapi.teams
SET description = $school$The 1337 school is a non-profit computer science school and the leading African institute for the formation of top-level software developers. The school is in charge of developing and maintaining the LEGACY website. The current developer responsible for the project is [Hamza Hoummadi](https://www.linkedin.com/in/hamza-hoummadi/).$school$,
    updated_at = now()
WHERE document_id = 'e0qrlxfomnn6ipe1gqwcb8au';

-- 3a) Mohamed Amine Elhariri -- draft row (insert only if missing)
INSERT INTO strapi.teams (document_id, name, role, category, affiliation, description, created_at, updated_at, published_at, locale)
SELECT 'kx7m2p9qrst4uvwx1yz3abcd', 'Mohamed Amine Elhariri', 'Concept & Design', 'Direction & Design', NULL,
       $mo$Mohamed Amine Elhariri is a systems software architect building AI infrastructure and backend solutions. He is responsible for the LEGACY visual overhaul in 2026.$mo$,
       now(), now(), NULL, 'en'
WHERE NOT EXISTS (
  SELECT 1 FROM strapi.teams WHERE document_id = 'kx7m2p9qrst4uvwx1yz3abcd' AND published_at IS NULL
);

-- 3b) Mohamed Amine Elhariri -- published row (insert only if missing)
INSERT INTO strapi.teams (document_id, name, role, category, affiliation, description, created_at, updated_at, published_at, locale)
SELECT 'kx7m2p9qrst4uvwx1yz3abcd', 'Mohamed Amine Elhariri', 'Concept & Design', 'Direction & Design', NULL,
       $mo$Mohamed Amine Elhariri is a systems software architect building AI infrastructure and backend solutions. He is responsible for the LEGACY visual overhaul in 2026.$mo$,
       now(), now(), now(), 'en'
WHERE NOT EXISTS (
  SELECT 1 FROM strapi.teams WHERE document_id = 'kx7m2p9qrst4uvwx1yz3abcd' AND published_at IS NOT NULL
);

COMMIT;
