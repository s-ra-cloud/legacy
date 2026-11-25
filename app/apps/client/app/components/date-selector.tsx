import {
  addDays,
  differenceInCalendarDays,
  format,
  isValid,
  subDays,
  subMonths,
  subYears,
} from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import React, { useState } from "react";
import type { DateRange } from "react-day-picker";

import { cn } from "~/lib/utils";
import { Button } from "./ui/button";
import { Calendar } from "./ui/calendar";
import { Label } from "./ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";

function ensureValidDateRange(
  range: DateRange | undefined,
): DateRange | undefined {
  if (!range) return undefined;

  let from: Date | undefined;
  let to: Date | undefined;

  if (range.from) {
    try {
      from = new Date(range.from);
      if (!isValid(from)) from = undefined;
    } catch (e) {
      console.error("Invalid from date:", e);
      from = undefined;
    }
  }
  if (range.to) {
    try {
      to = new Date(range.to);
      if (!isValid(to)) to = undefined;
    } catch (e) {
      console.error("Invalid to date:", e);
      to = undefined;
    }
  }
  if (!from) return undefined;
  return { from, to };
}

interface DateSelectorProps {
  onChange?: (date: DateRange | undefined) => void;
  initialDateRange?: DateRange;
  className?: string;
  withLabel?: boolean;
}

export function DateSelector({
  onChange,
  initialDateRange,
  className,
  withLabel = true,
}: DateSelectorProps) {
  const today = new Date();
  const yesterday = subDays(today, 1);
  const lastWeek = subDays(today, 7);
  const lastMonth = subMonths(today, 1);
  const lastYear = subYears(today, 1);

  const [month, setMonth] = useState<Date>(today);

  const [date, setDate] = useState<DateRange | undefined>(() => {
    const validInitialRange = ensureValidDateRange(initialDateRange);

    return validInitialRange || undefined;
  });

  const handleDateChange = (newDate: DateRange | undefined) => {
    const validNewDate = ensureValidDateRange(newDate);
    setDate(validNewDate);
    if (onChange) {
      onChange(validNewDate);
    }
  };

  const safeFormat = (date: Date | undefined, formatStr: string): string => {
    if (!date) return "";
    try {
      return format(date, formatStr);
    } catch (e) {
      console.error("Error formatting date:", e);
      return "";
    }
  };

  const applyPreset = (fromDate: Date, days = 3) => {
    const newRange = {
      from: fromDate,
      to: addDays(fromDate, days),
    };
    setDate(newRange);
    setMonth(fromDate);
    if (onChange) {
      onChange(newRange);
    }
  };

  const nightCount =
    date?.to && date.from ? differenceInCalendarDays(date.to, date.from) : 0;

  return (
    <div className={cn("w-full", className)}>
      {withLabel && (
        <Label htmlFor="date-selector" className="pb-2 font-medium text-md">
          Check in and check out
        </Label>
      )}

      <Popover>
        <PopoverTrigger asChild>
          <Button
            id="date-selector"
            variant="outline"
            className={cn(
              "relative flex h-12 w-full items-center justify-start border-gray-200 px-6 text-left font-normal text-gray-500 text-sm",
              !date && "text-muted-foreground",
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {date?.from ? (
              <div className="flex w-full items-center justify-between">
                <div>
                  <div className="flex flex-col">
                    <div className="font-medium text-gray-900 text-sm">
                      {safeFormat(date.from, "MMM dd")} -{" "}
                      {safeFormat(date.to, "MMM dd, yyyy")}
                    </div>
                    <div className="mt-0.5 text-primary-color text-xs">
                      {nightCount > 0 &&
                        `${nightCount} ${nightCount === 1 ? "night" : "nights"
                        }`}{" "}
                      [12:00 - 14:00]
                    </div>
                  </div>
                </div>
                {/*
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="right-2 transform  h-6 w-6 rounded-full hover:bg-gray-100"
                      onClick={clearSelection}
                      aria-label="Clear date selection"
                    >
                      <XCircleIcon className="h-3.5 w-3.5 cursor-pointer text-gray-500" />
                    </Button>
                  */}
              </div>
            ) : (
              <span className="text-gray-500">Select your dates</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-full min-w-[var(--radix-popover-trigger-width)] p-0"
          align="start"
        >
          <div className="w-full rounded-md">
            <div className="flex flex-col">
              <div className="flex items-center justify-center">
                <Calendar
                  initialFocus
                  mode="range"
                  defaultMonth={month}
                  selected={date}
                  onSelect={handleDateChange}
                  numberOfMonths={1}
                  month={month}
                  onMonthChange={setMonth}
                  min={2}
                  disabled={{
                    before: new Date(),
                  }}
                  className="p-2"
                  classNames={{
                    day_selected: "bg-primary-color text-white",
                    day_today: "bg-primary-color/10 text-primary-color",
                    day_range_start: "bg-primary-color text-white",
                    day_range_end: "bg-primary-color text-white",
                  }}
                />
              </div>

              <div className="relative py-4">
                <div className="h-full sm:border-e">
                  <div className="flex gap-2 px-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className=""
                      onClick={() => applyPreset(today, 7)}
                    >
                      This week
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className=""
                      onClick={() => applyPreset(today, 14)}
                    >
                      2 weeks
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className=""
                      onClick={() => applyPreset(today, 30)}
                    >
                      1 month
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

export default DateSelector;
