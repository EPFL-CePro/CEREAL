import { formatDateOnlyValue } from "@/app/lib/dates/date-time"
import { type TemplateContext } from "@/app/lib/mail/email-templates"
import { type MailAttachment } from "@/app/lib/mail/send-mail"
import { type DeferredExamSlot } from "@/types/deferredSession"
import { type TrackedRegistration } from "@/types/deferredSessionTracking"

export const NO_STUDENT_MESSAGE =
  "No student is registered to this deferred exam."

// Makes Excel read the file as UTF-8 (accented names)
const UTF8_BOM = "\uFEFF"

type StudentRegistration = Pick<
  TrackedRegistration,
  "sac_status" | "sciper" | "first_name" | "last_name"
>

// Only the accepted registrations are sent to the teachers, sorted by last name
function getAcceptedStudents(registrations: StudentRegistration[]) {
  return registrations
    .filter((registration) => registration.sac_status === "accepted")
    .sort(
      (a, b) =>
        a.last_name.localeCompare(b.last_name) ||
        a.first_name.localeCompare(b.first_name),
    )
}

// Quote a CSV field when it contains a separator, a quote or a line break (RFC 4180)
function escapeCsvField(value: string | number): string {
  const text = String(value)
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text
}

/* CSV file of the accepted students (SCIPER, FIRSTNAME, LASTNAME). Starts with
a UTF-8 BOM so that Excel shows the accented names correctly. */
export function buildStudentsCsv(registrations: StudentRegistration[]): string {
  const rows = [
    ["SCIPER", "FIRSTNAME", "LASTNAME"],
    ...getAcceptedStudents(registrations).map((student) => [
      student.sciper,
      student.first_name,
      student.last_name,
    ]),
  ]
  const lines = rows.map((row) => row.map(escapeCsvField).join(","))
  return `${UTF8_BOM}${lines.join("\r\n")}\r\n`
}

// Name of the attached file, e.g. "CS-101_2026-07-06_students.csv"
export function getStudentsCsvFilename(
  examCode: string,
  examDate: Date,
): string {
  const safeCode = examCode.replace(/[^A-Za-z0-9-]/g, "_")
  return `${safeCode}_${formatDateOnlyValue(examDate)}_students.csv`
}

/* The CSV file attached to the email, or null when no student is accepted: the
email body then only says that nobody is registered. */
export function buildStudentsAttachment(
  examCode: string,
  examDate: Date,
  registrations: StudentRegistration[],
): MailAttachment | null {
  if (getAcceptedStudents(registrations).length === 0) return null

  return {
    filename: getStudentsCsvFilename(examCode, examDate),
    content: buildStudentsCsv(registrations),
    contentType: "text/csv; charset=utf-8",
  }
}

// Sentence of the email body: the list itself is in the attached CSV file
export function formatStudentsSummary(
  registrations: StudentRegistration[],
): string {
  const count = getAcceptedStudents(registrations).length
  if (count === 0) return NO_STUDENT_MESSAGE

  const students = count === 1 ? "1 student is" : `${count} students are`
  return `${students} registered to this deferred exam: you will find the list in the attached CSV file.`
}

// Values of the placeholders of the "deferred_exam_teacher_list" email
export function buildTeacherEmailContext(email: {
  examCode: string
  examName: string
  examDate: Date
  slot: DeferredExamSlot
  teacherEmails: string[]
  registrations: StudentRegistration[]
}): TemplateContext {
  return {
    "teachers.email": email.teacherEmails.join(", "),
    examCode: email.examCode,
    examName: email.examName,
    examDate: formatDateOnlyValue(email.examDate),
    slot: email.slot,
    students: formatStudentsSummary(email.registrations),
  }
}
