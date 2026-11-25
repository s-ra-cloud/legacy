import {
  MutationCache,
  QueryClient,
  QueryClientProvider,
  matchQuery,
} from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { useState } from "react";

export function ReactQueryProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // With SSR, we usually want to set some default staleTime
            // above 0 to avoid refetching immediately on the client
            staleTime: 60 * 1000,
          },
        },
        mutationCache: new MutationCache({
          onSuccess: (_data, _variables, _context, mutation) => {
            queryClient.invalidateQueries({
              predicate: (query) =>
                mutation.meta?.invalidates?.some((queryKey) =>
                  matchQuery({ queryKey }, query),
                ) ?? true,
            });
          },
        }),
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ReactQueryDevtools initialIsOpen={false} />
      {children}
    </QueryClientProvider>
  );
}
