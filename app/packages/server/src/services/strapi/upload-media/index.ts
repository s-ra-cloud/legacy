import { envClient } from "@repo/shared/env-client";
import type { ServiceContext } from "../../../context.js";
import { ctxLog } from "../../../utils/logger/console.js";
import { strapiUploadMediaResponseSchema, type StrapiUploadMediaResponse } from "./schema/output.js";

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

function buildUploadUrl() {
  // Use internal address for server-side uploads — avoids circular public routing.
  const baseUrl = new URL(envClient.VITE_STRAPI_FETCH_URL);
  const pathname = baseUrl.pathname.endsWith("/") ? `${baseUrl.pathname}api/upload` : `${baseUrl.pathname}/api/upload`;
  return new URL(pathname, baseUrl.origin);
}

// -----------------------------------------------------------------------------
// Service functions
// -----------------------------------------------------------------------------

async function create(ctx: ServiceContext, file: File | Blob) {
  ctxLog(ctx, "UploadMedia/Create", { filename: (file as any).name ?? "blob" });

  // ---------------------------------------------------------------------------
  // Build multipart body
  // ---------------------------------------------------------------------------
  const formData = new FormData();

  const filename = (file as any).name ?? "file";

  const fs = await import("fs/promises");
  let buffer: Buffer;

  if (typeof (file as any).arrayBuffer === "function") {
    buffer = Buffer.from(await (file as any).arrayBuffer());
  } else if (Buffer.isBuffer(file)) {
    buffer = file as Buffer;
  } else if (file instanceof Uint8Array) {
    buffer = Buffer.from(file);
  } else if (typeof (file as any).pipe === "function") {
    // Readable stream
    const chunks: Buffer[] = [];
    for await (const chunk of file as any) {
      chunks.push(Buffer.from(chunk));
    }
    buffer = Buffer.concat(chunks);
  } else if (typeof (file as any).stream === "function") {
    // File-like objects (formdata-node) that expose .stream() returning Readable
    const chunks: Buffer[] = [];
    for await (const chunk of (file as any).stream()) {
      chunks.push(Buffer.from(chunk));
    }
    buffer = Buffer.concat(chunks);
  } else if ((file as any).filepath || (file as any).path) {
    const path = (file as any).filepath || (file as any).path;
    buffer = await fs.readFile(path);
  } else {
    throw new Error("Unsupported file type for upload");
  }

  const mimeType = (file as any).type || "application/octet-stream";
  const blob = new Blob([buffer], { type: mimeType });
  formData.append("files", blob, filename);

  const headers: Record<string, string> = {};
  if (envClient.VITE_STRAPI_CONTRIBUTE_TOKEN) {
    headers["Authorization"] = `Bearer ${envClient.VITE_STRAPI_CONTRIBUTE_TOKEN}`;
  }

  const url = buildUploadUrl();

  const resp = await fetch(url, {
    method: "POST",
    body: formData,
    headers,
  });

  if (!resp.ok) {
    console.error(`Failed to upload media to ${url.toString()}: ${resp.statusText}`);
    console.error(await resp.text());
    throw new Error("Failed to upload media to Strapi");
  }

  const data = (await resp.json()) as StrapiUploadMediaResponse;
  const validated = strapiUploadMediaResponseSchema.parse(data);
  // Strapi always returns an array – return the first item for convenience
  return validated[0];
}

export const uploadMediaService = { create };

export type { StrapiUploadMediaResponse } from "./schema/output.js";
export { strapiUploadMediaResponseSchema } from "./schema/output.js";
