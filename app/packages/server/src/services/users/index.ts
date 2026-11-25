import { createId } from "@paralleldrive/cuid2";
import type { ParamEmailSchema, ParamIdSchema } from "@repo/shared";
import { ValidationError, invariantNotFound } from "@repo/shared";
import type { ServiceContext } from "../../context.js";
import { transactionFromCtx } from "../../utils/kysely/transaction.js";
import { ctxLog } from "../../utils/logger/console.js";
import { buildPagination } from "../../utils/pagination.js";
import type {
  UserCreateInput,
  UserManyInput,
  UserOneInput,
  UserUpdateInput,
} from "./schema/input.js";
import { createUserQuery } from "./source/create.js";
import { getById } from "./source/get-by.js";
import { userQueries } from "./source/index.js";
import { removeUserQuery } from "./source/remove.js";
import { updateUserQuery } from "./source/update.js";

export * from "./schema/input.js";
export * from "./schema/output.js";

async function getAll(ctx: ServiceContext, input: UserManyInput) {
  ctxLog(ctx, "User/GetAll", { input });
  const users = await userQueries.getAll(ctx, input);

  return buildPagination(users, {
    total: await userQueries.getTotal(ctx, input),
    cursor: input.cursor,
    limit: input.limit,
  });
}

async function get(
  ctx: ServiceContext,
  params: ParamIdSchema,
  _input: UserOneInput,
) {
  const user = await getById(ctx, params.id);

  invariantNotFound(user);

  return user;
}

async function getByEmail(
  ctx: ServiceContext,
  params: ParamEmailSchema,
  _input: UserOneInput,
) {
  const user = await userQueries.getByEmail(ctx, params.email);

  invariantNotFound(user);

  return user;
}

async function create(ctx: ServiceContext, input: UserCreateInput) {
  const dblogger = ctx.logger;
  ctxLog(ctx, "User/Create", { input });
  return await transactionFromCtx(ctx, async (ctx) => {
    const userByEmail = await userQueries.getByEmail(ctx, input.email);
    if (userByEmail) {
      throw new ValidationError(409, {
        code: "EMAIL_ALREADY_EXISTS",
        message: "Email already exists",
        fields: [
          {
            path: "email",
            key: "USER_EMAIL_EXISTS",
          },
        ],
      });
    }
    const user = await createUserQuery(ctx, {
      id: createId(),
      firstName: input.name.split(" ")[0] ?? "",
      lastName: input.name.split(" ")[1] ?? "",
      ...input,
    });
    ctxLog(ctx, "User/Created", { user });
    dblogger.log("CREATE_USER", {
      name: input.name,
      email: input.email,
    });
    return { id: user.id };
  });
}

async function update(
  ctx: ServiceContext,
  params: ParamIdSchema,
  input: UserUpdateInput,
) {
  const dblogger = ctx.logger;
  ctxLog(ctx, "User/Update", { id: params.id, input });
  return await transactionFromCtx(ctx, async (ctx) => {
    const oldUser = await getById(ctx, params.id);
    invariantNotFound(oldUser);

    await updateUserQuery(ctx, params.id, input);
    ctxLog(ctx, "User/Updated", { id: params.id });
    dblogger.log("UPDATE_USER", {
      name: {
        old: oldUser.name,
        new: input.name,
      },
      imageId: {
        old: oldUser.imageId ?? "",
        new: "",
      },
    });
    return { id: oldUser.id };
  });
}

async function remove(ctx: ServiceContext, params: ParamIdSchema) {
  ctxLog(ctx, "User/Remove", { id: params.id });
  return await transactionFromCtx(ctx, async (ctx) => {
    await removeUserQuery(ctx, params.id);
    const oldUser = await getById(ctx, params.id);
    invariantNotFound(oldUser);
    ctxLog(ctx, "User/Removed", { id: params.id });
    return { id: params.id };
  });
}

export const userService = {
  getAll,
  get,
  getByEmail,
  create,
  update,
  remove,
};
