"use server"

import { requirePermission } from "@/app/lib/auth/require-permission"
import { Permission } from "@/app/lib/auth/route-access"
import { getActiveDeferredSessionTracking } from "@/app/lib/database"
import {
  type DayExportSlots,
  buildDayExportCsv,
  getDayExportFilename,
  getDayExportRows,
} from "@/app/lib/deferred-session/day-export"
import { fetchMultiplePersonsBySciper } from "@/app/lib/epfl/epfl-api"

const EXPORT_SLOTS: DayExportSlots[] = ["morning", "afternoon", "both"]

export type DayExportFile = { filename: string; content: string }

// `file` is null when no student is accepted in the chosen slots
export type DayExportResult =
  | { success: true; file: DayExportFile | null; warning?: string }
  | { success: false; error: string }

// Email of each student found on api.epfl.ch (the others are left out)
async function fetchStudentEmails(
  scipers: number[],
): Promise<Map<number, string>> {
  const persons = await fetchMultiplePersonsBySciper(scipers.join(","))
  return new Map(
    persons
      .filter((person) => person.email)
      .map((person) => [Number(person.id), person.email]),
  )
}

/* CSV file of the accepted students of a day of the active deferred session,
for the morning, the afternoon or both. It can be exported at any time. A
student whose email is not found keeps an empty EMAIL cell: the export is never
blocked, a warning tells how many emails are missing. */
export async function exportDeferredSessionDay(
  dayId: number,
  slots: DayExportSlots,
): Promise<DayExportResult> {
  await requirePermission(Permission.ADMIN)

  if (!EXPORT_SLOTS.includes(slots)) {
    return { success: false, error: "Unknown slot." }
  }

  const tracking = await getActiveDeferredSessionTracking()
  const day = tracking?.days.find((d) => d.id === dayId)
  if (!day) {
    return {
      success: false,
      error: "This day is not part of the active deferred session.",
    }
  }

  const rows = getDayExportRows(day.exams, slots)
  if (rows.length === 0) return { success: true, file: null }

  const scipers = [...new Set(rows.map((row) => row.sciper))]
  let emails = new Map<number, string>()
  let warning: string | undefined
  try {
    emails = await fetchStudentEmails(scipers)
  } catch (err) {
    console.error(
      `[exportDeferredSessionDay] Students emails failed for day ${dayId}`,
      err,
    )
    warning =
      "The students' emails could not be fetched: the EMAIL column is empty."
  }

  const missing = scipers.filter((sciper) => !emails.has(sciper)).length
  if (!warning && missing > 0) {
    warning =
      missing === 1
        ? "No email found for 1 student: their EMAIL cell is empty."
        : `No email found for ${missing} students: their EMAIL cell is empty.`
  }

  return {
    success: true,
    file: {
      filename: getDayExportFilename(day.date, slots),
      content: buildDayExportCsv(rows, emails),
    },
    warning,
  }
}
