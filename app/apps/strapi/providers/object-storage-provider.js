'use strict';

/**
 * Replit Object Storage provider for Strapi 5.
 *
 * Strategy:
 *   - Files are stored in GCS (persistent across deployments) under
 *     public/strapi-uploads/<hash><ext>.
 *   - Files are ALSO written to public/uploads/ on local disk so nginx
 *     can serve them at /strapi/uploads/<file> without a proxy.
 *   - On the next deployment a startup sync script downloads any GCS
 *     objects back to local disk (restoring files added by previous pods).
 *   - file.url stays as "/uploads/<hash><ext>" — the same format used by
 *     Strapi's built-in local provider — so no URL-transform changes are needed
 *     in the API services or the client.
 */

const fs = require('fs');
const path = require('path');
const { Readable } = require('stream');

const SIDECAR_ENDPOINT = 'http://127.0.0.1:1106';

function createStorage() {
  const { Storage } = require('@google-cloud/storage');
  return new Storage({
    credentials: {
      audience: 'replit',
      subject_token_type: 'access_token',
      token_url: `${SIDECAR_ENDPOINT}/token`,
      type: 'external_account',
      credential_source: {
        url: `${SIDECAR_ENDPOINT}/credential`,
        format: {
          type: 'json',
          subject_token_field_name: 'access_token',
        },
      },
      universe_domain: 'googleapis.com',
    },
    projectId: '',
  });
}

module.exports = {
  init(providerOptions) {
    const bucketName =
      providerOptions.bucket || process.env.DEFAULT_OBJECT_STORAGE_BUCKET_ID;
    const gcsPrefix = providerOptions.prefix || 'strapi-uploads';
    const gcsFolder = `public/${gcsPrefix}`;

    const storage = createStorage();
    const bucket = storage.bucket(bucketName);

    // Local uploads dir relative to Strapi's cwd (app/apps/strapi/)
    const localDir = path.join(process.cwd(), 'public', 'uploads');

    function gcsObjectName(file) {
      return `${gcsFolder}/${file.hash}${file.ext}`;
    }

    function localPath(file) {
      return path.join(localDir, `${file.hash}${file.ext}`);
    }

    function ensureLocalDir() {
      fs.mkdirSync(localDir, { recursive: true });
    }

    return {
      async upload(file) {
        const name = gcsObjectName(file);
        const buf = Buffer.from(file.buffer, 'binary');

        // 1. Upload to GCS (persistent storage)
        const gcsFile = bucket.file(name);
        await gcsFile.save(buf, { contentType: file.mime, resumable: false });

        // 2. Write to local disk (for immediate nginx serving)
        ensureLocalDir();
        fs.writeFileSync(localPath(file), buf);

        // 3. Set the URL — keep the same /uploads/ pattern as the local provider
        file.url = `/uploads/${file.hash}${file.ext}`;
        file.provider_metadata = { objectName: name };
      },

      async uploadStream(file) {
        const name = gcsObjectName(file);

        // Collect the stream into a buffer (needed for dual write)
        const chunks = [];
        for await (const chunk of file.stream) {
          chunks.push(chunk);
        }
        const buf = Buffer.concat(chunks);

        // 1. Upload to GCS
        const gcsFile = bucket.file(name);
        await gcsFile.save(buf, { contentType: file.mime, resumable: false });

        // 2. Write to local disk
        ensureLocalDir();
        fs.writeFileSync(localPath(file), buf);

        file.url = `/uploads/${file.hash}${file.ext}`;
        file.provider_metadata = { objectName: name };
      },

      async delete(file) {
        const name =
          file.provider_metadata?.objectName || gcsObjectName(file);

        // Remove from GCS
        try {
          await bucket.file(name).delete();
        } catch (err) {
          if (err.code !== 404) throw err;
        }

        // Remove from local disk
        const lp = localPath(file);
        try {
          fs.unlinkSync(lp);
        } catch (_) {
          // Ignore if already gone
        }
      },

      checkFileSize(file, { sizeLimit } = {}) {
        if (sizeLimit && file.size > sizeLimit) {
          throw new Error(
            `File ${file.name} is too large. Max: ${sizeLimit} bytes.`
          );
        }
      },

      async getSignedUrl(file) {
        // Files are publicly accessible via /strapi/uploads/ — no signing needed
        return { url: file.url };
      },

      isPrivate() {
        return false;
      },
    };
  },
};
