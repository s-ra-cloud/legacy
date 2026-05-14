import {
  booleanSchema,
  colorSchema,
  dateSchema,
  datetimeSchema,
  emailSchema,
  idSchema,
  imageUrlSchema,
  nameSchema,
  numberSchema,
  phoneNumberSchema,
  smallStringSchema,
  tinyStringSchema,
  zodArray,
  type UnionToArray
} from "@repo/shared/client";
import { z } from "zod";

// IMPORT END
// DON'T REMOVE END COMMENT BECAUSE IT IS USED TO GENERATE IMPORT

/*
 * Users Schema
 */

export const userRoles = [
  "ADMIN",
  "CLIENT",
  "MANAGER",
  "ACCESS_MANAGER",
] as const;
export const userStatuses = ["ENABLED", "DISABLED"] as const;

export const userRoleSchema = z.enum(userRoles).openapi({
  description: "The role of the user",
  example: "CLIENT",
});

export const userStatusSchema = z.enum(userStatuses).openapi({
  description: "The status of the user",
  example: "ENABLED",
});

export const userSchema = z.object({
  id: idSchema,
  name: nameSchema,
  firstName: nameSchema.optional(),
  lastName: nameSchema.optional(),

  email: emailSchema,
  emailVerified: z.boolean(),
  image: imageUrlSchema.optional(),
  imageId: idSchema.optional(),
  role: userRoleSchema,
  status: userStatusSchema,
  institution: smallStringSchema.optional(),

  phoneNumber: phoneNumberSchema.optional(),
  phoneNumberVerified: z.boolean(),

  createdAt: datetimeSchema,
  updatedAt: datetimeSchema,
});

/*
 * Notifications schema
 */

export const notificationTypes = ["NEUTRAL", "POSITIVE", "NEGATIVE"] as const;

export const notificationTypeSchema = z.enum(notificationTypes).openapi({
  description: "The type of the notification",
  example: "NEUTRAL",
});

export const notificationSchema = z.object({
  id: idSchema,
  title: smallStringSchema,
  message: smallStringSchema,

  type: notificationTypeSchema,
  tags: zodArray(tinyStringSchema),
  // maybe this should be a url schema validator or path
  route: smallStringSchema.optional(),

  creatorId: idSchema,

  target: z
    .object({
      roles: zodArray(userRoleSchema).optional(),
    })
    .optional(),

  createdAt: datetimeSchema,
  updatedAt: datetimeSchema,
});

export const userNotificationSchema = z.object({
  id: idSchema,

  seen: z.boolean().default(false),
  archived: z.boolean().default(false),
  clicked: z.boolean().default(false),

  userId: idSchema,
  notificationId: idSchema,
});


// END
// DON'T REMOVE END COMMENT BECAUSE IT IS USED TO GENERATE SCHEMA