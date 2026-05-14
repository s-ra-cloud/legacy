import { createId } from "@paralleldrive/cuid2";
import { jsonValue } from "@repo/db";
import { env } from "@repo/shared";
import type { ServiceContext } from "../../context.js";
import { transporter } from "../../lib/mailer.js";
import { buildPagination } from "../../utils/pagination.js";
import type {
  NotificationCreateInput,
  NotificationManyInput,
  NotificationUpdateInput,
} from "./schema/input.js";

export * from "./schema/input.js";
export * from "./schema/output.js";

async function getAll(ctx: ServiceContext, input: NotificationManyInput) {
  const { cursor, limit } = input;
  const baseQuery = ctx.db
    .selectFrom("userNotifications as un")
    .leftJoin("notifications as n", "n.id", "un.notificationId")
    .innerJoin("users as u", "u.id", "n.creatorId")
    .where("un.userId", "=", ctx.user.id)
    .where("un.archived", "=", input.archived)
    .$if(!!input.tag && input.tag.length > 0, (qb) =>
      qb.where("n.tags", "@>", jsonValue(input.tag!)),
    )
    .$if(typeof input.seen !== "undefined", (qb) =>
      qb.where("un.seen", "=", !!input.seen),
    );

  const notifications = await baseQuery
    .selectAll("n")
    .select((eb) => eb.fn.toJson("un").as("userNotification"))
    .select((eb) => eb.fn.toJson("u").as("user"))
    .limit(limit)
    .offset((cursor - 1) * limit)
    .orderBy("n.createdAt", "desc")
    .execute();

  const { total } = await baseQuery
    .select(({ fn, eb }) => [
      eb.cast<number>(fn.countAll("un"), "integer").as("total"),
    ])
    .executeTakeFirstOrThrow();

  if (notifications.length !== 0) {
    await ctx.db
      .updateTable("userNotifications")
      .set({ seen: true })
      .where(
        "id",
        "in",
        notifications.map((n) => n.userNotification.id),
      )
      .execute();
  }

  return buildPagination(notifications, { total, cursor, limit });
}

async function countSeen(ctx: ServiceContext) {
  const { total } = await ctx.db
    .selectFrom("userNotifications as un")
    .where("userId", "=", ctx.user.id)
    .where("seen", "=", false)
    .select(({ fn, eb }) => [
      eb.cast<number>(fn.countAll("un"), "integer").as("total"),
    ])
    .executeTakeFirstOrThrow();
  return { count: total ?? 0 };
}

async function update(
  ctx: ServiceContext,
  input: NotificationUpdateInput,
  param: { id: string },
) {
  const notification = await ctx.db
    .selectFrom("userNotifications as un")
    .innerJoin("notifications as n", "n.id", "un.notificationId")
    .select(["n.id", "n.route"])
    .where("un.id", "=", param.id)
    .executeTakeFirstOrThrow();
  await ctx.db
    .updateTable("userNotifications")
    .set(input)
    .where("id", "=", param.id)
    .where("userId", "=", ctx.user.id)
    .execute();
  if (input.clicked === true) {
    return { success: true, redirect: notification.route };
  }
  return { success: true };
}

async function create(ctx: ServiceContext, input: NotificationCreateInput) {
  return ctx.db.transaction().execute(async (trx) => {
    let users = [];
    let notificationData;
    if ("userIds" in input) {
      users = await trx
        .selectFrom("users")
        .where("id", "in", input.userIds)
        .select(["id", "email"])
        .execute();
      notificationData = {};
    } else {
      const { roles } = input;
      users = await trx
        .selectFrom("users")
        // .where('services', '@>', `{"${service}"}` as unknown as [])
        .where("role", "in", roles)
        // .where('status', '=', 'ENABLED')
        .select(["id", "email"])
        .execute();
      notificationData = {
        target: {
          // service,
          roles,
        },
      };
    }
    const { id } = await trx
      .insertInto("notifications")
      .values({
        id: createId(),
        creatorId: ctx.user.id,
        tags: input.tags,
        title: input.title,
        message: input.message,
        route: input.route,
        ...notificationData,
      })
      .returning("id")
      .executeTakeFirstOrThrow();

    if (users.length > 0) {
      await trx
        .insertInto("userNotifications")
        .values(
          users.map((user) => {
            return {
              id: createId(),
              userId: user.id,
              notificationId: id,
              seen: false,
              archived: false,
            };
          }),
        )
        .execute();
    }

    if (input.mailContent) {
      for (const user of users) {
        await transporter.sendMail({
          from: env.EMAIL_FROM,
          to: user.email,
          subject: input.mailContent.subject,
          html: input.mailContent.body,
        });
      }
    }
    return { id };
  });
}

async function markAllAsRead(ctx: ServiceContext) {
  await ctx.db
    .updateTable("userNotifications")
    .set({ seen: true })
    .where("userId", "=", ctx.user.id)
    .execute();
  return { success: true };
}

export const notificationService = {
  getAll,
  countUnseen: countSeen,
  update,
  create,
  markAllAsRead,
};
