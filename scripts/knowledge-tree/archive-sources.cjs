// Preserve original compressed sources in private App Storage, outside Git.
const { createRequire } = require("node:module");
const path = require("node:path");
const fs = require("node:fs/promises");
const req = createRequire(path.resolve(__dirname, "../../app/apps/api/package.json"));
const { Storage } = req("@google-cloud/storage");
const { ExternalAccountClient } = req("google-auth-library");
async function main() {
  const authClient = ExternalAccountClient.fromJSON({
    type: "external_account", audience: "replit",
    subject_token_type: "urn:ietf:params:oauth:token-type:access_token",
    token_url: "http://127.0.0.1:1106/token",
    credential_source: { url: "http://127.0.0.1:1106/credential", format: { type: "json", subject_token_field_name: "access_token" } },
    universe_domain: "googleapis.com",
  });
  if (!authClient || !process.env.DEFAULT_OBJECT_STORAGE_BUCKET_ID) throw Error("App Storage is not configured");
  const bucket = new Storage({ authClient, projectId: "" }).bucket(process.env.DEFAULT_OBJECT_STORAGE_BUCKET_ID);
  const folder = path.resolve(__dirname, "../../attached_assets");
  for (const name of (await fs.readdir(folder)).filter(n => /^(people(?:Grant)?|locations|connect|authorPub\d+)\.csv_179381\d+\.gz$/.test(n)).sort()) {
    const destination = `private/knowledge-tree/2026-04-23/${name}`;
    const file = bucket.file(destination);
    const size = (await fs.stat(path.join(folder,name))).size;
    const [exists] = await file.exists();
    if (exists && Number((await file.getMetadata())[0].size) === size) {
      console.log("Already archived:", name); continue;
    }
    await bucket.upload(path.join(folder,name), { destination, resumable: true, validation: "crc32c",
      metadata: { contentType: "application/gzip", metadata: { source: "Academic Family Tree", snapshot: "2026-04-23", license: "CC-BY-3.0" } } });
    console.log("Archived:", name);
  }
}
main().catch(error => { console.error("Source archival failed:",error.code || error.name); process.exitCode=1; });
