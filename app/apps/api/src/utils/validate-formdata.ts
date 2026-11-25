import type { Context } from "hono";
import { validator } from "hono/validator";
import { type ZodSchema } from "zod";

export const formValidator = <T>(schema: ZodSchema<T>) => {
  return validator("form", async (value, c: Context) => {
    const entries = Object.entries(value).map(([key, _value]) => {
      if (Array.isArray(_value) && _value.every((v) => v instanceof File)) {
        return [key, _value];
      }
      if (_value instanceof File) {
        return [key, [_value]];
      }
      return [key, _value];
    });

    const newValues = Object.fromEntries(entries);

    const result = schema.safeParse(newValues);

    if (!result.success) {
      return c.json({ error: result.error }, 400);
    }
    return result.data;
  });
};
