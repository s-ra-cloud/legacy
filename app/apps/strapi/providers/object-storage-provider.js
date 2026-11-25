'use strict';

/**
 * Replit Object Storage provider for Strapi 5.
 *
 * Strategy:
 *   - Files are stored exclusively in GCS (persistent across deployments)
 *     under public/strapi-uploads/<hash><ext>.
 *   - nginx proxies /strapi/uploads/* to the Hono API which reads files
 *     from GCS on demand — no local disk copy needed.
 *   - file.url stays as "/uploads/<hash><ext>" — the same format used by
 *     Strapi's built-in local provider — so no URL-transform changes are
 *     needed in the API services or the client.
 */

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

    function gcsObjectName(file) {
      return `${gcsFolder}/${file.hash}${file.ext}`;
    }

    return {
      async upload(file) {
        const name = gcsObjectName(file);
        const buf = Buffer.from(file.buffer, 'binary');

        const gcsFile = bucket.file(name);
        await gcsFile.save(buf, { contentType: file.mime, resumable: false });

        file.url = `/uploads/${file.hash}${file.ext}`;
        file.provider_metadata = { objectName: name };
      },

      async uploadStream(file) {
        const name = gcsObjectName(file);

        const chunks = [];
        for await (const chunk of file.stream) {
          chunks.push(chunk);
        }
        const buf = Buffer.concat(chunks);

        const gcsFile = bucket.file(name);
        await gcsFile.save(buf, { contentType: file.mime, resumable: false });

        file.url = `/uploads/${file.hash}${file.ext}`;
        file.provider_metadata = { objectName: name };
      },

      async delete(file) {
        const name =
          file.provider_metadata?.objectName || gcsObjectName(file);

        try {
          await bucket.file(name).delete();
        } catch (err) {
          if (err.code !== 404) throw err;
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
        return { url: file.url };
      },

      isPrivate() {
        return false;
      },
    };
  },
};
