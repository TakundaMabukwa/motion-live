import { formatDate } from '@/lib/utils/format-date';

/**
 * Utility functions for working with dates
 */
export interface DateUtilExports {
  formatDate: (date: Date, format: string) => string;
  parseDate: (dateString: string) => Date;
  addDays: (date: Date, days: number) => Date;
  daysBetween: (start: Date, end: Date) => number;
  isDateValid: (date: Date) => boolean;
  now: () => Date;
}

/**
 * Parse a date string into a Date object
 * @param dateString The date string to parse
 * @returns A Date object
 */
export function parseDate(dateString: string): Date {
  const date = new Date(dateString);
  
  if (isNaN(date.getTime())) {
    throw new Error(`Invalid date string: ${dateString}`);
  }
  
  return date;
}

/**
 * Add days to a date
 * @param date The date to add days to
 * @param days The number of days to add
 * @returns A new Date with the days added
 */
export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * Get the number of days between two dates
 * @param start The start date
 * @param end The end date
 * @returns The number of days between the dates
 */
export function daysBetween(start: Date, end: Date): number {
  const millisecondsPerDay = 24 * 60 * 60 * 1000;
  return Math.round(Math.abs((start.getTime() - end.getTime()) / millisecondsPerDay));
}

/**
 * Check if a date is valid
 * @param date The date to check
 * @returns True if the date is valid, false otherwise
 */
export function isDateValid(date: Date): boolean {
  return !isNaN(date.getTime());
}

/**
 * Get the current date and time
 * @returns The current date and time
 */
export function now(): Date {
  return new Date();
}

// Export all date utility functions
export const dateUtils: DateUtilExports = {
  formatDate,
  parseDate,
  addDays,
  daysBetween,
  isDateValid,
  now
};
