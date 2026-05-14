import { z } from "zod";
import "zod-openapi/extend";

export const paginationInputSchema = z.object({
  cursor: z.coerce.number().gt(0).default(1),
  limit: z.coerce.number().gt(0).max(100).default(10),
});

export const paginationOutputSchema = z.object({
  size: z.number().min(0),
  total: z.number().min(0),
  page: z.number().min(0),
  limit: z.number().min(0),
});

export const booleanStrSchema = z
  .preprocess((it: unknown) => {
    return it === "true" || it === true;
  }, z.boolean())
  .openapi({
    description:
      "Boolean value or true any other value will be considered as false",
    example: true,
  });

export const booleanSchema = z.boolean().openapi({
  description: "Boolean value",
  example: true,
});

export const numberSchema = z.coerce.number();
export const tinyStringSchema = z.string().trim().min(1).max(25).trim();
export const smallStringSchema = z.string().trim().min(3).max(255).trim();
export const simplePasswordSchema = z.string().trim().min(4).max(255).openapi({
  description: "Password of the resource",
  example: "password123",
});

export const idSchema = z.string().min(4).max(50).openapi({
  example: "cuida1b2c3d4e5f6g7h8i9j",
  description: "ID of the resource",
});

export const paramIdSchema = z.object({ id: idSchema });
export const querySchema = z
  .object({
    q: tinyStringSchema.optional().openapi({
      description: "Query string",
      example: "search term",
    }),
  })
  .merge(paginationInputSchema);

export const datetimeSchema = z.string().datetime({ offset: true });
export const dateSchema = z.string().date();
export const imageUrlSchema = z.string().url().openapi({
  description: "Image URL",
  example: "https://example.com/image.jpg",
});

export const nameSchema = z.string().min(2).max(255).trim().openapi({
  description: "Name of the resource",
  example: "John Doe",
});

export const emailSchema = z.string().email().trim().openapi({
  description: "Email of the resource",
  example: "example@example.com",
});

export const paramEmailSchema = z.object({ email: emailSchema });
export const descriptionSchema = z.string().min(2).max(65535).trim().openapi({
  description: "Description of the resource",
  example: "This is a description",
});
export const phoneNumberSchema = z.string().min(8).max(20).trim().openapi({
  description: "Phone number of the resource",
  example: "+1234567890",
});

export const colorSchema = z
  .string()
  .regex(/^#([0-9a-f]{6})$/i)
  .openapi({
    description: "Color of the resource",
    example: "#F0F0F0",
  });

export const emptySchema = z.object({});

export const mutationIdResponseSchema = z.object({
  id: idSchema,
  message: z.string().optional().openapi({
    description: "Message of the response",
    example: "Resource created successfully",
  }),
});

export const successResponseSchema = z.object({
  message: z.string().optional().openapi({
    description: "Message of the response",
    example: "Resource created successfully",
  }),
});

export function zodArray<S extends z.ZodTypeAny>(schema: S) {
  return z.preprocess((it: unknown) => {
    if (Array.isArray(it)) {
      return it;
    }
    if (it === undefined || it === null) {
      return undefined;
    }
    return [it];
  }, z.array(schema));
}

export type PaginationOutput = z.infer<typeof paginationOutputSchema>;
export type ParamIdSchema = z.infer<typeof paramIdSchema>;
export type ParamEmailSchema = z.infer<typeof paramEmailSchema>;