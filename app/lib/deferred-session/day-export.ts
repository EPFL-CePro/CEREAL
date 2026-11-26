import { formatDateOnlyValue } from "@/app/lib/dates/date-time"
import { toCsv } from "@/app/lib/files/csv"
import { type DeferredExamSlot } from "@/types/deferredSession"
import {
  type TrackedExam,
  type TrackedRegistration,
} from "@/types/deferredSessionTracking"

// The slots exported: the morning, the afternoon or both
export type DayExportSlots = DeferredExamSlot | "both"

type ExportedExam = Pick<TrackedExam, "exam_code" | "exam_name" | "slot"> & {
  registrations: Pick<
    TrackedRegistration,
    "sac_status" | "sciper" | "first_name" | "last_name"
  >[]
}

// One accepted student at one exam of the day
export type DayExportRow = {
  sciper: number
  first_name: string
  last_name: string
  exam_code: string
  exam_name: string // Name given to the exam in the session
  slot: DeferredExamSlot
}

const SLOT_ORDER = { morning: 0, afternoon: 1 }
const SLOT_LABELS = { morning: "AM", afternoon: "PM" }
const FILENAME_SLOTS = { morning: "AM", afternoon: "PM", both: "AM-PM" }

/* Accepted students of the exams of the day in the given slots: one row per
student and exam (a student with two exams, or an exam planned in the morning
and in the afternoon, gives two rows). Sorted by slot, exam code, then name. */
export function getDayExportRows(
  exams: ExportedExam[],
  slots: DayExportSlots,
): DayExportRow[] {
  return exams
    .filter((exam) => slots === "both" || exam.slot === slots)
    .flatMap((exam) =>
      exam.registrations
        .filter((registration) => registration.sac_status === "accepted")
        .map((registration) => ({
          sciper: registration.sciper,
          first_name: registration.first_name,
          last_name: registration.last_name,
          exam_code: exam.exam_code,
          exam_name: exam.exam_name,
          slot: exam.slot,
        })),
    )
    .sort(
      (a, b) =>
        SLOT_ORDER[a.slot] - SLOT_ORDER[b.slot] ||
        a.exam_code.localeCompare(b.exam_code) ||
        a.last_name.localeCompare(b.last_name) ||
        a.first_name.localeCompare(b.first_name),
    )
}

/* CSV file of the rows. PLACE is left empty: the admin fills it by hand. EMAIL
is empty when the student's email was not found. */
export function buildDayExportCsv(
  rows: DayExportRow[],
  emailsBySciper: Map<number, string>,
): string {
  return toCsv([
    [
      "PLACE",
      "EMAIL",
      "SCIPER",
      "FIRSTNAME",
      "LASTNAME",
      "COURSE_CODE",
      "COURSE_NAME",
      "AM/PM",
    ],
    ...rows.map((row) => [
      "",
      emailsBySciper.get(row.sciper) ?? "",
      row.sciper,
      row.first_name,
      row.last_name,
      row.exam_code,
      row.exam_name,
      SLOT_LABELS[row.slot],
    ]),
  ])
}

// e.g. "deferred_2026-07-06_AM.csv", "deferred_2026-07-06_AM-PM.csv"
export function getDayExportFilename(
  date: Date,
  slots: DayExportSlots,
): string {
  return `deferred_${formatDateOnlyValue(date)}_${FILENAME_SLOTS[slots]}.csv`
}
