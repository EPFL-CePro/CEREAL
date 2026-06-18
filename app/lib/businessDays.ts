export function businessDaysBetween(
  startDate: string | Date,
  endDate: string | Date
) {
  let start = new Date(startDate);
  let end = new Date(endDate);
  let count = 0;

  if (start > end) {
    [start, end] = [end, start];
  }

  while (start < end) {
    const day = start.getDay();
    // 0 = sunday, 6 = saturday
    if (day !== 0 && day !== 6) {
      count++;
    }
    start.setDate(start.getDate() + 1);
  }

  return count;
}
