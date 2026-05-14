import { randomUUID } from "node:crypto";
import type internal from "node:stream";
import { Readable } from "node:stream";
import { env, logger } from "@repo/shared";
import type { ClientOptions } from "minio";
import { Client } from "minio";

class MinioClient extends Client {
  bucketName: string;

  constructor(minioClientOptions: ClientOptions) {
    super(minioClientOptions);
    this.bucketName = env.MINIO_BUCKET_NAME;
    void this.createBucketIfNotExists();
  }

  private async createBucketIfNotExists() {
    try {
      const exists = await this.bucketExists(this.bucketName);
      if (!exists) {
        await this.makeBucket(this.bucketName, "us-east-1");
        logger.info(`Bucket created successfully in "us-east-1".`);
      }
    } catch (err) {
      logger.error({ err }, "MINIO");
    }
  }

  async uploadToMinio(
    file?: File,
    existingFileName?: string,
  ): Promise<string | undefined> {
    if (!file) return;
    const fileName = existingFileName || `${randomUUID()}_${file.name}`;

    try {
      const stream = file.stream();
      const readable = Readable.fromWeb(stream as never);
      await this.putObject(this.bucketName, fileName, readable, file.size, {
        "Content-Type": file.type,
      });
      return fileName;
    } catch (error) {
      logger.error({ error }, "Failed to upload file to Minio.");
    }
  }

  async getFileBuffer(fileName: string): Promise<ArrayBuffer> {
    const fileStream = await this.getObject(this.bucketName, fileName);
    return await MinioClient.toArrayBuffer(fileStream);
  }

  async getFileStream(fileName: string) {
    const data = await this.getObject(this.bucketName, fileName);

    const readableStream = new ReadableStream({
      start(controller) {
        data.on("data", (chunk) => controller.enqueue(chunk));
        data.on("end", () => controller.close());
        data.on("error", (err) => controller.error(err));
      },
    });
    return readableStream;
  }

  static async toArrayBuffer(
    minioObject: internal.Readable,
  ): Promise<ArrayBuffer> {
    const chunks = [];
    for await (const chunk of minioObject) {
      chunks.push(chunk);
    }

    // eslint-disable-next-line node/prefer-global/buffer
    const buffer = Buffer.concat(chunks);
    const data = buffer.buffer.slice(
      buffer.byteOffset,
      buffer.byteOffset + buffer.byteLength,
    );
    if (!(data instanceof ArrayBuffer)) throw new Error("Invalid buffer");
    return data;
  }

  deleteFile(fileName: string) {
    return this.removeObject(this.bucketName, fileName);
  }

  static getContentTypeFromFilename(filename: string): string {
    const extension = filename.split(".").pop()?.toLowerCase();
    switch (extension) {
      case "jpg":
      case "jpeg":
        return "image/jpeg";
      case "png":
        return "image/png";
      case "gif":
        return "image/gif";
      case "webp":
        return "image/webp";
      case "svg":
        return "image/svg+xml";
      case "pdf":
        return "application/pdf";
      case "txt":
        return "text/plain";
      case "html":
        return "text/html";
      case "css":
        return "text/css";
      case "js":
        return "application/javascript";
      case "json":
        return "application/json";
      case "xml":
        return "application/xml";
      default:
        return "application/octet-stream";
    }
  }
}

const minioClient = new MinioClient({
  endPoint: env.MINIO_HOST,
  port: env.MINIO_PORT,
  useSSL: false,
  accessKey: env.MINIO_ACCESS_KEY,
  secretKey: env.MINIO_SECRET_KEY,
  region: "us-east-1",
});

export { minioClient, type MinioClient };
