-- Additive only: preserve existing users and uploaded profile images.
ALTER TABLE "public"."users" ADD COLUMN IF NOT EXISTS "auth_image_url" TEXT;
