export default {
  routes: [{
    method: "POST",
    path: "/books/:documentId/replace-text",
    handler: "book.replaceText",
    config: { auth: false },
  }],
};
