#!/usr/bin/env node
/**
 * Startup sync for Strapi uploads ↔ GCS (Replit Object Storage).
 *
 * Two-phase logic, run on every pod start:
 *
 * PHASE 1 — one-time initial seeding (skipped once sentinel exists):
 *   1a. If _seeded_v1 sentinel exists in GCS → skip straight to Phase 2.
 *   1b. Upload any local files missing from GCS.
 *   1c. Verify GCS prefix is non-empty (refuse to lock in empty sentinel).
 *   1d. Write sentinel.
 *
 * PHASE 2 — restore GCS → local disk (runs on every cold start):
 *   2a. List all objects under GCS_PREFIX (excluding sentinel).
 *   2b. Download any that are missing locally.
 *   This ensures files uploaded through Strapi after the initial seeding
 *   survive a pod restart and are available on local disk.
 *
 * Exit code: non-zero on any failure (startup must abort on failure).
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

/** List all real upload objects in GCS (excludes sentinel). */
async function listGCSUploads(bucket) {
  const [files] = await bucket.getFiles({ prefix: GCS_PREFIX + '/' });
  return files.filter(f => f.name !== SENTINEL_OBJECT);
}

// ---------------------------------------------------------------------------
// PHASE 1: one-time seeding of committed local files → GCS
// ---------------------------------------------------------------------------
async function seedLocalToGCS(bucket) {
  const [alreadySeeded] = await bucket.file(SENTINEL_OBJECT).exists();
  if (alreadySeeded) {
    console.log('[seed] Sentinel present — initial seeding already done, skipping Phase 1.');
    return;
  }

  console.log('[seed] First-run seeding: uploading committed local files → GCS');

  let seeded = 0;
  let skipped = 0;
  const errors = [];

  if (!fs.existsSync(LOCAL_UPLOADS_DIR)) {
    console.log('[seed] No local uploads directory found — will verify GCS is pre-populated.');
  } else {
    const localFiles = fs.readdirSync(LOCAL_UPLOADS_DIR).filter(f => {
      const stat = fs.statSync(path.join(LOCAL_UPLOADS_DIR, f));
      return stat.isFile();
    });

    console.log(`[seed]   Found ${localFiles.length} local file(s) to evaluate.`);

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
        console.log(`[seed]   Seeded: ${filename}`);
        seeded++;
      } catch (err) {
        console.error(`[seed]   FAILED to seed ${filename}:`, err.message);
        errors.push(filename);
      }
    }

    console.log(`[seed]   Seeded: ${seeded}, Already in GCS: ${skipped}, Failed: ${errors.length}`);

    if (errors.length > 0) {
      console.error('[seed] FATAL: Some files failed to seed:', errors);
      process.exit(1);
    }
  }

  // Verify GCS is non-empty before writing the sentinel to prevent lock-in on
  // an empty bucket.
  console.log('[seed] Verifying GCS object count before writing sentinel…');
  const gcsFiles = await listGCSUploads(bucket);
  const gcsCount = gcsFiles.length;
  console.log(`[seed]   GCS objects in ${GCS_PREFIX}/: ${gcsCount}`);

  if (gcsCount === 0) {
    console.error(
      '[seed] FATAL: GCS prefix is empty after seeding. ' +
      'No local files were available to upload and GCS has no pre-existing objects. ' +
      'Refusing to write sentinel — fix the upload source and redeploy.'
    );
    process.exit(1);
  }

  await bucket.file(SENTINEL_OBJECT).save(
    `seeded at ${new Date().toISOString()} — ${gcsCount} object(s) verified in GCS`,
    { contentType: 'text/plain', resumable: false }
  );

  console.log(`[seed] Seeding complete — sentinel written (${gcsCount} GCS objects verified).`);
}

// ---------------------------------------------------------------------------
// PHASE 2: restore GCS → local disk on every cold start
// ---------------------------------------------------------------------------
async function restoreGCSToLocal(bucket) {
  console.log('[restore] Syncing GCS → local uploads dir…');

  const gcsFiles = await listGCSUploads(bucket);

  if (gcsFiles.length === 0) {
    console.log('[restore] GCS prefix is empty — nothing to restore.');
    return;
  }

  fs.mkdirSync(LOCAL_UPLOADS_DIR, { recursive: true });

  let downloaded = 0;
  let skipped = 0;
  const errors = [];

  for (const gcsFile of gcsFiles) {
    const filename = path.basename(gcsFile.name);
    if (!filename) continue;

    const localPath = path.join(LOCAL_UPLOADS_DIR, filename);
    if (fs.existsSync(localPath)) {
      skipped++;
      continue;
    }

    try {
      await gcsFile.download({ destination: localPath });
      console.log(`[restore]   Downloaded: ${filename}`);
      downloaded++;
    } catch (err) {
      console.error(`[restore]   FAILED to download ${filename}:`, err.message);
      errors.push(filename);
    }
  }

  console.log(
    `[restore] Done — Downloaded: ${downloaded}, Already local: ${skipped}, Failed: ${errors.length}`
  );

  if (errors.length > 0) {
    console.error('[restore] FATAL: Some files could not be restored from GCS:', errors);
    process.exit(1);
  }
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------
async function main() {
  const storage = createStorage();
  const bucket = storage.bucket(BUCKET_NAME);

  await seedLocalToGCS(bucket);
  await restoreGCSToLocal(bucket);

  console.log('[sync] Startup sync complete.');
}

main().catch((err) => {
  console.error('FATAL: Startup sync failed:', err);
  process.exit(1);
});
