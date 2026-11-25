import type { QueryKey } from "@tanstack/react-query";

declare module "@tanstack/react-query" {
  interface Register {
    // queryMeta: MyMeta
    mutationMeta: {
      // can make it type safe form api
      invalidates?: Array<QueryKey>;
    };
  }
}
