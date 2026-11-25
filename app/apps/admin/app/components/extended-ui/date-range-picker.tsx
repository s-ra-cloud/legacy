import { format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import type * as React from "react";
import type { DateRange, DayPicker } from "react-day-picker";

import { Button } from "~/components/ui/button";
import { Calendar } from "~/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import { cn } from "~/lib/utils";

interface DateRangePickerProps {
  range?: DateRange;
  onChange?: (range: DateRange | undefined) => void;
  className?: string;
  calendarProps?: Omit<
    React.ComponentProps<typeof DayPicker>,
    "mode" | "selected" | "onSelect"
  >;
}

export function DateRangePicker({
  range,
  onChange,
  className,
  calendarProps,
}: DateRangePickerProps) {
  return (
    <div className={cn("grid gap-2", className)}>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant="outline"
            className={cn(
              "h-12 w-full min-w-48 justify-start text-left font-normal",
              !range && "text-muted-foreground",
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {range?.from ? (
              range.to ? (
                <>
                  {format(range.from, "dd/MM/yy")} -{" "}
                  {format(range.to, "dd/MM/yy")}
                </>
              ) : (
                format(range.from, "dd/MM/yy")
              )
            ) : (
              <span>Pick a date range</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0" align="start">
          <Calendar
            {...calendarProps}
            initialFocus
            mode="range"
            defaultMonth={range?.from}
            selected={range}
            onSelect={(range) => {
              onChange?.({
                from: range?.from,
                to: range?.to,
              });
            }}
            numberOfMonths={2}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
