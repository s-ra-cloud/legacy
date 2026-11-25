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

const paperPaginatorButtonClass =
  "rounded-none border-charcoal/15 bg-white text-charcoal/60 hover:bg-charcoal/[0.03] hover:text-charcoal disabled:opacity-35";

const paperSelectTriggerClass =
  "rounded-none border-charcoal/15 bg-white text-[10px] font-bold uppercase tracking-[0.15em] text-charcoal/60";

const paperSelectContentClass = "border-charcoal/10 bg-paper text-charcoal";

export function Paginator<T>({
  table,
  variant = "default",
}: PaginatorProps<T>) {
  const isLegacy = variant === "legacy";
  const pagination = table.getState().pagination;
  const pageCount = Math.max(table.getPageCount(), 1);
  const currentPage = pagination.pageIndex + 1;

  const navButtonClass = cn(
    "size-8 shrink-0",
    isLegacy ? legacyPaginatorButtonClass : paperPaginatorButtonClass,
  );

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-2 border-t px-3 py-3",
        isLegacy ? "border-white/10 text-ivory/50" : "border-charcoal/10 bg-white/50",
      )}
    >
      <Button
        variant="outline"
        size="icon"
        className={navButtonClass}
        onClick={() => table.setPageIndex(0)}
        disabled={!table.getCanPreviousPage()}
        aria-label="First page"
      >
        <ChevronsLeftIcon size={15} />
      </Button>
      <Button
        variant="outline"
        size="icon"
        className={navButtonClass}
        onClick={() => table.previousPage()}
        disabled={!table.getCanPreviousPage()}
        aria-label="Previous page"
      >
        <ChevronLeftIcon size={15} />
      </Button>
      <Button
        variant="outline"
        size="icon"
        className={navButtonClass}
        onClick={() => table.nextPage()}
        disabled={!table.getCanNextPage()}
        aria-label="Next page"
      >
        <ChevronRightIcon size={15} />
      </Button>
      <Button
        variant="outline"
        size="icon"
        className={navButtonClass}
        onClick={() => table.setPageIndex(pageCount - 1)}
        disabled={!table.getCanNextPage()}
        aria-label="Last page"
      >
        <ChevronsRightIcon size={15} />
      </Button>

      <span
        className={cn(
          "flex items-center gap-1.5 text-sm tabular-nums",
          isLegacy
            ? "text-[11px] uppercase tracking-[0.15em]"
            : "text-charcoal/55",
        )}
      >
        <span className={cn(!isLegacy && "text-[10px] font-bold uppercase tracking-[0.2em] text-charcoal/40")}>
          Page
        </span>
        <strong className={cn(!isLegacy && "font-medium text-charcoal")}>
          {currentPage} / {pageCount}
        </strong>
      </span>

      <div className="grow" />

      <span
        className={cn(
          "hidden items-center gap-2 md:flex",
          isLegacy ? "text-ivory/45" : "text-charcoal/45",
        )}
      >
        <span className="text-[10px] font-bold uppercase tracking-[0.2em]">
          {m.goToPage()}
        </span>
        <PageNumberInput
          variant={isLegacy ? "legacy" : "paper"}
          minValue={1}
          maxValue={pageCount}
          value={currentPage}
          onChange={(value) => {
            table.setPageIndex(Math.min(Math.max(value, 1), pageCount) - 1);
          }}
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
            isLegacy
              ? "rounded-none border-white/10 bg-transparent text-[10px] uppercase tracking-[0.15em] text-ivory/50"
              : paperSelectTriggerClass,
          )}
        >
          <SelectValue placeholder="Rows per page" />
        </SelectTrigger>
        <SelectContent className={isLegacy ? undefined : paperSelectContentClass}>
          {[10, 20, 30, 40, 50].map((pageSize) => (
            <SelectItem
              key={pageSize}
              value={pageSize.toString()}
              className={cn(
                !isLegacy &&
                  "rounded-none text-charcoal focus:bg-gold/10 focus:text-charcoal data-[highlighted]:bg-gold/10",
              )}
            >
              {m.show()} {pageSize}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
