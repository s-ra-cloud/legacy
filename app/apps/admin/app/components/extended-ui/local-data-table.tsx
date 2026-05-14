import type {
  ColumnDef,
  ColumnFiltersState,
  RowSelectionState,
  SortingState,
} from "@tanstack/react-table";
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { ArrowDownIcon, ArrowUpDown, ArrowUpIcon } from "lucide-react";

import * as React from "react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  onRowSelectionChange?: (value: RowSelectionState) => void;
  searchableColumns?: string[];
}

export function LocalDataTable<TData, TValue>({
  columns,
  data,
  onRowSelectionChange,
  searchableColumns = [],
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    [],
  );

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    state: {
      sorting,
      columnFilters,
    },
  });

  return (
    <div className="space-y-4 rounded-md bg-sidebar">
      <div className="overflow-hidden rounded-md border">
        <Table>
          <TableHeader className="bg-background">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  const column = header.column;
                  const isSearchable = searchableColumns.includes(column.id);
                  const isSortable = column.getCanSort();

                  return (
                    <TableHead key={header.id}>
                      <div className="flex items-center gap-2 text-secondary-color">
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                          )}
                        {(isSearchable || isSortable) && (
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                              >
                                <ArrowUpDown className="h-4 w-4" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent
                              className="w-[200px] p-4"
                              align="start"
                            >
                              <div className="space-y-4">
                                {isSortable && (
                                  <div className="space-y-2">
                                    <div className="font-medium text-sm">
                                      Sort
                                    </div>
                                    <div className="flex gap-2">
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        className="h-8"
                                        onClick={() =>
                                          column.toggleSorting(false)
                                        }
                                      >
                                        <ArrowDownIcon className="mr-2 h-4 w-4" />
                                        Asc
                                      </Button>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        className="h-8"
                                        onClick={() =>
                                          column.toggleSorting(true)
                                        }
                                      >
                                        <ArrowUpIcon className="mr-2 h-4 w-4 rotate-180" />
                                        Desc
                                      </Button>
                                    </div>
                                  </div>
                                )}
                                {isSearchable && (
                                  <div className="space-y-2">
                                    <div className="font-medium text-sm">
                                      Search
                                    </div>
                                    <Input
                                      placeholder={`Search ${column.id}...`}
                                      value={
                                        (column.getFilterValue() as string) ??
                                        ""
                                      }
                                      onChange={(event) =>
                                        column.setFilterValue(
                                          event.target.value,
                                        )
                                      }
                                      className="h-8"
                                    />
                                  </div>
                                )}
                              </div>
                            </PopoverContent>
                          </Popover>
                        )}
                      </div>
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                  className="h-12"
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
