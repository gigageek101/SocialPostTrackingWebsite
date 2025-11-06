import { format } from 'date-fns-tz';
import { utcToZonedTime, zonedTimeToUtc } from 'date-fns-tz';
import { add, differenceInMinutes, isAfter, isBefore, parseISO } from 'date-fns';

/**
 * Format a UTC timestamp to a specific timezone with AM/PM
 */
export function formatInTimezone(
  utcTimestamp: string,
  timezone: string,
  includeDate = false
): string {
  const date = parseISO(utcTimestamp);
  const zonedDate = utcToZonedTime(date, timezone);
  
  if (includeDate) {
    return format(zonedDate, 'MMM d, h:mm a', { timeZone: timezone });
  }
  
  return format(zonedDate, 'h:mm a', { timeZone: timezone });
}

/**
 * Convert a time string (HH:mm) in a specific timezone to UTC
 */
export function timeToUTC(
  timeString: string,
  timezone: string,
  date: Date = new Date()
): string {
  const [hours, minutes] = timeString.split(':').map(Number);
  const zonedDate = utcToZonedTime(date, timezone);
  zonedDate.setHours(hours, minutes, 0, 0);
  
  const utcDate = zonedTimeToUtc(zonedDate, timezone);
  return utcDate.toISOString();
}

/**
 * Get current time in UTC
 */
export function getCurrentUTC(): string {
  return new Date().toISOString();
}

/**
 * Add minutes to a UTC timestamp
 */
export function addMinutesToUTC(utcTimestamp: string, minutes: number): string {
  const date = parseISO(utcTimestamp);
  const newDate = add(date, { minutes });
  return newDate.toISOString();
}

/**
 * Check if current time is after a UTC timestamp
 */
export function isAfterNow(utcTimestamp: string): boolean {
  return isAfter(parseISO(utcTimestamp), new Date());
}

/**
 * Check if current time is before a UTC timestamp
 */
export function isBeforeNow(utcTimestamp: string): boolean {
  return isBefore(parseISO(utcTimestamp), new Date());
}

/**
 * Get minutes difference between two UTC timestamps
 */
export function getMinutesDifference(
  utcTimestamp1: string,
  utcTimestamp2: string
): number {
  return differenceInMinutes(parseISO(utcTimestamp1), parseISO(utcTimestamp2));
}

/**
 * Get minutes until a UTC timestamp
 */
export function getMinutesUntil(utcTimestamp: string): number {
  return differenceInMinutes(parseISO(utcTimestamp), new Date());
}

/**
 * Format minutes into a readable countdown (e.g., "1h 23m")
 */
export function formatCountdown(minutes: number): string {
  if (minutes < 0) return 'Ready now';
  
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  
  if (hours > 0) {
    return `${hours}h ${mins}m`;
  }
  
  return `${mins}m`;
}

/**
 * Get timezone display name (e.g., "Chicago (CT)" or "Bangkok")
 */
export function getTimezoneDisplay(timezone: string): string {
  try {
    const now = new Date();
    const zonedDate = utcToZonedTime(now, timezone);
    const formatted = format(zonedDate, 'zzz', { timeZone: timezone });
    
    // Extract city name from timezone string
    const city = timezone.split('/').pop()?.replace(/_/g, ' ') || timezone;
    
    return `${city} (${formatted})`;
  } catch {
    return timezone;
  }
}

/**
 * Common timezone options for the selector
 */
export const COMMON_TIMEZONES = [
  'America/New_York',
  'America/Chicago',
  'America/Los_Angeles',
  'America/Denver',
  'Europe/London',
  'Europe/Paris',
  'Asia/Bangkok',
  'Asia/Tokyo',
  'Asia/Singapore',
  'Asia/Dubai',
  'Australia/Sydney',
  'Pacific/Auckland',
];

