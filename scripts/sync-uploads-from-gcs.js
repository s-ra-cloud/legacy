#!/usr/bin/env node
/**
 * One-time migration: seeds Strapi uploads into GCS on the first deployment.
 *
 * Guard logic:
 *   1. If sentinel (_seeded_v1) already exists in GCS → skip (already done).
 *   2. Upload any local files in public/uploads/ that are missing from GCS.
 *   3. After uploading, LIST GCS objects in the uploads prefix.
 *      If the list is empty, the migration is considered failed → exit(1).
 *   4. Only write the sentinel once GCS is confirmed non-empty.
 *
 * This prevents the sentinel from being written when seeding produces 0 objects,
 * which would permanently lock out future migration attempts.
 *
 * Run: node scripts/sync-uploads-from-gcs.js
 * Exit code: non-zero on any failure (startup must abort on failure).
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

async function countGCSObjects(bucket) {
  const [files] = await bucket.getFiles({ prefix: GCS_PREFIX + '/', maxResults: 1000 });
  // Exclude the sentinel itself from the count.
  return files.filter(f => f.name !== SENTINEL_OBJECT).length;
}

async function main() {
  const storage = createStorage();
  const bucket = storage.bucket(BUCKET_NAME);

  // Step 1: check if migration has already been verified and completed.
  const [alreadySeeded] = await bucket.file(SENTINEL_OBJECT).exists();
  if (alreadySeeded) {
    console.log('=== Seeding already completed (sentinel present) — skipping ===');
    return;
  }

  console.log('=== First-run seeding: uploading committed files → GCS ===');

  // Step 2: upload any local files missing from GCS.
  let seeded = 0;
  let skipped = 0;
  const errors = [];

  if (!fs.existsSync(LOCAL_UPLOADS_DIR)) {
    console.log('No local uploads directory found — will verify GCS is pre-populated.');
  } else {
    const localFiles = fs.readdirSync(LOCAL_UPLOADS_DIR).filter(f => {
      const stat = fs.statSync(path.join(LOCAL_UPLOADS_DIR, f));
      return stat.isFile();
    });

    console.log(`  Found ${localFiles.length} local file(s) to evaluate.`);

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

  // Step 3: verify GCS actually contains objects — refuse to write the sentinel
  // if the bucket prefix is empty. This prevents a zero-file sentinel lock-in.
  console.log('=== Verifying GCS object count before writing sentinel ===');
  const gcsCount = await countGCSObjects(bucket);
  console.log(`  GCS objects in ${GCS_PREFIX}/: ${gcsCount}`);

  if (gcsCount === 0) {
    console.error(
      'FATAL: GCS prefix is empty after seeding. ' +
      'No local files were available to upload and GCS has no pre-existing objects. ' +
      'Refusing to write sentinel — fix the upload source and redeploy.'
    );
    process.exit(1);
  }

  // Step 4: write sentinel only after GCS is confirmed non-empty.
  await bucket.file(SENTINEL_OBJECT).save(
    `seeded at ${new Date().toISOString()} — ${gcsCount} object(s) verified in GCS`,
    { contentType: 'text/plain', resumable: false }
  );

  console.log(`=== Seeding complete — sentinel written (${gcsCount} GCS objects verified) ===`);
}

main().catch((err) => {
  console.error('FATAL: Seeding failed:', err);
  process.exit(1);
});
