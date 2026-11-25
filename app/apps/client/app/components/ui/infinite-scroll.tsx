import type { PaginationResponse } from "@repo/server";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useVirtualizer } from "@tanstack/react-virtual";
import type React from "react";
import { useEffect, useRef } from "react";
import type { GetAllResourceOperationInfinityScroll } from "~/lib/api/client";
import { cn } from "~/lib/utils";

export type InfiniteScrollProps = {
  limit?: number;
  className?: string;
  queryParams?: Record<
    string,
    string | number | boolean | null | (string | number)[]
  >;
  EmptyComponent?: () => React.JSX.Element;
  ErrorComponent?: (props: { error: unknown }) => React.JSX.Element;
  LoadingComponent?: () => React.JSX.Element;
  estimateSize?: number;
} & GetAllResourceOperationInfinityScroll;

export default function InfiniteScroll<T>({
  endpoint,
  renderItem,
  limit = 10,
  className,
  queryParams = {},
  EmptyComponent,
  ErrorComponent,
  LoadingComponent,
  estimateSize = 100,
}: InfiniteScrollProps) {
  const parentRef = useRef<HTMLDivElement>(null);

  const baseSearchParams = new URLSearchParams();
  // biome-ignore lint/complexity/noForEach: <explanation>
  Object.entries(queryParams).forEach(([key, value]) => {
    if (value !== null) {
      baseSearchParams.append(key, value.toString());
    }
  });
  const baseQueryString = baseSearchParams.toString();

  const fetchData = async ({ pageParam = 1 }) => {
    const searchParams = new URLSearchParams({
      cursor: pageParam.toString(),
      limit: limit.toString(),
    });

    const queryString = baseQueryString
      ? `${searchParams.toString()}&${baseQueryString}`
      : searchParams.toString();

    const response = await fetch(`/api/v1${endpoint}?${queryString}`);
    const data = (await response.json()) as PaginationResponse<T>;

    const hasMore = data.pagination.page * limit < data.pagination.total;
    return {
      items: data.items,
      pagination: data.pagination,
      nextCursor: hasMore ? pageParam + 1 : undefined,
    };
  };

  const {
    data,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    status,
  } = useInfiniteQuery({
    queryKey: [endpoint, limit, queryParams],
    queryFn: fetchData,
    getNextPageParam: (lastPage) => {
      return lastPage.nextCursor;
    },
    initialPageParam: 1,
  });

  const allItems = data?.pages.flatMap((page) => page.items) ?? [];

  const virtualizer = useVirtualizer({
    count: hasNextPage ? allItems.length + 1 : allItems.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => estimateSize,
    overscan: 0,
  });

  // biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
  useEffect(() => {
    const [lastItem] = [...virtualizer.getVirtualItems()].reverse();

    if (!lastItem) {
      return;
    }

    if (
      lastItem.index >= allItems.length - 1 &&
      hasNextPage &&
      !isFetchingNextPage
    ) {
      void fetchNextPage();
    }
  }, [
    hasNextPage,
    fetchNextPage,
    allItems.length,
    isFetchingNextPage,
    virtualizer.getVirtualItems(),
  ]);

  if (status === "pending")
    return LoadingComponent ? <LoadingComponent /> : null;
  if (status === "error")
    return ErrorComponent ? <ErrorComponent error={error} /> : null;
  if (allItems.length === 0) return EmptyComponent ? <EmptyComponent /> : null;

  return (
    <div
      ref={parentRef}
      className={cn("better-scrollbar h-full w-full overflow-auto", className)}
    >
      <div
        className="relative w-full"
        style={{
          height: `${virtualizer.getTotalSize()}px`,
        }}
      >
        {virtualizer.getVirtualItems().map((virtualRow) => {
          const isLoaderRow = virtualRow.index > allItems.length - 1;
          const item = allItems[virtualRow.index];

          return (
            <div
              key={virtualRow.key}
              data-index={virtualRow.index}
              ref={virtualizer.measureElement}
              className={cn(
                isLoaderRow && "flex items-center justify-center py-4",
                "absolute top-0 left-0 w-full",
              )}
              style={{
                transform: `translateY(${virtualRow.start}px)`,
                // height: `${virtualRow.size}px`,
              }}
            >
              {isLoaderRow
                ? hasNextPage
                  ? "Loading more..."
                  : "No more data to load"
                : item
                  ? // @ts-expect-error handle type error
                  renderItem(item)
                  : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
