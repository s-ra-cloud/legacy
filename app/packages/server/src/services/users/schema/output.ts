import { userSchema } from "@repo/db/client";
import {
  mutationIdResponseSchema,
  paginationOutputSchema,
} from "@repo/shared/client";
import { z } from "zod";

const many = z
  .object({
    items: userSchema.array(),
    pagination: paginationOutputSchema,
  })
  .openapi({
    description: "User list",
    // ref: 'UserPaginatedListResponse',
  });

const one = userSchema.openapi({
  description: "User",
  // ref: 'UserGetOneResponse',
});

const create = mutationIdResponseSchema.openapi({
  description: "User create response",
  // ref: 'UserCreateResponse',
});
const update = mutationIdResponseSchema.openapi({
  description: "User update response",
  // ref: 'UserUpdateResponse',
});
const remove = mutationIdResponseSchema.openapi({
  description: "User remove response",
  // ref: 'UserRemoveResponse',
});

export const userOutputSchema = {
  many,
  one,
  create,
  update,
  remove,
};

export type UserOneOutput = z.infer<typeof one>;
export type UserManyOutput = z.infer<typeof many>;
export type UserCreateOutput = z.infer<typeof create>;
export type UserUpdateOutput = z.infer<typeof update>;
export type UserRemoveOutput = z.infer<typeof remove>;
