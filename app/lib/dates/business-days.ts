// Minimum number of business days required between the registration date and the desired delivery date.
// Below this delay, an exam is registered with a warning and counted as "late" in the stats.
export const MIN_BUSINESS_DAYS_BEFORE_DELIVERY = 7

export function businessDaysBetween(
  startDate: string | Date,
  endDate: string | Date,
) {
  let start = new Date(startDate)
  let end = new Date(endDate)
  let count = 0

  if (start > end) {
    ;[start, end] = [end, start]
  }

  while (start < end) {
    const day = start.getDay()
    // 0 = sunday, 6 = saturday
    if (day !== 0 && day !== 6) {
      count++
    }
    start.setDate(start.getDate() + 1)
  }

  return count
}
