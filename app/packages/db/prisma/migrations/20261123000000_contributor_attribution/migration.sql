-- Additive display fields only. Do not infer or backfill historical affiliations.
ALTER TABLE strapi.gc_contributions ADD COLUMN IF NOT EXISTS contributor_name varchar(255);
ALTER TABLE strapi.gc_contributions ADD COLUMN IF NOT EXISTS contributor_institution varchar(255);
ALTER TABLE strapi.gc_comments ADD COLUMN IF NOT EXISTS contributor_institution varchar(255);
