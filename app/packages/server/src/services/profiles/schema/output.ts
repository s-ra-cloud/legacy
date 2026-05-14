import { mutationIdResponseSchema } from "@repo/shared/client";
import type { z } from "zod";

const update = mutationIdResponseSchema.openapi({
  description: "User update response",
  // ref: 'UserUpdateResponse',
});

export const profileOutputSchema = {
  update,
};

export type ProfileUpdateOutput = z.infer<typeof update>;
