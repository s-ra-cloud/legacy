#!/bin/sh

# Fix Strapi uploads directory ownership and permissions
# echo "Setting up Strapi uploads directory permissions..."
# mkdir -p /app/apps/strapi/public/uploads
# chown -R appuser:appuser /app/apps/strapi/public/uploads
# chmod -R 755 /app/apps/strapi/public/uploads

until pnpm --filter @repo/db exec prisma generate; do
  echo "Waiting for DB to be ready ...";
  sleep 2;
done;

echo "Running database migrations ..."
pnpm --filter @repo/db exec prisma db push --skip-generate

echo "Starting all services with Turbo ..."
pnpm dev
