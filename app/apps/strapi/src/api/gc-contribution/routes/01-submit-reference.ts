export default {
  routes: [
    {
      method: "POST",
      path: "/gc-contributions/attribution-identities",
      handler: "gc-contribution.attributionIdentities",
      config: { auth: false },
    },
    {
      method: "POST",
      path: "/gc-contributions/owner-history",
      handler: "gc-contribution.ownerHistory",
      config: { auth: false },
    },
    {
      method: "POST",
      path: "/gc-contributions/owner-reference",
      handler: "gc-contribution.ownerReference",
      config: { auth: false },
    },
    {
      method: "POST",
      path: "/gc-contributions/submit-reference",
      handler: "gc-contribution.submitReference",
      // Contributor authentication happens at Hono. CMS accepts only a fresh,
      // purpose-bound server signature covering the full payload and actor.
      config: { auth: false },
    },
    {
      method: "POST",
      path: "/gc-contributions/admin-edit",
      handler: "gc-contribution.adminEdit",
      // Admin authorization happens at Hono; Strapi accepts only a fresh,
      // purpose-bound signature from that authenticated server.
      config: { auth: false },
    },
    {
      method: "POST",
      path: "/gc-contributions/resume-reference",
      handler: "gc-contribution.resumeReference",
      config: { auth: false },
    },
    {
      method: "POST",
      path: "/gc-contributions/admin-decision",
      handler: "gc-contribution.adminDecision",
      config: { auth: false },
    },
  ],
};
