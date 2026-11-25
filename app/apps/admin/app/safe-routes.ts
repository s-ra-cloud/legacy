import { pathResolver } from "./types/path-resolver";

export const routes = {
  HOME: "accueil",

  ADMIN_USERS: "users",
  ADMIN_USER_CREATE: "users/create",
  ADMIN_USER_EDIT: "users/:userId/edit",
  ADMIN_USER_SHOW: "users/:userId",
  ADMIN_PROFILE: "profile",

 // END
  // DON'T REMOVE END COMMENT BECAUSE IT IS USED TO GENERATE SAFE ROUTES
} as const;

export const SAFE_ROUTES = Object.freeze(pathResolver(routes));
