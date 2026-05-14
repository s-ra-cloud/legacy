import type { Table } from "@tanstack/react-table";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronsLeftIcon,
  ChevronsRightIcon,
} from "lucide-react";
import { m } from "~/paraglide/messages";
import { Button } from "../ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { PageNumberInput } from "./page-number-input";

interface PaginatorProps<T> {
  table: Table<T>;
}

export function Paginator<T>({ table }: PaginatorProps<T>) {
  const pagination = table.getState().pagination;
  return (
    <div className="flex items-center gap-2 border-t bg-sidebar p-2">
      <Button
        variant="outline"
        size="icon"
        className="p-1"
        onClick={() => table.setPageIndex(0)}
        disabled={!table.getCanPreviousPage()}
      >
        <ChevronsLeftIcon size={15} />
      </Button>
      <Button
        variant="outline"
        size="icon"
        onClick={() => table.previousPage()}
        disabled={!table.getCanPreviousPage()}
      >
        <ChevronLeftIcon size={15} />
      </Button>
      <Button
        variant="outline"
        size="icon"
        onClick={() => table.nextPage()}
        disabled={!table.getCanNextPage()}
      >
        <ChevronRightIcon size={15} />
      </Button>
      <Button
        variant="outline"
        size="icon"
        onClick={() => table.setPageIndex(table.getPageCount() - 1)}
        disabled={!table.getCanNextPage()}
      >
        <ChevronsRightIcon size={15} />
      </Button>
      <span className="flex items-center gap-1 text-sm">
        <div>Page</div>
        <strong>
          {pagination.pageIndex + 1} of {table.getPageCount()}
        </strong>
      </span>
      <div className="grow"></div>
      <span className="hidden items-center gap-1 md:flex">
        {m.goToPage()}
        <PageNumberInput
          minValue={1}
          defaultValue={pagination.pageIndex + 1}
          onChange={(value) => {
            const page = value - 1;
            table.setPageIndex(page);
          }}
          className="w-40 rounded p-1"
        />
      </span>
      <Select
        value={
          pagination.pageSize === -1 ? "10" : pagination.pageSize.toString()
        }
        onValueChange={(value) => {
          table.setPageSize(Number(value));
        }}
      >
        <SelectTrigger className="hidden h-9 w-fit md:flex">
          <SelectValue placeholder="Rows Per Page" />
        </SelectTrigger>
        <SelectContent>
          {[10, 11, 12, 13, 14, 20, 30, 40, 50].map((pageSize) => (
            <SelectItem key={pageSize} value={pageSize.toString()}>
              {m.show()} {pageSize}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
