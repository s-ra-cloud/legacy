import { pathResolver } from "./types/path-resolver";

export const routes = {
  CLIENT: "client",
  AUTH_SIGN_IN: "auth/sign-in",
  AUTH_SIGN_UP: "auth/sign-up",
  AUTH_FORGOT_PASSWORD: "auth/forgot-password",
  AUTH_RESET_PASSWORD: "auth/reset-password",
  CONTACT_US: "contact-us",
  PRIVACY_POLICY: "privacy-policy",
  PROFILE: "profile",
  CLIENT_INDEX: "client",
  CLIENT_PROFILE: "client/profile",

  TEAM: "team",
  HOME: "home",
  MANIFESTO: "manifesto",
  SIGN_IN: "auth/sign-in",
  SIGN_UP: "auth/sign-up",
  PROJECTS_CONVERSATION: "projects/great-conversation",
  PROJECTS_LIBRARY: "projects/library",
  PROJECTS_TREE: "projects/knowledge-tree",
  PROJECTS_TREE_GRAPH: "projects/knowledge-tree/graph",
  MY_RECORD: "projects/my-record",
  SETTINGS: "settings",
  PROJECTS_LIBRARY_CONTRIBUTE: "projects/library/contribute",
  PROJECTS_CONVERSATION_CONTRIBUTE: "projects/great-conversation/contribute",
  PROJECTS_TREE_CONTRIBUTE: "projects/knowledge-tree/contribute",


  // ADMIN
  ADMIN_USERS: "dashboard/users",
  ADMIN_USER_CREATE: "dashboard/users/create",
  ADMIN_USER_EDIT: "dashboard/users/:userId/edit",
  ADMIN_USER_SHOW: "dashboard/users/:userId",
} as const;

export const SAFE_ROUTES = Object.freeze(pathResolver(routes));
