import { userSchema, userStatuses } from "@repo/db/client";
import {
  createBooleanFilterSchema,
  createDateFilterSchema,
  createEnumFilterSchema,
  createNumberFilterSchema,
  createStringFilterSchema,
  emptySchema,
  querySchema,
} from "@repo/shared/client";
import { z } from "zod";
import "zod-openapi/extend";

export const userManyInputSchema = z
  .object({
    ...createStringFilterSchema("id"),
    ...createStringFilterSchema("name"),
    ...createEnumFilterSchema("status", userStatuses),
    ...createDateFilterSchema("createdAt"),
    ...createDateFilterSchema("updatedAt"),
    ...createNumberFilterSchema("age"),
    ...createBooleanFilterSchema("isActive"),
  })
  .merge(querySchema)
  .openapi({
    description: "query params for user list",
  });

export const userOneInputSchema = z
  .object({
    ...createStringFilterSchema("name"),
  })
  .openapi({
    description: "query params for user",
  });

export const userCreateInputSchema = userSchema
  .pick({
    name: true,
    email: true,
    role: true,
    institution: true,
  })
  .openapi({
    description: "user create input",
    ref: "UserCreateInput",
  });

export const userUpdateInputSchema = userSchema
  .partial()
  .pick({
    name: true,
    firstName: true,
    lastName: true,
    email: true,
    emailVerified: true,
    role: true,
    status: true,
    institution: true,
  })
  .extend({
    institution: z.string().nullish(),
  })
  .openapi({
    description: "user update input",
    ref: "UserUpdateInput",
  });

export const userRemoveInputSchema = emptySchema.openapi({
  description: "user remove input",
  ref: "UserRemoveInput",
});

export const userInputSchema = {
  many: userManyInputSchema,
  one: userOneInputSchema,
  create: userCreateInputSchema,
  update: userUpdateInputSchema,
  remove: userRemoveInputSchema,
};

export type UserManyInput = z.infer<typeof userManyInputSchema>;
export type UserOneInput = z.infer<typeof userOneInputSchema>;
export type UserCreateInput = z.infer<typeof userCreateInputSchema>;
export type UserUpdateInput = z.infer<typeof userUpdateInputSchema>;
export type UserRemoveInput = z.infer<typeof userRemoveInputSchema>;
