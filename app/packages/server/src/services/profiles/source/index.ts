import { getByEmail, getById, getByUsername } from "./get-by.js";
import { updateProfileQuery } from "./update.js";

export const userQueries = {
  getByEmail,
  getById,
  getByUsername,
  update: updateProfileQuery,
};
