export default {
  routes: [
    {
      method: "POST",
      path: "/requested-books/owner-history",
      handler: "requested-book.ownerHistory",
      config: { auth: false },
    },
    {
      method: "POST",
      path: "/requested-books/admin-review",
      handler: "requested-book.adminReview",
      config: { auth: false },
    },
  ],
};
