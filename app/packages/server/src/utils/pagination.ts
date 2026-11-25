export interface PaginationResponse<T> {
  items: T[];
  pagination: {
    size: number;
    total: number;
    page: number;
    limit: number;
  };
}

interface PaginationProps {
  total: number;
  cursor: number;
  limit: number;
}

export function buildPagination<T>(
  items: T[],
  { total, cursor, limit }: PaginationProps,
): PaginationResponse<T> {
  return {
    items,
    pagination: {
      total,
      size: items.length,
      page: cursor,
      limit,
    },
  };
}
