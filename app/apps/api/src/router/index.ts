import { Hono } from "hono";

import { mediaRouter } from "./media.js";

import { notificationRouter } from "./notifications.js";
import { profileRouter } from "./profile.js";
import { usersRouter } from "./users.js";
import { partnershipRouter } from "./partnership.js";
import { teamRouter } from "./team.js";
import { contributorsRouter } from "./contributors.js";
import { partnersRouter } from "./partners.js";
import { authorsRouter } from "./authors.js";
import { booksRouter } from "./books.js";
import { uploadMediaRouter } from "./upload-media.js";
import { gcContributionsRouter } from "./gc-contributions.js";
import { gcCommentsRouter } from "./gc-comments.js";
import { requestedBooksRouter } from "./requested-books.js";
import { homePhilosophersRouter } from "./home-philosophers.js";


const routes = new Hono();

routes.route("/users", usersRouter);
routes.route("/profile", profileRouter);
routes.route("/media", mediaRouter);
routes.route("/notifications", notificationRouter);
routes.route("/partnerships", partnershipRouter);
routes.route("/teams", teamRouter);
routes.route("/contributors", contributorsRouter);
routes.route("/partners", partnersRouter);
routes.route("/authors", authorsRouter);
routes.route("/books", booksRouter);
routes.route("/upload-media", uploadMediaRouter);
routes.route("/gc-contributions", gcContributionsRouter);
routes.route("/comments", gcCommentsRouter);
routes.route("/requested-books", requestedBooksRouter);
routes.route("/home-philosophers", homePhilosophersRouter);

export { routes };
