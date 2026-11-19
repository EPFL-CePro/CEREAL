// Minimum number of business days required between the registration date and the desired delivery date.
// Below this delay, an exam is registered with a warning and counted as "late" in the stats.
import { formatDateInputValue } from "@/app/lib/dates/date-time"

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

export function getPreviousBusinessDay(dateString: string): string {
  if (!dateString) return ""

  const selectedDate = new Date(dateString)
  const selectedDay = selectedDate.getDay()

  // 0 = Sunday; 1 = Monday - By default : go back 1 day
  let daysToSubstract = 1
  // If it's sunday go back 2 days
  if (selectedDay === 0) daysToSubstract = 2
  // If it's monday go back 3 days
  else if (selectedDay === 1) daysToSubstract = 3

  selectedDate.setDate(selectedDate.getDate() - daysToSubstract)

  return formatDateInputValue(selectedDate)
}

// Deferred exam registration stays open during the full business days following the ordinary exam day.
const DEFERRED_EXAM_REGISTRATION_BUSINESS_DAYS = 3

// `examDate` is expected at UTC midnight, as produced from the BO file.
export function isDeferredExamRegistrationOpen(
  examDate: string | Date,
  now = new Date(),
) {
  const lastOpenDay = new Date(examDate)
  if (Number.isNaN(lastOpenDay.getTime())) return false

  let remainingBusinessDays = DEFERRED_EXAM_REGISTRATION_BUSINESS_DAYS
  while (remainingBusinessDays > 0) {
    lastOpenDay.setUTCDate(lastOpenDay.getUTCDate() + 1)
    const day = lastOpenDay.getUTCDay()
    // 0 = sunday, 6 = saturday
    if (day !== 0 && day !== 6) remainingBusinessDays--
  }

  // "en-CA" formats as YYYY-MM-DD, so both dates can be compared as strings
  const todayInZurich = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Zurich",
  }).format(now)

  return todayInZurich <= lastOpenDay.toISOString().slice(0, 10)
}
