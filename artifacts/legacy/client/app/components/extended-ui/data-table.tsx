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
import { Paginator } from "../paginator";
import { ShadTableRowsSkeleton } from "../skeletons/table-skeleton";

export type TableSearchParams = {
  cursor: number;
  limit: number;
} & Record<string, unknown>;

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  pagination: PaginationState;
  paginationOptions: Pick<PaginationOptions, "rowCount">;
  isLoading: boolean;
  filters: TableSearchParams;
  onFiltersChange: (f: Partial<TableSearchParams>) => Promise<URLSearchParams>;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  pagination,
  paginationOptions,
  isLoading,
  // filters,
  onFiltersChange,
}: DataTableProps<TData, TValue>) {
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
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
      onFiltersChange({
        cursor: res.pageIndex + 1,
        limit: res.pageSize,
      }).catch(console.error);
    },
    state: { pagination, columnVisibility },
  });

  return (
    <div className="flex h-full flex-col gap-2">
      <div className="flex grow flex-col overflow-hidden rounded-lg border">
        <div className="h-0 grow overflow-auto">
          <Table className="relative table-auto">
            <TableHeader className="sticky top-0 z-10">
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow className="transition-all" key={headerGroup.id}>
                  {headerGroup.headers.map((header) => {
                    const meta = header.column.columnDef.meta;
                    if (meta && "float" in meta) return null;
                    return (
                      <TableHead
                        key={header.id}
                        colSpan={header.colSpan}
                        className={cn(
                          header.colSpan > 1 && "text-start",
                          "h-10 whitespace-nowrap bg-sidebar first:border-s-0 [&>button]:inline-block",
                          "sticky top-0 last:end-0 last:top-[unset]",
                        )}
                      >
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                              header.column.columnDef.header,
                              header.getContext(),
                            )}
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
                    className="group/row relative"
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
        </div>
        <Paginator table={table} />
      </div>
    </div>
  );
}
