import { format, formatISO } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import type * as React from "react";
import type { DayPicker } from "react-day-picker";

import { Button } from "~/components/ui/button";
import { Calendar } from "~/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import { cn } from "~/lib/utils";

interface DatePickerProps {
  date?: string;
  onChange?: (range: string | undefined) => void;
  className?: string;
  calendarProps?: Omit<
    React.ComponentProps<typeof DayPicker>,
    "mode" | "selected" | "onSelect"
  >;
}

export function DatePicker({
  date,
  onChange,
  className,
  calendarProps,
}: DatePickerProps) {
  return (
    <div className={cn("grid gap-2", className)}>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant="outline"
            className={cn(
              "h-12 w-full min-w-48 justify-start bg-sidebar text-left font-normal",
              !date && "text-muted-foreground",
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {date ? format(date, "dd/MM/yy") : "Pick a date"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            {...calendarProps}
            initialFocus
            mode="single"
            selected={date ? new Date(date) : undefined}
            onSelect={(date) => {
              onChange?.(date ? formatISO(date) : undefined);
            }}
            numberOfMonths={2}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
