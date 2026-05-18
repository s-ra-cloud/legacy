#!/usr/bin/env node
/**
 * Sync Strapi uploads FROM GCS TO local disk.
 *
 * Run at every deployment startup (before Strapi starts) to restore upload
 * files that were created on previous deployments or by other pods.
 *
 * Also uploads any LOCAL files not yet in GCS (initial seeding).
 *
 * Run: node scripts/sync-uploads-from-gcs.js
 */

'use strict';

const path = require('path');
const fs = require('fs');
const { Storage } = require('@google-cloud/storage');

const SIDECAR_ENDPOINT = 'http://127.0.0.1:1106';
const ROOT = path.resolve(__dirname, '..');
const LOCAL_UPLOADS_DIR = path.join(ROOT, 'app/apps/strapi/public/uploads');
const GCS_PREFIX = 'public/strapi-uploads';

const BUCKET_NAME = process.env.DEFAULT_OBJECT_STORAGE_BUCKET_ID;

if (!BUCKET_NAME) {
  console.error('ERROR: DEFAULT_OBJECT_STORAGE_BUCKET_ID is not set.');
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

  fs.mkdirSync(LOCAL_UPLOADS_DIR, { recursive: true });

  // Step 1: Download from GCS → local (restore missing files)
  console.log('=== Downloading from GCS → local disk ===');
  const [gcsFiles] = await bucket.getFiles({ prefix: GCS_PREFIX + '/' });
  
  let downloaded = 0;
  let alreadyLocal = 0;

  for (const gcsFile of gcsFiles) {
    const filename = path.basename(gcsFile.name);
    if (!filename || filename === '') continue;

    const localPath = path.join(LOCAL_UPLOADS_DIR, filename);
    if (fs.existsSync(localPath)) {
      alreadyLocal++;
      continue;
    }

    try {
      await gcsFile.download({ destination: localPath });
      console.log(`  Downloaded: ${filename}`);
      downloaded++;
    } catch (err) {
      console.error(`  Error downloading ${filename}:`, err.message);
    }
  }

  console.log(`  Downloaded: ${downloaded}, Already local: ${alreadyLocal}`);

  // Step 2: Upload from local → GCS (seed any committed files not yet uploaded)
  console.log('\n=== Uploading local → GCS (seeding missing objects) ===');
  const localFiles = fs.readdirSync(LOCAL_UPLOADS_DIR);
  let seeded = 0;
  let alreadyGCS = 0;

  for (const filename of localFiles) {
    const objectName = `${GCS_PREFIX}/${filename}`;
    const [exists] = await bucket.file(objectName).exists();
    if (exists) {
      alreadyGCS++;
      continue;
    }

    const localPath = path.join(LOCAL_UPLOADS_DIR, filename);
    const ext = path.extname(filename);
    const mime = mimeFromExt(ext);

    try {
      await bucket.upload(localPath, { destination: objectName, contentType: mime, resumable: false });
      console.log(`  Seeded: ${filename}`);
      seeded++;
    } catch (err) {
      console.error(`  Error seeding ${filename}:`, err.message);
    }
  }

  console.log(`  Seeded: ${seeded}, Already in GCS: ${alreadyGCS}`);
  console.log('\n=== Sync complete ===');
}

main().catch((err) => {
  console.error('Sync failed:', err);
  process.exit(1);
});
