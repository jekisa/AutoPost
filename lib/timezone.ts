import { formatInTimeZone, fromZonedTime, toZonedTime } from "date-fns-tz";

export const WIB_TIMEZONE = "Asia/Jakarta";
export const DEFAULT_WIB_FORMAT = "dd MMM yyyy, HH:mm 'WIB'";

export function formatToWIB(date: Date | string | number | null | undefined, formatString = DEFAULT_WIB_FORMAT) {
  if (!date) return "-";
  return formatInTimeZone(date, WIB_TIMEZONE, formatString);
}

export function convertWIBInputToUTC(localDateTimeString: string) {
  return fromZonedTime(localDateTimeString, WIB_TIMEZONE);
}

export function getNowInWIB() {
  return toZonedTime(new Date(), WIB_TIMEZONE);
}

export function toWIBDate(date: Date | string | number) {
  return toZonedTime(date, WIB_TIMEZONE);
}

export function toWIBDateInputValue(date: Date | string | number) {
  return formatInTimeZone(date, WIB_TIMEZONE, "yyyy-MM-dd'T'HH:mm");
}

export function getWIBDateKey(date: Date | string | number) {
  return formatInTimeZone(date, WIB_TIMEZONE, "yyyy-MM-dd");
}

export function startOfWIBMonthAsUTC(year: number, month: number) {
  return fromZonedTime(`${year}-${String(month + 1).padStart(2, "0")}-01T00:00`, WIB_TIMEZONE);
}

export function startOfNextWIBMonthAsUTC(year: number, month: number) {
  const next = new Date(year, month + 1, 1);
  return fromZonedTime(`${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}-01T00:00`, WIB_TIMEZONE);
}

export function startOfWIBDayAsUTC(date: Date | string | number) {
  return fromZonedTime(formatInTimeZone(date, WIB_TIMEZONE, "yyyy-MM-dd'T'00:00"), WIB_TIMEZONE);
}
