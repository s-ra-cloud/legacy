#!/usr/bin/env node
/**
 * Migrate existing Strapi uploads from local disk to Replit Object Storage (GCS).
 * - Uploads each file from app/apps/strapi/public/uploads/ to public/strapi-uploads/ in GCS.
 * - Updates the `url` and `provider` columns in strapi.files so Strapi uses GCS URLs.
 * - Idempotent: skips files already uploaded (checks if GCS object exists).
 *
 * Run: node scripts/migrate-uploads-to-gcs.js
 */

'use strict';

const path = require('path');
const fs = require('fs');
const { Storage } = require('@google-cloud/storage');
const { Client } = require('pg');

const SIDECAR_ENDPOINT = 'http://127.0.0.1:1106';
const ROOT = path.resolve(__dirname, '..');
const UPLOADS_DIR = path.join(ROOT, 'app/apps/strapi/public/uploads');

const BUCKET_NAME = process.env.DEFAULT_OBJECT_STORAGE_BUCKET_ID;
const PUBLIC_PREFIX = 'public/strapi-uploads';

if (!BUCKET_NAME) {
  console.error('ERROR: DEFAULT_OBJECT_STORAGE_BUCKET_ID env var not set.');
  process.exit(1);
}

function createStorage() {
  return new Storage({
    credentials: {
      audience: 'replit',
      subject_token_type: 'access_token',
      token_url: `${SIDECAR_ENDPOINT}/token`,
      type: 'external_account',
      credential_source: {
        url: `${SIDECAR_ENDPOINT}/credential`,
        format: { type: 'json', subject_token_field_name: 'access_token' },
      },
      universe_domain: 'googleapis.com',
    },
    projectId: '',
  });
}

function mimeFromExt(ext) {
  const map = {
    '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
    '.png': 'image/png', '.gif': 'image/gif',
    '.webp': 'image/webp', '.svg': 'image/svg+xml',
    '.pdf': 'application/pdf', '.mp4': 'video/mp4',
  };
  return map[ext.toLowerCase()] || 'application/octet-stream';
}

async function main() {
  const storage = createStorage();
  const bucket = storage.bucket(BUCKET_NAME);

  const db = new Client({ connectionString: process.env.DATABASE_URL });
  await db.connect();

  // Fetch all file records from Strapi DB that still use local /uploads/ URLs
  const { rows: fileRecords } = await db.query(
    `SELECT id, hash, ext, mime, url, provider_metadata
     FROM strapi.files
     WHERE url LIKE '/uploads/%' OR url LIKE '%/uploads/%'`
  );

  console.log(`Found ${fileRecords.length} file records to migrate.`);

  let migrated = 0;
  let skipped = 0;
  let missing = 0;

  for (const record of fileRecords) {
    const filename = `${record.hash}${record.ext}`;
    const localPath = path.join(UPLOADS_DIR, filename);
    const objectName = `${PUBLIC_PREFIX}/${filename}`;
    const gcsUrl = `https://storage.googleapis.com/${BUCKET_NAME}/${objectName}`;

    // Check if local file exists
    if (!fs.existsSync(localPath)) {
      // Also check for thumbnail variants
      console.warn(`  MISSING local file: ${filename}`);
      missing++;
      continue;
    }

    // Check if already in GCS
    const [exists] = await bucket.file(objectName).exists();
    if (exists) {
      console.log(`  SKIP (already in GCS): ${filename}`);
      // Still update DB if URL hasn't been updated yet
      if (record.url !== gcsUrl) {
        await db.query(
          `UPDATE strapi.files SET url = $1, provider = 'local', provider_metadata = $2 WHERE id = $3`,
          [gcsUrl, JSON.stringify({ objectName }), record.id]
        );
      }
      skipped++;
      continue;
    }

    // Upload to GCS
    try {
      const mime = record.mime || mimeFromExt(record.ext);
      await bucket.upload(localPath, {
        destination: objectName,
        contentType: mime,
        resumable: false,
      });

      // Update the DB record
      await db.query(
        `UPDATE strapi.files SET url = $1, provider = 'local', provider_metadata = $2 WHERE id = $3`,
        [gcsUrl, JSON.stringify({ objectName }), record.id]
      );

      console.log(`  UPLOADED: ${filename} → ${gcsUrl}`);
      migrated++;
    } catch (err) {
      console.error(`  ERROR uploading ${filename}:`, err.message);
    }
  }

  // Also migrate thumbnail URLs stored in the formats JSONB column
  const { rows: formatsRows } = await db.query(
    `SELECT id, formats FROM strapi.files WHERE formats IS NOT NULL AND formats::text LIKE '%/uploads/%'`
  );

  console.log(`\nMigrating thumbnail formats for ${formatsRows.length} records...`);

  for (const record of formatsRows) {
    const formats = record.formats;
    let changed = false;

    for (const [size, fmt] of Object.entries(formats)) {
      if (fmt && fmt.url && fmt.url.includes('/uploads/')) {
        const thumbFilename = path.basename(fmt.url);
        const localThumbPath = path.join(UPLOADS_DIR, thumbFilename);
        const thumbObjectName = `${PUBLIC_PREFIX}/${thumbFilename}`;
        const thumbGcsUrl = `https://storage.googleapis.com/${BUCKET_NAME}/${thumbObjectName}`;

        if (fs.existsSync(localThumbPath)) {
          const [exists] = await bucket.file(thumbObjectName).exists();
          if (!exists) {
            const mime = fmt.mime || mimeFromExt(path.extname(thumbFilename));
            await bucket.upload(localThumbPath, {
              destination: thumbObjectName,
              contentType: mime,
              resumable: false,
            });
          }
          formats[size].url = thumbGcsUrl;
          formats[size].provider = 'local';
          changed = true;
        }
      }
    }

    if (changed) {
      await db.query(
        `UPDATE strapi.files SET formats = $1 WHERE id = $2`,
        [JSON.stringify(formats), record.id]
      );
    }
  }

  await db.end();

  console.log(`\n=== Migration complete ===`);
  console.log(`  Uploaded:  ${migrated}`);
  console.log(`  Skipped:   ${skipped}`);
  console.log(`  Missing:   ${missing}`);
}

main().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
