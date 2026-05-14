import {
  notificationSchema,
  userNotificationSchema,
  userSchema,
} from "@repo/db";
import { mutationIdResponseSchema, paginationOutputSchema } from "@repo/shared";
import { z } from "zod";

const many = z
  .object({
    items: z.array(
      notificationSchema.extend({
        user: userSchema,
        userNotification: userNotificationSchema,
      }),
    ),
    pagination: paginationOutputSchema,
  })
  .openapi({
    description: "Notification list",
    // ref: 'NotificationPaginatedListResponse',
  });

const one = notificationSchema
  .extend({
    user: userSchema,
    userNotification: userNotificationSchema,
  })
  .openapi({
    description: "Notification",
    // ref: 'NotificationGetOneResponse',
  });

const countUnseen = z.object({
  count: z.number(),
});

const create = mutationIdResponseSchema.openapi({
  description: "Notification create response",
  // ref: 'NotificationCreateResponse',
});
const update = mutationIdResponseSchema.openapi({
  description: "Notification update response",
  // ref: 'NotificationUpdateResponse',
});
const remove = mutationIdResponseSchema.openapi({
  description: "Notification remove response",
  // ref: 'NotificationRemoveResponse',
});

export const notificationOutputSchema = {
  many,
  one,
  countUnseen,
  create,
  update,
  remove,
};

export type NotificationOneOutput = z.infer<typeof one>;
export type NotificationManyOutput = z.infer<typeof many>;
export type NotificationCreateOutput = z.infer<typeof create>;
export type NotificationUpdateOutput = z.infer<typeof update>;
export type NotificationRemoveOutput = z.infer<typeof remove>;
export type NotificationCountUnseenOutput = z.infer<typeof countUnseen>;
