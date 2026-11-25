import { addHours, compareAsc, formatISO, isEqual, subHours } from "date-fns";

export function setHours(date: string | Date | number, hours: number): string {
  const dateInstance = new Date(date);
  dateInstance.setHours(hours);
  dateInstance.setMinutes(0);
  dateInstance.setSeconds(0);
  dateInstance.setMilliseconds(0);
  return formatISO(dateInstance);
}

function compareDates(date1: Date | string, date2: Date | string) {
  return new Date(date1).getTime() === new Date(date2).getTime();
}

export const DATE_UTILS = {
  isEqual: compareDates,
};

function isBetween(
  target: Date | string,
  from: Date | string,
  to: Date | string,
  inclusive = true,
) {
  if (inclusive) {
    return from <= target && target <= to;
  }
  return from < target && target < to;
}

function isOverlapped(
  from1: Date | string,
  to1: Date | string,
  from2: Date | string,
  to2: Date | string,
) {
  const f1 = new Date(from1);
  const f2 = new Date(from2);
  const t1 = new Date(to1);
  const t2 = new Date(to2);
  return f1 <= t2 && f2 <= t1;
}

function extendRangeByHour({
  from,
  to,
}: { from: Date | string; to: Date | string }) {
  return {
    from: subHours(from, 1),
    to: addHours(to, 1),
  };
}

function compare(date: Date | string, rhs: Date | string) {
  return new Date(date).getTime() - new Date(rhs).getTime();
}

export const DateUtils = {
  isBetween,
  isOverlapped,
  extendRangeByHour,
  compare,
};
