import type { Table } from "@tanstack/react-table";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronsLeftIcon,
  ChevronsRightIcon,
} from "lucide-react";
import { cn } from "~/lib/utils";
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
  variant?: "default" | "legacy";
}

const legacyPaginatorButtonClass =
  "rounded-none border-white/10 bg-transparent text-ivory/50 hover:bg-white/[0.05] hover:text-ivory disabled:opacity-30";

export function Paginator<T>({
  table,
  variant = "default",
}: PaginatorProps<T>) {
  const isLegacy = variant === "legacy";
  const pagination = table.getState().pagination;
  return (
    <div
      className={cn(
        "flex items-center gap-2 border-t p-3",
        isLegacy && "border-white/10 text-ivory/50",
      )}
    >
      <Button
        variant="outline"
        size="icon"
        className={cn("p-1", isLegacy && legacyPaginatorButtonClass)}
        onClick={() => table.setPageIndex(0)}
        disabled={!table.getCanPreviousPage()}
      >
        <ChevronsLeftIcon size={15} />
      </Button>
      <Button
        variant="outline"
        size="icon"
        className={cn(isLegacy && legacyPaginatorButtonClass)}
        onClick={() => table.previousPage()}
        disabled={!table.getCanPreviousPage()}
      >
        <ChevronLeftIcon size={15} />
      </Button>
      <Button
        variant="outline"
        size="icon"
        className={cn(isLegacy && legacyPaginatorButtonClass)}
        onClick={() => table.nextPage()}
        disabled={!table.getCanNextPage()}
      >
        <ChevronRightIcon size={15} />
      </Button>
      <Button
        variant="outline"
        size="icon"
        className={cn(isLegacy && legacyPaginatorButtonClass)}
        onClick={() => table.setPageIndex(table.getPageCount() - 1)}
        disabled={!table.getCanNextPage()}
      >
        <ChevronsRightIcon size={15} />
      </Button>
      <span
        className={cn(
          "flex items-center gap-1 text-sm",
          isLegacy && "text-[11px] uppercase tracking-[0.15em]",
        )}
      >
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
          className={cn(
            "w-40 p-1",
            isLegacy
              ? "rounded-none border-white/10 bg-transparent text-ivory"
              : "rounded",
          )}
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
        <SelectTrigger
          className={cn(
            "hidden h-9 w-fit md:flex",
            isLegacy &&
              "rounded-none border-white/10 bg-transparent text-[10px] uppercase tracking-[0.15em] text-ivory/50",
          )}
        >
          <SelectValue placeholder="Rows Per Page" />
        </SelectTrigger>
        <SelectContent>
          {[10, 20, 30, 40, 50].map((pageSize) => (
            <SelectItem key={pageSize} value={pageSize.toString()}>
              {m.show()} {pageSize}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
