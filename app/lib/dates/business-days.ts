import { dayAtHour, formatDateInputValue } from "@/app/lib/dates/date-time"

// Minimum number of business days required between the registration date and the desired delivery date.
// Below this delay, an exam is registered with a warning and counted as "late" in the stats.
export const MIN_BUSINESS_DAYS_BEFORE_DELIVERY = 7
// Deferred exam registration stays open during the full business days following the ordinary exam day.
const DEFERRED_EXAM_REGISTRATION_BUSINESS_DAYS = 3

export function isWeekend(date: Date): boolean {
  const weekday = date.getDay()
  return weekday === 0 || weekday === 6 // 0 = sunday, 6 = saturday
}

export function getBusinessDaysBefore(from: Date, until: Date): Date[] {
  const days: Date[] = []
  const current = dayAtHour(from, 0)
  const end = dayAtHour(until, 0)

  while (current < end) {
    if (!isWeekend(current)) days.push(new Date(current))
    current.setDate(current.getDate() + 1)
  }
  return days
}

export function businessDaysBetween(
  startDate: string | Date,
  endDate: string | Date,
) {
  const [start, end] = [new Date(startDate), new Date(endDate)].sort(
    (a, b) => a.getTime() - b.getTime(),
  )

  return getBusinessDaysBefore(start, end).length
}

export function getPreviousBusinessDay(dateString: string): string {
  if (!dateString) return ""

  const date = new Date(dateString)
  do {
    date.setDate(date.getDate() - 1)
  } while (isWeekend(date))

  return formatDateInputValue(date)
}

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
