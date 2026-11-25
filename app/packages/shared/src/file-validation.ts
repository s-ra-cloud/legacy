import { fileTypeFromBuffer } from "file-type";
import { z } from "zod";

type FileValidatorProps = {
  maxSize: number;
  minSize?: number;
  mimeTypes: string[];
};

export const fileValidator = ({
  maxSize,
  minSize = 0,
  mimeTypes,
}: FileValidatorProps) => {
  return async (file: File, ctx: z.RefinementCtx) => {
    if (file.size < minSize) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "File size is too small",
      });
      return;
    }
    if (file.size > maxSize) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "File size is too large",
      });
      return;
    }

    if (file.size === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Empty files are not allowed",
      });
      return;
    }

    if (!mimeTypes.includes(file.type)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "File type is not allowed",
      });
      return;
    }

    const fileName = file.name.toLowerCase();
    const fileExtension = fileName.split(".").pop() || "";

    const suspiciousPatterns = [
      /\.\./,
      /[<>:"|?*]/,
      /^(con|prn|aux|nul|com[1-9]|lpt[1-9])\./i,
      /^\./,
      /\.{2,}/,
    ];

    for (const pattern of suspiciousPatterns) {
      if (pattern.test(fileName)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "File name contains invalid or suspicious characters",
        });
        break;
      }
    }

    if (fileName.length > 255) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "File name is too long (maximum 255 characters)",
      });
    }

    const expectedExtensions = getExpectedExtensions(file.type);
    if (
      expectedExtensions.length > 0 &&
      !expectedExtensions.includes(`.${fileExtension}`)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `File extension ".${fileExtension}" does not match MIME type "${file.type}"`,
      });
      return;
    }

    const executableMimeTypes = [
      "application/x-executable",
      "application/x-msdownload",
      "application/x-msi",
      "application/x-msdos-program",
      "application/x-msdos-windows",
      "application/octet-stream",
      "application/x-dosexec",
      "application/x-winexe",
    ];

    if (executableMimeTypes.includes(file.type)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Executable files are not allowed",
      });
      return;
    }

    try {
      await validateFileContent(file, ctx);
    } catch (error) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Content validation failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      });
      return;
    }
  };
};

async function validateFileContent(file: File, ctx: z.RefinementCtx) {
  const CHUNK_SIZE = 64 * 1024;
  const MAX_SCAN_SIZE = 10 * 1024 * 1024;
  let bytesScanned = 0;
  let offset = 0;

  const headerBuffer = await file
    .slice(0, Math.min(8192, file.size))
    .arrayBuffer();
  const headerUint8Array = new Uint8Array(headerBuffer);
  const detectedType = await fileTypeFromBuffer(headerUint8Array);

  if (!detectedType) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Unable to detect file type from content",
    });
    return;
  }

  if (detectedType.mime !== file.type) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `File content mismatch: claimed "${file.type}" but detected "${detectedType.mime}"`,
    });
    return;
  }

  const claimedTypeAllowed = getMimeTypesForDetectedType(detectedType.mime);
  if (
    claimedTypeAllowed.length > 0 &&
    !claimedTypeAllowed.includes(file.type)
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `Detected file type "${detectedType.mime}" doesn't match any allowed variants`,
    });
    return;
  }

  while (offset < file.size && bytesScanned < MAX_SCAN_SIZE) {
    const chunkEnd = Math.min(offset + CHUNK_SIZE, file.size);
    const chunk = await file.slice(offset, chunkEnd).arrayBuffer();
    const chunkArray = new Uint8Array(chunk);

    if (containsSuspiciousPatterns(chunkArray)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Suspicious content detected at byte offset ${offset}`,
      });
      return;
    }

    if (containsExecutableSignatures(chunkArray)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Executable signature detected at byte offset ${offset}`,
      });
      return;
    }

    offset = chunkEnd;
    bytesScanned += chunkArray.length;

    if (offset % (CHUNK_SIZE * 10) === 0) {
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
  }
}

function containsSuspiciousPatterns(buffer: Uint8Array): boolean {
  const textContent = new TextDecoder("utf-8", { fatal: false }).decode(buffer);

  const suspiciousPatterns = [
    /<\?php/i,
    /<script[^>]*>/i,
    /javascript:/i,
    /vbscript:/i,
    /eval\s*\(/i,
    /exec\s*\(/i,
    /system\s*\(/i,
    /\$_GET\[/i,
    /\$_POST\[/i,
    /base64_decode/i,
    /shell_exec/i,
    /passthru/i,
    /file_get_contents/i,
    /curl_exec/i,
    /fsockopen/i,
  ];

  return suspiciousPatterns.some((pattern) => pattern.test(textContent));
}

function containsExecutableSignatures(buffer: Uint8Array): boolean {
  const signatures = [
    [0x4d, 0x5a],
    [0x7f, 0x45, 0x4c, 0x46],
    [0xfe, 0xed, 0xfa, 0xce],
    [0xfe, 0xed, 0xfa, 0xcf],
    [0xca, 0xfe, 0xba, 0xbe],
    [0xce, 0xfa, 0xed, 0xfe],
  ];

  return signatures.some(
    (sig) =>
      buffer.length >= sig.length &&
      sig.every((byte, index) => buffer[index] === byte),
  );
}

function getMimeTypesForDetectedType(detectedMime: string): string[] {
  const alternatives: Record<string, string[]> = {
    "image/jpeg": ["image/jpeg"],
    "image/jpg": ["image/jpeg"],
    "image/png": ["image/png"],
    "image/gif": ["image/gif"],
    "image/webp": ["image/webp"],
    "application/pdf": ["application/pdf"],
  };

  return alternatives[detectedMime] || [detectedMime];
}

function getExpectedExtensions(mimeType: string): string[] {
  const mimeToExtensions: Record<string, string[]> = {
    "image/jpeg": [".jpg", ".jpeg"],
    "image/png": [".png"],
    "image/gif": [".gif"],
    "image/webp": [".webp"],
    "image/svg+xml": [".svg"],
    "image/bmp": [".bmp"],
    "image/tiff": [".tiff", ".tif"],

    "application/pdf": [".pdf"],
    "application/msword": [".doc"],
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [
      ".docx",
    ],
    "application/vnd.ms-excel": [".xls"],
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [
      ".xlsx",
    ],
    "application/vnd.ms-powerpoint": [".ppt"],
    "application/vnd.openxmlformats-officedocument.presentationml.presentation":
      [".pptx"],

    "text/plain": [".txt", ".md", ".log", ".csv"],
    "text/html": [".html", ".htm"],
    "text/css": [".css"],
    "text/javascript": [".js"],
    "application/javascript": [".js"],
    "application/json": [".json"],
    "application/xml": [".xml"],
    "text/csv": [".csv"],

    "application/zip": [".zip"],
    "application/x-rar-compressed": [".rar"],
    "application/x-7z-compressed": [".7z"],
    "application/gzip": [".gz"],
    "application/x-tar": [".tar"],

    "audio/mpeg": [".mp3"],
    "audio/wav": [".wav"],
    "audio/ogg": [".ogg"],
    "audio/mp4": [".m4a"],

    "video/mp4": [".mp4"],
    "video/webm": [".webm"],
    "video/ogg": [".ogv"],
    "video/avi": [".avi"],
    "video/quicktime": [".mov"],
  };

  return mimeToExtensions[mimeType] || [];
}
