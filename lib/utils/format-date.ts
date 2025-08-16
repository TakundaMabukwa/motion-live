/**
 * Format a date according to the specified format string
 * 
 * @param date The date to format
 * @param format The format string to use
 * @returns The formatted date string
 * 
 * Format options:
 * - yyyy: 4-digit year
 * - yy: 2-digit year
 * - MM: 2-digit month (01-12)
 * - M: 1-digit month (1-12)
 * - dd: 2-digit day (01-31)
 * - d: 1-digit day (1-31)
 * - HH: 2-digit hour (00-23)
 * - H: 1-digit hour (0-23)
 * - mm: 2-digit minute (00-59)
 * - m: 1-digit minute (0-59)
 * - ss: 2-digit second (00-59)
 * - s: 1-digit second (0-59)
 */
export function formatDate(date: Date, format: string): string {
  // Make sure the date is valid
  if (isNaN(date.getTime())) {
    throw new Error('Invalid date');
  }
  
  // Get date components
  const year = date.getFullYear();
  const month = date.getMonth() + 1; // getMonth() returns 0-11
  const day = date.getDate();
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const seconds = date.getSeconds();
  
  // Helper function to pad with leading zeros
  const pad = (num: number, size: number): string => {
    let s = num.toString();
    while (s.length < size) s = '0' + s;
    return s;
  };
  
  // Replace format tokens with date values
  return format
    .replace(/yyyy/g, year.toString())
    .replace(/yy/g, (year % 100).toString().padStart(2, '0'))
    .replace(/MM/g, pad(month, 2))
    .replace(/M/g, month.toString())
    .replace(/dd/g, pad(day, 2))
    .replace(/d/g, day.toString())
    .replace(/HH/g, pad(hours, 2))
    .replace(/H/g, hours.toString())
    .replace(/mm/g, pad(minutes, 2))
    .replace(/m/g, minutes.toString())
    .replace(/ss/g, pad(seconds, 2))
    .replace(/s/g, seconds.toString());
}
