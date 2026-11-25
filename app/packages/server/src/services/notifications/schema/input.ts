import type { NotificationTags, UserRole } from "@repo/db";
import { notificationSchema, userNotificationSchema } from "@repo/db";
import { booleanStrSchema, querySchema } from "@repo/shared";
import { z } from "zod";

export const notificationManyInputSchema = z
  .object({
    tag: notificationSchema.shape.tags.optional(),
    archived: booleanStrSchema.default("false"),
    seen: booleanStrSchema.optional(),
  })
  .merge(querySchema);

export const notificationUpdateInputSchema = z
  .object({
    seen: userNotificationSchema.shape.seen.optional(),
    archived: userNotificationSchema.shape.archived.optional(),
    clicked: userNotificationSchema.shape.clicked.optional(),
  })
  .refine(
    (data) => {
      if (!data.seen && !data.archived && !data.clicked) {
        return false;
      }
      return true;
    },
    {
      message: "At least one of seen, archived, or clicked must be set",
    },
  );

export type NotificationUpdateInput = z.infer<
  typeof notificationUpdateInputSchema
>;
export type NotificationManyInput = z.infer<typeof notificationManyInputSchema>;

export type NotificationCreateInput = {
  title: string;
  message: string;
  tags: NotificationTags[];
  route?: string;
  mailContent?: {
    subject: string;
    body: string;
  };
} & (
  | {
      userIds: string[];
    }
  | {
      roles: UserRole[];
    }
);

export const notificationInputSchema = {
  many: notificationManyInputSchema,
  update: notificationUpdateInputSchema,
};
