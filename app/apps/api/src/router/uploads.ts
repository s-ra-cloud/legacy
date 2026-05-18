import { Hono } from "hono";
import { Storage } from "@google-cloud/storage";

const SIDECAR_ENDPOINT = "http://127.0.0.1:1106";
const BUCKET_NAME = process.env.DEFAULT_OBJECT_STORAGE_BUCKET_ID || "";
const GCS_FOLDER = "public/strapi-uploads";

function createStorage() {
  return new Storage({
    credentials: {
      audience: "replit",
      subject_token_type: "access_token",
      token_url: `${SIDECAR_ENDPOINT}/token`,
      type: "external_account",
      credential_source: {
        url: `${SIDECAR_ENDPOINT}/credential`,
        format: { type: "json", subject_token_field_name: "access_token" },
      },
      universe_domain: "googleapis.com",
    },
    projectId: "",
  } as any);
}

const storage = createStorage();
const bucket = storage.bucket(BUCKET_NAME);

const uploadsRouter = new Hono();

uploadsRouter.get("/:filename{.+}", async (c) => {
  const filename = c.req.param("filename");
  const objectName = `${GCS_FOLDER}/${filename}`;
  const gcsFile = bucket.file(objectName);

  try {
    const [exists] = await gcsFile.exists();
    if (!exists) {
      return c.text("Not Found", 404);
    }

    const [metadata] = await gcsFile.getMetadata();
    const contentType =
      (metadata as any).contentType || "application/octet-stream";

    const readStream = gcsFile.createReadStream();

    const webStream = new ReadableStream({
      start(controller) {
        readStream.on("data", (chunk: Buffer) => controller.enqueue(chunk));
        readStream.on("end", () => controller.close());
        readStream.on("error", (err: Error) => controller.error(err));
      },
      cancel() {
        readStream.destroy();
      },
    });

    return new Response(webStream, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=2592000, immutable",
      },
    });
  } catch (err) {
    console.error(`[uploads] Error serving ${filename}:`, err);
    return c.text("Not Found", 404);
  }
});

export { uploadsRouter };
