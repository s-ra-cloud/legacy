import type { ErrorOptions } from "./errors.js";
import { ValidationError } from "./errors.js";

type Options = Omit<ErrorOptions, "message">;

export function invariantBadRequest(
  condition: unknown,
  message: string,
  options?: Options,
): asserts condition {
  if (condition) return;
  throw new ValidationError(400, {
    message,
    root: ["BAD_REQUEST"],
    ...options,
  });
}

export function invariantUnauthorized(
  condition: unknown,
  options?: Options,
): asserts condition {
  if (condition) return;
  throw new ValidationError(401, {
    message: "Unauthorized",
    root: ["UNAUTHORIZED"],
    ...options,
  });
}

export function invariantForbidden(
  condition: unknown,
  options?: Options,
): asserts condition {
  if (condition) return;
  throw new ValidationError(403, {
    message: "Forbidden",
    root: ["FORBIDDEN"],
    ...options,
  });
}

export function invariantNotFound(
  condition: unknown,
  options?: Options,
): asserts condition {
  if (condition) return;
  throw new ValidationError(404, {
    message: "Not Found",
    root: ["NOT_FOUND"],
    ...options,
  });
}

export function invariantMethodNotAllowed(
  condition: unknown,
  options?: Options,
): asserts condition {
  if (condition) return;
  throw new ValidationError(405, {
    message: "Method Not Allowed",
    root: ["METHOD_NOT_ALLOWED"],
    ...options,
  });
}

export function invariantConflict(
  condition: unknown,
  options?: Options,
): asserts condition {
  if (condition) return;
  throw new ValidationError(409, {
    message: "Conflict",
    root: ["CONFLICT"],
    ...options,
  });
}

export function invariantUnknown(
  condition: unknown,
  options?: Options,
): asserts condition {
  if (condition) return;
  throw new ValidationError(500, {
    message: "Unknown Error",
    root: ["UNKNOWN_ERROR"],
    ...options,
  });
}
