#!/usr/bin/env node
/**
 * One-time seeding: uploads committed local files to GCS.
 *
 * Guarded by a sentinel object (_seeded_v1) in GCS so it runs only on the
 * FIRST deployment. Subsequent deployments skip it entirely since files are
 * now served directly from GCS via the Hono API uploads proxy.
 *
 * Run: node scripts/sync-uploads-from-gcs.js
 * Exit code: non-zero on failure (startup should abort on failure).
 */

'use strict';

const path = require('path');
const fs = require('fs');
const { Storage } = require('@google-cloud/storage');

const SIDECAR_ENDPOINT = 'http://127.0.0.1:1106';
const ROOT = path.resolve(__dirname, '..');
const LOCAL_UPLOADS_DIR = path.join(ROOT, 'app/apps/strapi/public/uploads');
const GCS_PREFIX = 'public/strapi-uploads';
const SENTINEL_OBJECT = `${GCS_PREFIX}/_seeded_v1`;

const BUCKET_NAME = process.env.DEFAULT_OBJECT_STORAGE_BUCKET_ID;

if (!BUCKET_NAME) {
  console.error('FATAL: DEFAULT_OBJECT_STORAGE_BUCKET_ID is not set.');
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

  // Check if the one-time migration has already run.
  const [alreadySeeded] = await bucket.file(SENTINEL_OBJECT).exists();
  if (alreadySeeded) {
    console.log('=== Seeding already completed (sentinel present) — skipping ===');
    return;
  }

  console.log('=== First-run seeding: uploading committed files → GCS ===');

  if (!fs.existsSync(LOCAL_UPLOADS_DIR)) {
    console.log('No local uploads directory found — nothing to seed.');
  } else {
    const localFiles = fs.readdirSync(LOCAL_UPLOADS_DIR).filter(f => {
      const stat = fs.statSync(path.join(LOCAL_UPLOADS_DIR, f));
      return stat.isFile();
    });

    let seeded = 0;
    let skipped = 0;
    const errors = [];

    for (const filename of localFiles) {
      const objectName = `${GCS_PREFIX}/${filename}`;
      const [exists] = await bucket.file(objectName).exists();
      if (exists) {
        skipped++;
        continue;
      }

      const localPath = path.join(LOCAL_UPLOADS_DIR, filename);
      const ext = path.extname(filename);
      const mime = mimeFromExt(ext);

      try {
        await bucket.upload(localPath, {
          destination: objectName,
          contentType: mime,
          resumable: false,
        });
        console.log(`  Seeded: ${filename}`);
        seeded++;
      } catch (err) {
        console.error(`  FAILED to seed ${filename}:`, err.message);
        errors.push(filename);
      }
    }

    console.log(`  Seeded: ${seeded}, Already in GCS: ${skipped}, Failed: ${errors.length}`);

    if (errors.length > 0) {
      console.error('FATAL: Some files failed to seed:', errors);
      process.exit(1);
    }
  }

  // Write the sentinel so this script is skipped on future deployments.
  await bucket.file(SENTINEL_OBJECT).save('seeded', {
    contentType: 'text/plain',
    resumable: false,
  });

  console.log('=== Seeding complete — sentinel written ===');
}

main().catch((err) => {
  console.error('FATAL: Seeding failed:', err);
  process.exit(1);
});
