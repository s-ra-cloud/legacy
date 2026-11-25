import { type ValidationError, isValidationError } from "@repo/shared/client";
import type { UseFormReturn } from "react-hook-form";
import { toast } from "sonner";

export function handleCommonErrors(
  // biome-ignore lint/suspicious/noExplicitAny: <explanation>
  form: UseFormReturn<any>,
  error: unknown,
): boolean {
  if (!isValidationError(error)) return false;

  const verror = error as ValidationError;

  switch (verror.status) {
    case 400:
      toast.error("Please check your input");
      break;
    case 401:
      toast.error("You are not authorized");
      break;
    case 403:
      toast.error("You are not allowed to perform this action");
      break;
    case 409:
      toast.error("Record already exists");
      break;
    case 404:
      toast.error("Resource not found");
      break;
    case 429:
      toast.error("Too many requests, please try again later");
      break;
    case 500:
      toast.error("Internal server error");
      break;
    default:
      toast.error("Something went wrong");
      break;
  }

  for (const field of verror.fields ?? []) {
    form.setError(field.path, { message: field.key });
  }

  if (verror.root && typeof verror.root === "string") {
    form.setError("root", { message: verror.root });
  }
  if (verror.root && Array.isArray(verror.root)) {
    form.setError("root", { message: verror.root.join(", ") });
  }

  return true;
}

export function toastUnknownError(msg = "An unexpected error occurred") {
  toast.error(msg);
}
