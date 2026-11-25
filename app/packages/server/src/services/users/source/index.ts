import { createUserQuery } from "./create.js";
import { getAll, getTotal } from "./get-all.js";
import { getByEmail, getById, getByUsername } from "./get-by.js";
import { removeUserQuery } from "./remove.js";
import { updateUserQuery } from "./update.js";

export const userQueries = {
  getAll,
  getTotal,
  getByEmail,
  getById,
  getByUsername,

  create: createUserQuery,
  update: updateUserQuery,
  remove: removeUserQuery,
};
