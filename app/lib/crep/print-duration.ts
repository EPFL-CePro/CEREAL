import { type CrepExamPrintTiming } from "@/app/lib/crep-subscription/queries"

const EXAMS_PRINTED_PER_HOUR = 100
// Durations are rounded up to the next multiple of this value
// (e.g. with 30: 15min → 30min, 1h15 → 1h30)
const ROUNDING_STEP_MINUTES = 30

const MINUTES_PER_HOUR = 60
const MS_PER_MINUTE = 60_000

export function getPrintDurationMinutes(examCount: number): number {
  const durationMinutes =
    (examCount / EXAMS_PRINTED_PER_HOUR) * MINUTES_PER_HOUR

  return (
    Math.ceil(durationMinutes / ROUNDING_STEP_MINUTES) * ROUNDING_STEP_MINUTES
  )
}

export interface PrintGap {
  between: [CrepExamPrintTiming, CrepExamPrintTiming] // [earlier printing, later printing]
  minutes: number // time between the end of the earlier printing and the start of the later one
}

export function getPrintEndDate(exam: CrepExamPrintTiming): Date {
  return new Date(
    exam.print_date.getTime() + exam.print_duration * MS_PER_MINUTE,
  )
}

export function computePrintGaps(exams: CrepExamPrintTiming[]): PrintGap[] {
  const examsByPrintStart = [...exams].sort(
    (a, b) => a.print_date.getTime() - b.print_date.getTime(),
  )

  const gaps: PrintGap[] = []

  for (let i = 0; i < examsByPrintStart.length - 1; i++) {
    const currentExam = examsByPrintStart[i]
    const nextExam = examsByPrintStart[i + 1]

    const currentPrintEnd = getPrintEndDate(currentExam)
    const nextPrintStart = nextExam.print_date

    const gapMs = nextPrintStart.getTime() - currentPrintEnd.getTime()
    const gapMinutes = gapMs / MS_PER_MINUTE

    gaps.push({
      between: [currentExam, nextExam],
      minutes: gapMinutes,
    })
  }

  return gaps
}
