import { type CrepExamPrintTiming } from "@/app/lib/crep-subscription/queries"
import {
  addMinutes,
  dayAtHour,
  formatDateInputValue,
} from "@/app/lib/dates/date-time"
import {
  computePrintGaps,
  getPrintEndDate,
} from "@/app/lib/crep/print-duration"

// Opening hours of the print center
const DAY_START_HOUR = 8
const DAY_END_HOUR = 18

// SCHEDULE
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
  isShortNotice,
}: {
  isReserved: boolean
  hasPrintSlot: boolean
  isShortNotice: boolean
}): string {
  if (isReserved) return "reserved"
  if (!hasPrintSlot) return "registered-error"
  if (isShortNotice) return "registered-warning"
  return "registered"
}
