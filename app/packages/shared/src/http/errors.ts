type HttpStatus =
  | 200
  | 201
  | 400
  | 401
  | 403
  | 404
  | 405
  | 409
  | 422
  | 429
  | 500;

export interface ErrorOptions {
  code?: string;
  message: string;
  cause?: Error;
  root?: (string | { key: string; params?: Record<string, string> })[];
  fields?: { path: string; key: string; params?: Record<string, string> }[];
}

export class ValidationError extends Error {
  error;
  code;
  root;
  fields;
  status;

  constructor(status: HttpStatus, options: ErrorOptions) {
    super(options.message);
    this.error = true;
    this.code = options.code ?? "E_UNKNOWN";
    this.status = status;

    this.root = (options.root ?? []).map((value) =>
      typeof value === "string"
        ? {
            key: value,
            params: undefined,
            message: options.message ?? "",
          }
        : value,
    );
    this.fields = options.fields;
  }

  toJson() {
    return {
      error: true,
      code: this.code,
      message: this.message,
      fields: this.fields,
      root: this.root,
    };
  }
}
export function isValidationError(error: unknown) {
  const ret =
    error instanceof ValidationError ||
    (error !== null && typeof error === "object" && "message" in error);
  // "requestId" in error &&
  // "status" in error &&
  // "root" in error &&
  // "fields" in error);

  return ret;
}

export class RateLimitError extends ValidationError {
  constructor(options: ErrorOptions) {
    super(429, {
      ...options,
      code: "E_RATE_LIMIT",
    });
  }
}
// # sourceMappingURL=errors.js.map
