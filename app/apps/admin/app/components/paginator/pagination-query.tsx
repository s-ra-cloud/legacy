import type { PaginationResponse } from "@repo/server/client";
import type { UseQueryResult } from "@tanstack/react-query";

export function paginationFromQuery<T>(
  query: UseQueryResult<PaginationResponse<T>, unknown>,
) {
  const defaultPagination = {
    pageIndex: -1,
    pageSize: -1,
    rowCount: -1,
  };
  if (!query.data) return defaultPagination;
  return {
    pageIndex: query.data.pagination.page - 1,
    pageSize: query.data.pagination.limit,
    rowCount: query.data.pagination.total,
  };
}
