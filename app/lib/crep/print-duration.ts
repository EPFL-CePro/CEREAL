import type { CrepExam } from "@/types/crepExam"

const examsPrintedPerHour = 100
// If this is set to `30`, that means that we round to upper 30min (1h15 → 1h30, 15min → 30min, ...)
const roungindMinutes = 30

export function getPrintingDurationInMinutes(nbExams: number): number {
  const durationInMinutes = (nbExams / examsPrintedPerHour) * 60

  return Math.ceil(durationInMinutes / roungindMinutes) * roungindMinutes
}

export interface Gap {
  between: [CrepExam, CrepExam] // before exam, end exam
  gapMinutes: number // gap between the two exams in minutes
}

export function getEndDateOfPrinting(exam: CrepExam): Date {
  return new Date(exam.print_date.getTime() + exam.print_duration * 60000)
}

export function computeGapsBetweenExams(exams: CrepExam[]): Gap[] {
  const sorted = [...exams].sort(
    (a, b) => a.print_date.getTime() - b.print_date.getTime(),
  )

  const gaps: Gap[] = []

  for (let i = 0; i < sorted.length - 1; i++) {
    const current = sorted[i]
    const next = sorted[i + 1]

    const currentEnd = getEndDateOfPrinting(current)

    const nextStart = next.print_date

    const gapMs = nextStart.getTime() - currentEnd.getTime()
    const gapMinutes = gapMs / (1000 * 60)

    gaps.push({
      between: [current, next],
      gapMinutes,
    })
  }

  return gaps
}
