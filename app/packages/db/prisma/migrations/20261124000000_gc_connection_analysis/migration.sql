-- Additive only. Nullable with no default: historical certainty stays unknown.
ALTER TABLE strapi.gc_contributions
  ADD COLUMN IF NOT EXISTS connection_uncertain boolean,
  ADD COLUMN IF NOT EXISTS origin_comment text,
  ADD COLUMN IF NOT EXISTS supporting_reference text;
-- Strapi enumeration attributes are varchar; no rewrite of historical stance.
