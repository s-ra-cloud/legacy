import type { Column, Table } from "@tanstack/react-table";
import { CheckIcon, Columns3 } from "lucide-react";
import { Button } from "~/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "~/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import { cn } from "~/lib/utils";
import { m } from "~/paraglide/messages";

interface TableColumnsSelectorProps<T> {
  table: Table<T>;
  variant?: "default" | "legacy";
}

const legacyToolbarButtonClass =
  "rounded-none border-white/10 bg-transparent text-[10px] uppercase tracking-[0.15em] text-ivory/50 hover:bg-white/[0.05] hover:text-ivory";

const paperToolbarButtonClass =
  "h-8 rounded-none border-charcoal/15 bg-white text-[10px] font-bold uppercase tracking-[0.15em] text-charcoal/60 hover:bg-charcoal/[0.03] hover:text-charcoal";

function getColumnLabel<T>(column: Column<T, unknown>) {
  const header = column.columnDef.header;
  if (typeof header === "string" && header.trim()) return header;
  if (column.id === "actions") return "Actions";
  return column.id;
}

export function TableColumnsSelector<T>({
  table,
  variant = "default",
}: TableColumnsSelectorProps<T>) {
  const isLegacy = variant === "legacy";
  const hideableColumns = table
    .getAllFlatColumns()
    .filter((column) => column.getCanHide());

  const visibleCount = hideableColumns.filter((c) => c.getIsVisible()).length;

  function setAllVisible(visible: boolean) {
    for (const column of hideableColumns) {
      column.toggleVisibility(visible);
    }
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            "ml-auto gap-1.5",
            isLegacy ? legacyToolbarButtonClass : paperToolbarButtonClass,
          )}
        >
          <Columns3 size={12} />
          {m.toggleColumns()}
          <span
            className={cn(
              "text-[9px] font-bold tabular-nums",
              isLegacy ? "text-gold/70" : "text-[#8a6d2f]",
            )}
          >
            {visibleCount}/{hideableColumns.length}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className={cn(
          "w-64 overflow-hidden rounded-none border-charcoal/15 bg-paper p-0 text-charcoal shadow-[0_16px_48px_rgba(15,17,19,0.14)]",
          isLegacy && "border-white/10 bg-charcoal text-ivory",
        )}
      >
        <div
          className={cn(
            "relative border-b border-charcoal/10 px-4 py-3",
            isLegacy && "border-white/10",
          )}
        >
          <div className="pointer-events-none absolute top-1.5 left-1.5 h-px w-2 bg-charcoal/25" />
          <div className="pointer-events-none absolute top-1.5 left-1.5 h-2 w-px bg-charcoal/25" />
          <p
            className={cn(
              "text-[10px] font-bold uppercase tracking-[0.35em] text-charcoal/45",
              isLegacy && "text-gold/60",
            )}
          >
            Display
          </p>
          <p
            className={cn(
              "mt-0.5 font-serif text-lg text-charcoal",
              isLegacy && "text-ivory",
            )}
            style={{ fontFamily: "Didot, Georgia, serif" }}
          >
            Columns
          </p>
        </div>

        <Command
          className={cn(
            "rounded-none bg-paper text-charcoal",
            isLegacy && "bg-charcoal text-ivory",
          )}
        >
          <CommandInput
            placeholder="Search columns…"
            className={cn(
              "text-charcoal placeholder:text-charcoal/35",
              isLegacy && "text-ivory placeholder:text-ivory/30",
            )}
          />
          <CommandList className="max-h-56">
            <CommandEmpty
              className={cn(
                "text-charcoal/50",
                isLegacy && "text-ivory/40",
              )}
            >
              {m.noColumnsFound()}
            </CommandEmpty>
            <CommandGroup className="p-1.5">
              {hideableColumns.map((column) => {
                const label = getColumnLabel(column);
                const isVisible = column.getIsVisible();

                return (
                  <CommandItem
                    key={column.id}
                    value={label}
                    onSelect={() => {
                      column.toggleVisibility(!isVisible);
                    }}
                    className={cn(
                      "cursor-pointer rounded-none text-[13px] data-[selected=true]:bg-gold/10 data-[selected=true]:text-charcoal",
                      isLegacy &&
                        "data-[selected=true]:bg-gold/10 data-[selected=true]:text-ivory",
                    )}
                  >
                    <span
                      className={cn(
                        "flex-1 truncate",
                        !isVisible && "text-charcoal/40 line-through",
                        isLegacy && !isVisible && "text-ivory/35",
                      )}
                    >
                      {label}
                    </span>
                    <CheckIcon
                      className={cn(
                        "ml-auto size-4 shrink-0",
                        isVisible
                          ? isLegacy
                            ? "text-gold opacity-100"
                            : "text-[#8a6d2f] opacity-100"
                          : "opacity-0",
                      )}
                    />
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>

        <div
          className={cn(
            "flex items-center justify-between gap-2 border-t border-charcoal/10 px-3 py-2.5",
            isLegacy && "border-white/10",
          )}
        >
          <button
            type="button"
            onClick={() => setAllVisible(true)}
            className={cn(
              "text-[10px] font-bold uppercase tracking-[0.2em] text-charcoal/45 transition-colors hover:text-charcoal",
              isLegacy && "text-ivory/40 hover:text-ivory",
            )}
          >
            Show all
          </button>
          <button
            type="button"
            onClick={() => table.resetColumnVisibility()}
            className={cn(
              "text-[10px] font-bold uppercase tracking-[0.2em] text-charcoal/45 transition-colors hover:text-charcoal",
              isLegacy && "text-ivory/40 hover:text-ivory",
            )}
          >
            Reset
          </button>
          <button
            type="button"
            onClick={() => setAllVisible(false)}
            className={cn(
              "text-[10px] font-bold uppercase tracking-[0.2em] text-charcoal/45 transition-colors hover:text-charcoal",
              isLegacy && "text-ivory/40 hover:text-ivory",
            )}
          >
            Hide all
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
