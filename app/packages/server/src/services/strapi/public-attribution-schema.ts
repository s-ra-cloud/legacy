import { z } from "zod";

// A saved display field is not permission to publish an account address.
export const publicAttributionTextSchema = z.string().nullish().transform((value) => {
  const text = value?.trim();
  return text && !text.includes("@") ? text : null;
});
