import type {
  ColumnDef,
  PaginationOptions,
  PaginationState,
  VisibilityState,
} from "@tanstack/react-table";
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";

import { parseAsInteger, useQueryStates } from "nuqs";
import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { cn } from "~/lib/utils";
import { m } from "~/paraglide/messages";
import type { zodToFiltersOutput } from "~/utils/nuqs/zod-to-filters";
import { Paginator } from "../paginator";
import { ScrollArea, ScrollBar } from "../ui/scroll-area";
import { TableColumnsSelector } from "./table/columns-selector";
import { TableFilters } from "./table/filters";
import { TableGlobalSearch } from "./table/global-search";
import { TableReset } from "./table/reset";
import { ShadTableRowsSkeleton } from "./table/skeleton";

interface DataTableProps<TData, TValue> {
  filters: zodToFiltersOutput;
  queryParams?: Record<string, string | unknown | undefined>;
  setQueryParams?: (
    queryParams: Record<string, string | unknown | undefined>,
  ) => void;
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  pagination: PaginationState;
  paginationOptions: Pick<PaginationOptions, "rowCount">;
  isLoading: boolean;
  onPaginationChange?: (pagination: PaginationState) => void;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  pagination,
  paginationOptions,
  filters,
  isLoading,
  onPaginationChange,
}: DataTableProps<TData, TValue>) {
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [_, setPaginationFilters] = useQueryStates({
    cursor: parseAsInteger.withDefault(1),
    limit: parseAsInteger.withDefault(10),
  });
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    ...paginationOptions,
    manualPagination: true,
    onPaginationChange: (_pagination) => {
      const res =
        typeof _pagination === "function"
          ? _pagination(pagination)
          : _pagination;
      if (onPaginationChange) {
        onPaginationChange(res);
        return;
      }
      setPaginationFilters({
        cursor: res.pageIndex + 1,
        limit: res.pageSize,
      }).catch(console.error);
    },
    state: { pagination, columnVisibility },
  });

  return (
    <div className="flex min-h-[420px] flex-col gap-1 overflow-hidden rounded border bg-sidebar">
      <div className="flex items-center justify-between gap-2 p-2 ">
        <TableGlobalSearch />
        <TableFilters filters={filters} />
        <div className="grow"></div>
        <TableColumnsSelector table={table} />
        <TableReset />
      </div>
      <div className="flex min-h-0 flex-1 flex-col">
        <ScrollArea className="min-h-[300px] flex-1">
          <ScrollArea className="">
            <Table className="relative table-auto">
              <TableHeader className="z-10 border-t">
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow
                    className="bg-background transition-all"
                    key={headerGroup.id}
                  >
                    {headerGroup.headers.map((header) => {
                      const meta = header.column.columnDef.meta;
                      if (meta && "float" in meta) return null;
                      return (
                        <TableHead
                          key={header.id}
                          colSpan={header.colSpan}
                          className={cn(
                            header.colSpan > 1 && "text-start",
                            "h-10 whitespace-nowrap first:border-s-0 [&>button]:inline-block",
                            "sticky top-0 last:w-0",
                            // i + 1 === arr.length && "bg-gray-50 dark:bg-black/10",
                          )}
                        >
                          {header.isPlaceholder
                            ? null
                            : flexRender(
                                header.column.columnDef.header,
                                header.getContext(),
                              )}
                          {/* {canSort && (
                            <TableHeaderSortStatus
                              sortedStatus={header.column.getIsSorted()}
                            />
                          )} */}
                        </TableHead>
                      );
                    })}
                  </TableRow>
                ))}
              </TableHeader>
              {isLoading && (
                <ShadTableRowsSkeleton
                  rows={pagination.pageSize < 0 ? 10 : pagination.pageSize}
                  cols={columns.length}
                />
              )}
              <TableBody>
                {table.getRowModel().rows?.length > 0 &&
                  table.getRowModel().rows.map((row) => (
                    <TableRow
                      key={row.id}
                      data-state={row.getIsSelected() && "selected"}
                      className="group/row relative bg-sidebar/20"
                    >
                      {row.getVisibleCells().map((cell) => (
                        <TableCell
                          key={cell.id}
                          className={cn(
                            "float" in (cell.column.columnDef.meta ?? {})
                              ? "-translate-x-2 -translate-y-1/2 absolute end-0 top-1/2 hidden p-0 group-hover/row:block"
                              : "[&:nth-last-child(2)]:no-wrap text-nowrap p-3 backdrop-filter first:border-s-0 last:sticky last:end-0 last:border-e-0 [&:nth-last-child(2)]:w-[1%] [&:nth-last-child(2)]:pe-8 [&:nth-last-child(2)]:text-end",
                          )}
                        >
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext(),
                          )}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                {!isLoading && table.getRowModel().rows?.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={columns.length}
                      className="h-24 text-center"
                    >
                      {m.noResult()}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </ScrollArea>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
        <Paginator table={table} />
      </div>
    </div>
  );
}
