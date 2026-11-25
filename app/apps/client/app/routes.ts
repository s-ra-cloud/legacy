import type { RouteConfig } from "@react-router/dev/routes";
import { index, layout, prefix, route } from "@react-router/dev/routes";

export default [
  index("routes/index.tsx"),
  // ...prefix("auth", [
  //   layout("components/layouts/auth.tsx", [
  //     route("sign-in", "routes/auth/sign-in.tsx"),
  //     route("sign-up", "routes/auth/sign-up.tsx"),
  //     route("forgot-password", "routes/auth/forgot-password.tsx"),
  //     route("reset-password", "routes/auth/reset-password.tsx"),
  //   ]),
  // ]),
  route("contact-us", "routes/pages/contact-us.tsx"),
  route("privacy-policy", "routes/pages/privacy.tsx"),
  route("account-disabled", "routes/pages/account-disabled.tsx"),
  // public pages
  layout("components/layouts/public.tsx", [
    // ...prefix("auth", [
    //   route("reset-password", "routes/auth/reset-password.tsx"),
    // ]),
    ...prefix("/old-home", [
      index("routes/client/index.tsx"),
    ]),
  ]),
  
  layout("components/layouts/new-auth.tsx", [
    ...prefix("auth", [
      route("sign-in", "routes/auth/sign-in.tsx"),
      route("sign-up", "routes/auth/sign-up.tsx"),
      route("forgot-password", "routes/auth/forgot-password.tsx"),
    ]),
  ]),
  route("forbidden", "routes/pages/forbidden.tsx"),

  layout("components/layouts/new-client.tsx", [
    route("home", "routes/pages/newhome.tsx"),
    route("manifesto", "routes/manifesto/index.tsx"),
    route("team", "routes/team/index.tsx"),
    ...prefix("projects", [
      ...prefix("library", [
        index("routes/library/index.tsx"),
        route(":authorId", "routes/library/author-library.tsx"),
        route(":authorId/:bookId", "routes/library/book-content.tsx"),
      ]),
    ]),
    ...prefix("projects/great-conversation", [
      index("routes/great-conversation/index.tsx"),
    ]),
    ...prefix("projects/knowledge-tree", [
      index("routes/knowledge-tree/index.tsx"),
      route("graph", "routes/knowledge-tree/testing.tsx"),
    ]),
  ]),

  // private pages
  layout("components/layouts/private.tsx", [
    ...prefix("settings", [
      index("routes/settings/index.tsx"),
    ]),
    ...prefix("projects", [
      ...prefix("my-record", [
        index("routes/myrecord/index.tsx"),
      ]),
      ...prefix("library", [
        route("contribute", "routes/library/contribute.tsx"),
      ]),
      ...prefix("great-conversation", [
        route("contribute", "routes/great-conversation/authors-list.tsx"),
        route("contribute/:authorId", "routes/great-conversation/books-list.tsx"),
        route("contribute/:authorId/:bookId", "routes/great-conversation/book-content.tsx"),
      ]),
    ]),
    ...prefix("dashboard", [
      ...prefix("users", [
        index("routes/admin/users/index.tsx"),
        // route("create", "routes/admin/users/create.tsx"),
        route(":userId/edit", "routes/admin/users/edit.tsx"),
      ]),
    ]),
    ...prefix("projects/knowledge-tree", [
      route("contribute", "routes/knowledge-tree/contribute.tsx"),
      route("advanced-search", "routes/knowledge-tree/advanced-search.tsx"),
    ]),
  ]),

  // layout("components/layouts/private-kt.tsx", [
  // ]),

  // index file is here
  // layout("components/layouts/client.tsx", [
  //   route("profile", "routes/client/profile/index.tsx"),
  //   ...prefix("client", [
  //     index("./routes/client/index.tsx"),

  //   ]),
  // ]),

] satisfies RouteConfig;
