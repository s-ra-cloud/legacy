-- Additive only: original identities and retry fingerprints remain untouched.
ALTER TABLE strapi.gc_contributions ADD COLUMN IF NOT EXISTS reference_revision_history jsonb;
