import { userSchema } from "@repo/db/client";
import type { z } from "zod";
import "zod-openapi/extend";

const profileUpdateInputSchema = userSchema
  .partial()
  .pick({
    name: true,
    email: true,
    imageId: true,
    phoneNumber: true,
  })
  .openapi({
    description: "profile update input",
    ref: "ProfileUpdateInput",
  });

export const profileInputSchema = {
  update: profileUpdateInputSchema,
};

export type ProfileUpdateInput = z.infer<typeof profileUpdateInputSchema>;
