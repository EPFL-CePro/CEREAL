import {
  computePrintGaps,
  getPrintDurationMinutes,
  getPrintEndDate,
} from "@/app/lib/crep/print-duration"
import {
  type CrepExamPrintTiming,
  getBlockingExamsBetweenDates,
} from "@/app/lib/crep-subscription/queries"
import {
  countBusinessDaysBetween,
  getBusinessDaysBetween,
  MIN_BUSINESS_DAYS_BEFORE_DELIVERY,
} from "@/app/lib/dates/business-days"
import {
  addMinutes,
  dayAtHour,
  formatDateInputValue,
  formatDateTimeForDatabase,
  fromDatabaseDateTime,
} from "@/app/lib/dates/date-time"

// Opening hours of the print center
const DAY_START_HOUR = 8
const DAY_END_HOUR = 18

export function isDeliveryTooSoon(desiredDeliveryDate: string | Date): boolean {
  return (
    countBusinessDaysBetween(new Date(), desiredDeliveryDate) <
    MIN_BUSINESS_DAYS_BEFORE_DELIVERY
  )
}

/**
 * Finds when a printing of `requiredMinutes` can start on `day`, or null if it doesn't fit.
 * - No printing on that day → start of day
 * - A gap between two printings is big enough → right after the first one
 * - Otherwise → after the last printing, if it ends before the end of day
 */
export function findPrintStartInDay(
  day: Date,
  dayExams: CrepExamPrintTiming[],
  requiredMinutes: number,
): Date | null {
  if (dayExams.length === 0) return dayAtHour(day, DAY_START_HOUR)

  const fittingGap = computePrintGaps(dayExams).find(
    (gap) => gap.minutes >= requiredMinutes,
  )
  if (fittingGap) return getPrintEndDate(fittingGap.between[0])

  const examsByPrintStart = dayExams.toSorted(
    (a, b) => a.print_date.getTime() - b.print_date.getTime(),
  )
  const lastExam = examsByPrintStart[examsByPrintStart.length - 1]
  const start = getPrintEndDate(lastExam)

  return addMinutes(start, requiredMinutes) <= dayAtHour(day, DAY_END_HOUR)
    ? start
    : null
}

/**
 * Groups exams by the day of their printing, keyed by "YYYY-MM-DD"
 * @param exams
 */
function groupExamsByDay(
  exams: CrepExamPrintTiming[],
): Map<string, CrepExamPrintTiming[]> {
  return Map.groupBy(exams, (exam) => formatDateInputValue(exam.print_date))
}

export function findPrintingDate(
  candidateDays: Date[],
  blockingExams: CrepExamPrintTiming[],
  requiredMinutes: number,
): Date | null {
  const examsByDay = groupExamsByDay(blockingExams)
  const latestDayFirst = candidateDays.toReversed()

  for (const day of latestDayFirst) {
    const examsOnDay = examsByDay.get(formatDateInputValue(day)) ?? []
    const start = findPrintStartInDay(day, examsOnDay, requiredMinutes)
    if (start !== null) return start
  }

  return null
}

// TODO - Correctly type the status enum
export function getRegistrationStatus({
  isReserved,
  hasPrintSlot,
  isDeliveryTooSoon,
}: {
  isReserved: boolean
  hasPrintSlot: boolean
  isDeliveryTooSoon: boolean
}): string {
  if (isReserved) return "reserved"
  if (!hasPrintSlot) return "registered-error"
  if (isDeliveryTooSoon) return "registered-warning"
  return "registered"
}

/**
 * Finds the print date of a new exam and its registration status.
 * No slot found → 08:00 on the desired delivery date, status `registered-error`.
 */
export async function schedulePrint({
  desiredDeliveryDate,
  totalCopies,
  isReserved,
}: {
  desiredDeliveryDate: string // "YYYY-MM-DD"
  totalCopies: number
  isReserved: boolean
}): Promise<{ printDate: string; status: string }> {
  const today = new Date()
  const desiredDay = dayAtHour(new Date(desiredDeliveryDate), 0)
  const requiredMinutes = getPrintDurationMinutes(totalCopies)
  const candidateDays = getBusinessDaysBetween(today, desiredDay)

  // print_date is a wall-clock time stored as UTC: query with UTC midnights
  // and convert the results back to local time
  const blockingExams = (
    await getBlockingExamsBetweenDates(
      new Date(`${formatDateInputValue(today)}T00:00:00Z`),
      new Date(`${desiredDeliveryDate}T00:00:00Z`),
    )
  ).map((exam) => ({
    ...exam,
    print_date: fromDatabaseDateTime(exam.print_date),
  }))

  const printStart = findPrintingDate(
    candidateDays,
    blockingExams,
    requiredMinutes,
  )

  return {
    printDate: formatDateTimeForDatabase(
      printStart ?? dayAtHour(desiredDay, DAY_START_HOUR),
    ),
    status: getRegistrationStatus({
      isReserved,
      hasPrintSlot: printStart !== null,
      isDeliveryTooSoon: isDeliveryTooSoon(desiredDeliveryDate),
    }),
  }
}
