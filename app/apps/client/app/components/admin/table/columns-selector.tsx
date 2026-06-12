import type { Table } from "@tanstack/react-table";
import { CheckIcon } from "lucide-react";
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

export function TableColumnsSelector<T>({
  table,
  variant = "default",
}: TableColumnsSelectorProps<T>) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            "ml-auto",
            variant === "legacy" &&
              "rounded-none border-white/10 bg-transparent text-[10px] uppercase tracking-[0.15em] text-ivory/50 hover:bg-white/[0.05] hover:text-ivory",
          )}
        >
          {m.toggleColumns()}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-0">
        <Command>
          <CommandInput placeholder="Search language..." />
          <CommandList>
            <CommandEmpty>{m.noColumnsFound()}</CommandEmpty>
            <CommandGroup>
              {table
                .getAllFlatColumns()
                .filter((column) => column.getCanHide())
                .map((column) => {
                  const value =
                    typeof column.columnDef.header === "string"
                      ? column.columnDef.header
                      : column.id;
                  if (column.getCanGroup()) {
                    return (
                      <CommandItem
                        value={value}
                        key={column.id}
                        onSelect={() => {
                          // form.setValue("language", language.value)
                          column.toggleVisibility(!column.getIsVisible());
                        }}
                      >
                        {value}
                        <CheckIcon
                          className={cn(
                            "ml-auto",
                            column.getIsVisible() ? "opacity-100" : "opacity-0",
                          )}
                        />
                      </CommandItem>
                    );
                  }
                  return (
                    <CommandItem value="-" key={column.id}>
                      {value}
                      <CheckIcon
                        className={cn(
                          "ml-auto",
                          // language.value === field.value
                          //  ? "opacity-100"
                          //  : "opacity-0"
                        )}
                      />
                    </CommandItem>
                  );
                })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
